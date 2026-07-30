/**
 * File -> ImportResult.
 *
 * The orchestration layer: read the workbook, decide what each sheet is, run the
 * matching mapper, then derive everything the UI needs (days, budget, totals, source
 * links) from the mapped records. Anything unreadable becomes an ImportIssue and the
 * import continues — a workbook missing its Sources sheet still produces a usable trip.
 */
import type {
  ActivityType,
  BudgetEntry,
  DerivedCategory,
  ExchangeRate,
  ImportResult,
  ItineraryDay,
  ItineraryItem,
  Money,
  SheetDetection,
  Source,
  Trip,
  TripTotals,
} from '../domain/types';
import { IssueCollector, WorkbookReadError } from './issues';
import { readGrid, isRowBlank } from './grid';
import { countOverviewLabels, decideRole, looksLikeKeyValueSheet, roleFromHeaders } from './roles';
import { findHeaderRow, headerRowValues } from './grid';
import { mapItinerarySheet } from './mappers/itinerary';
import { mapBookingSheet } from './mappers/bookings';
import { mapSourceSheet } from './mappers/sources';
import { mapBudgetSheet } from './mappers/budget';
import { inferBaseCurrency, mapOverviewSheet, type OverviewFacts } from './mappers/overview';
import { TravelerRegistry } from './travelers';
import { read, type WorkBook } from './sheetjs';
import { normalizeKey } from './normalize';
import { stableId } from '../lib/id';
import { convert } from '../domain/money';

const MAX_BYTES = 20 * 1024 * 1024;

const CATEGORY_BY_TYPE: Record<ActivityType, DerivedCategory> = {
  flight: 'flights',
  transport: 'localTransport',
  food: 'food',
  hotel: 'lodging',
  sleep: 'lodging',
  sightseeing: 'tours',
  tour: 'tours',
  prep: 'preparation',
  arrival: 'localTransport',
  rest: 'other',
  other: 'other',
};

export async function importWorkbook(file: File): Promise<ImportResult> {
  if (file.size > MAX_BYTES) {
    throw new WorkbookReadError('tooLarge');
  }
  if (file.size === 0) {
    throw new WorkbookReadError('empty');
  }
  if (!/\.(xlsx|xlsm)$/i.test(file.name)) {
    throw new WorkbookReadError('wrongFormat', file.name);
  }

  const buffer = await file.arrayBuffer();
  let workbook: WorkBook;
  try {
    workbook = read(buffer, {
      type: 'array',
      // Keep raw values so we control date and number conversion ourselves.
      cellDates: false,
      cellNF: true,
      cellText: true,
      cellFormula: true,
      // Cell styles are not needed and parsing them is the slowest part of a large read.
      cellStyles: false,
      dense: false,
    });
  } catch {
    // The underlying SheetJS error is deliberately not surfaced or logged: it can
    // contain fragments of the workbook's contents.
    throw new WorkbookReadError('unreadable');
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new WorkbookReadError('noSheets');
  }

  return buildTrip(workbook, { name: file.name, size: file.size });
}

export function buildTrip(workbook: WorkBook, file: { name: string; size: number }): ImportResult {
  const issues = new IssueCollector();
  const registry = new TravelerRegistry();
  const detections: SheetDetection[] = [];

  // --- pass 1: classify every sheet -----------------------------------------
  const classified = workbook.SheetNames.map((name) => {
    const grid = readGrid(workbook, name);
    if (!grid || grid.rows.length === 0 || grid.rows.every(isRowBlank)) {
      detections.push({ name, role: 'unknown', confidence: 'high', rowCount: 0, mappedColumns: [], unmappedColumns: [] });
      issues.add({ kind: 'empty-sheet', message: { id: 'emptySheet', sheet: name } });
      return null;
    }

    const headerRow = findHeaderRow(grid, 2);
    const headers = headerRow === null ? [] : headerRowValues(grid, headerRow);
    const keyValueShaped = looksLikeKeyValueSheet(grid.rows);
    const guess = decideRole(name, headers, keyValueShaped, countOverviewLabels(grid.rows));
    return { grid, headers, guess, headerRow };
  }).filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  // --- pass 2: overview first, so travelers and currency are known ----------
  const overviewSheets = classified.filter((c) => c.guess.role === 'overview');
  let facts: OverviewFacts = { destinations: [], exchangeRates: [], assumptions: [], extras: [] };
  for (const sheet of overviewSheets) {
    const parsed = mapOverviewSheet(sheet.grid, registry, issues);
    facts = mergeFacts(facts, parsed);
    detections.push({
      name: sheet.grid.name,
      role: 'overview',
      confidence: sheet.guess.confidence,
      rowCount: sheet.grid.rows.filter((r) => !isRowBlank(r)).length,
      mappedColumns: [],
      unmappedColumns: [],
    });
  }

  const baseCurrency = inferBaseCurrency(facts);
  const defaults = baseCurrency === undefined ? {} : { currency: baseCurrency };

  // --- pass 3: everything else ---------------------------------------------
  const itineraryItems: ItineraryItem[] = [];
  const bookings: ImportResult['trip']['bookings'] = [];
  const sources: Source[] = [];
  const budgetFromSheet: BudgetEntry[] = [];
  let sawItinerary = false;

  for (const sheet of classified) {
    if (sheet.guess.role === 'overview') continue;
    const rowCount = Math.max(0, sheet.grid.rows.filter((r) => !isRowBlank(r)).length - 1);

    switch (sheet.guess.role) {
      case 'itinerary': {
        sawItinerary = true;
        const result = mapItinerarySheet(sheet.grid, registry, issues, defaults);
        itineraryItems.push(...result.items);
        detections.push({
          name: sheet.grid.name,
          role: 'itinerary',
          confidence: sheet.guess.confidence,
          rowCount: result.items.length,
          mappedColumns: result.mapped,
          unmappedColumns: result.unmapped,
        });
        reportUnmapped(issues, sheet.grid.name, result.unmapped);
        break;
      }
      case 'bookings': {
        const result = mapBookingSheet(sheet.grid, registry, issues, defaults);
        bookings.push(...result.items);
        detections.push({
          name: sheet.grid.name,
          role: 'bookings',
          confidence: sheet.guess.confidence,
          rowCount: result.items.length,
          mappedColumns: result.mapped,
          unmappedColumns: result.unmapped,
        });
        reportUnmapped(issues, sheet.grid.name, result.unmapped);
        break;
      }
      case 'sources': {
        const result = mapSourceSheet(sheet.grid, issues);
        sources.push(...result.items);
        detections.push({
          name: sheet.grid.name,
          role: 'sources',
          confidence: sheet.guess.confidence,
          rowCount: result.items.length,
          mappedColumns: result.mapped,
          unmappedColumns: result.unmapped,
        });
        reportUnmapped(issues, sheet.grid.name, result.unmapped);
        break;
      }
      case 'budget': {
        const result = mapBudgetSheet(sheet.grid, registry, issues, defaults);
        budgetFromSheet.push(...result.entries);
        detections.push({
          name: sheet.grid.name,
          role: 'budget',
          confidence: sheet.guess.confidence,
          rowCount: result.entries.length,
          mappedColumns: result.mapped,
          unmappedColumns: result.unmapped,
        });
        reportUnmapped(issues, sheet.grid.name, result.unmapped);
        break;
      }
      default: {
        detections.push({
          name: sheet.grid.name,
          role: 'unknown',
          confidence: sheet.guess.confidence,
          rowCount,
          mappedColumns: [],
          unmappedColumns: sheet.headers.filter(Boolean),
        });
        issues.add({
          kind: 'unmapped-sheet',
          message: { id: 'unmappedSheet', sheet: sheet.grid.name, guess: describeGuess(sheet.headers) },
        });
      }
    }
  }

  if (!sawItinerary) {
    issues.add({ kind: 'missing-field', message: { id: 'noItinerarySheet' }, severity: 'critical' });
  }

  // Travelers discovered late (from the last itinerary rows) still belong to every
  // "shared" item read earlier, so shared scopes are re-expanded now the roster is final.
  if (registry.list().length === 0) registry.ensureCount(1);
  const travelers = registry.list();
  for (const item of itineraryItems) item.scope = registry.expandShared(item.scope);
  for (const booking of bookings) booking.scope = registry.expandShared(booking.scope);

  linkSourcesToItems(sources, itineraryItems, bookings);
  linkBookingsToItinerary(bookings, itineraryItems);

  const days = groupIntoDays(itineraryItems);
  const budget = budgetFromSheet.length > 0 ? budgetFromSheet : deriveBudget(itineraryItems);

  const totalsCurrency = pickTotalsCurrency(budget, facts.displayCurrency, baseCurrency);
  const { totals, unconvertible } = computeTotals({
    facts,
    budget,
    travelerIds: travelers.map((t) => t.id),
    target: totalsCurrency,
    rates: facts.exchangeRates,
  });

  if (unconvertible.length > 0) {
    issues.add({
      kind: 'invalid-currency',
      message: {
        id: 'unconvertibleCosts',
        count: unconvertible.length,
        currencies: uniqueValues(unconvertible.map((e) => e.base?.currency ?? e.fallback?.currency)).join(', '),
        target: totalsCurrency,
        labels: unconvertible.map((e) => e.label).slice(0, 6).join(', '),
      },
    });
  }

  const startDate = facts.startDate ?? days.find((d) => d.date)?.date ?? null;
  const endDate = facts.endDate ?? [...days].reverse().find((d) => d.date)?.date ?? null;

  const trip: Trip = {
    id: stableId('trip', [file.name, facts.title ?? '', startDate ?? '']),
    // Falls back to the file name, which is the author's own words either way.
    title: facts.title ?? deriveTitle(file.name),
    destinations: facts.destinations.length > 0 ? facts.destinations : deriveDestinations(days),
    startDate,
    endDate,
    dayCount: facts.dayCount ?? countDays(startDate, endDate, days),
    travelers,
    exchangeRates: facts.exchangeRates,
    days,
    bookings,
    budget,
    sources,
    assumptions: facts.assumptions,
    totals,
  };
  if (baseCurrency) trip.baseCurrency = baseCurrency;
  if (totalsCurrency) trip.displayCurrency = totalsCurrency;

  applyConversions(trip);

  return {
    trip,
    sheets: detections,
    issues: issues.list(),
    file,
    importedAt: new Date().toISOString(),
    partial: !sawItinerary || issues.list().some((i) => i.severity === 'critical'),
  };
}

function reportUnmapped(issues: IssueCollector, sheet: string, unmapped: readonly string[]): void {
  if (unmapped.length === 0) return;
  issues.add({
    kind: 'unrecognized-column',
    message: { id: 'unmappedColumns', count: unmapped.length, sheet, columns: unmapped.join(', ') },
  });
}

function describeGuess(headers: readonly string[]): string {
  const guess = roleFromHeaders(headers);
  return guess.role === 'unknown' ? 'none' : guess.role;
}

function mergeFacts(a: OverviewFacts, b: OverviewFacts): OverviewFacts {
  return {
    ...a,
    ...Object.fromEntries(Object.entries(b).filter(([, v]) => v !== undefined && !Array.isArray(v))),
    destinations: b.destinations.length > 0 ? b.destinations : a.destinations,
    exchangeRates: [...a.exchangeRates, ...b.exchangeRates],
    assumptions: [...a.assumptions, ...b.assumptions],
    extras: [...a.extras, ...b.extras],
  };
}

function deriveTitle(fileName: string): string {
  const stem = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
  const cleaned = stem.replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Your trip';
}

function deriveDestinations(days: readonly ItineraryDay[]): string[] {
  const seen: string[] = [];
  for (const day of days) {
    for (const city of day.cities) {
      if (!seen.some((s) => normalizeKey(s) === normalizeKey(city))) seen.push(city);
    }
  }
  return seen;
}

/**
 * Group items into days.
 *
 * Items with no readable date collect into a single trailing "unscheduled" day so they
 * stay visible instead of disappearing.
 */
export function groupIntoDays(items: readonly ItineraryItem[]): ItineraryDay[] {
  const byDate = new Map<string, ItineraryItem[]>();
  for (const item of items) {
    const key = item.date ?? 'unscheduled';
    const bucket = byDate.get(key);
    if (bucket) bucket.push(item);
    else byDate.set(key, [item]);
  }

  const dated = [...byDate.entries()].filter(([key]) => key !== 'unscheduled').sort(([a], [b]) => a.localeCompare(b));
  const unscheduled = byDate.get('unscheduled');

  const days: ItineraryDay[] = dated.map(([date, dayItems], index) => ({
    id: date,
    date,
    dayNumber: index + 1,
    items: sortItems(dayItems),
    cities: uniqueValues(dayItems.map((i) => i.city)),
    countries: uniqueValues(dayItems.map((i) => i.country)),
  }));

  if (unscheduled && unscheduled.length > 0) {
    days.push({
      id: 'unscheduled',
      date: null,
      dayNumber: days.length + 1,
      items: sortItems(unscheduled),
      cities: uniqueValues(unscheduled.map((i) => i.city)),
      countries: uniqueValues(unscheduled.map((i) => i.country)),
    });
  }
  return days;
}

/** Chronological, with untimed items last so they do not interrupt the timeline. */
function sortItems(items: readonly ItineraryItem[]): ItineraryItem[] {
  return [...items].sort((a, b) => {
    if (a.start === null && b.start === null) return 0;
    if (a.start === null) return 1;
    if (b.start === null) return -1;
    return a.start - b.start;
  });
}

function uniqueValues(values: readonly (string | undefined)[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (!out.some((v) => normalizeKey(v) === normalizeKey(value))) out.push(value);
  }
  return out;
}

function countDays(start: string | null, end: string | null, days: readonly ItineraryDay[]): number {
  if (start && end) {
    const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
    if (Number.isFinite(ms) && ms >= 0) return Math.round(ms / 86400000) + 1;
  }
  return days.filter((d) => d.date !== null).length;
}

/** Turn priced itinerary rows into budget entries when there is no budget sheet. */
export function deriveBudget(items: readonly ItineraryItem[]): BudgetEntry[] {
  return items
    .filter((item) => item.baseCost || item.fallbackCost)
    .map((item) => {
      const entry: BudgetEntry = {
        id: stableId('budget', [item.id]),
        label: item.activity,
        categoryKey: CATEGORY_BY_TYPE[item.type],
        scope: item.scope,
        itineraryItemId: item.id,
        isFlight: item.type === 'flight',
        origin: item.origin,
      };
      if (item.baseCost) entry.base = item.baseCost;
      if (item.fallbackCost) entry.fallback = item.fallbackCost;
      return entry;
    });
}

/**
 * Totals.
 *
 * A figure the Overview sheet stated wins over one we could sum, and `stated` records
 * which happened so the Budget page can say so rather than implying we did the maths.
 *
 * Amounts in other currencies are converted with the workbook's own declared rates.
 * Anything we cannot convert is left out of the total and reported, so a total is
 * never quietly short by the rows we could not add up.
 */
export interface TotalsInput {
  facts: OverviewFacts;
  budget: readonly BudgetEntry[];
  travelerIds: readonly string[];
  target: string;
  rates: readonly ExchangeRate[];
}

export function computeTotals(input: TotalsInput): { totals: TripTotals; unconvertible: BudgetEntry[] } {
  const { facts, budget, travelerIds, target, rates } = input;
  const unconvertible = new Set<BudgetEntry>();

  const amountIn = (entry: BudgetEntry, key: 'base' | 'fallback'): number | null => {
    const money = entry[key];
    if (!money) return null;
    if (!money.currency || money.currency === target) return money.amount;
    const converted = convert(money, target, rates);
    if (converted) return converted.amount;
    unconvertible.add(entry);
    return null;
  };

  const perTraveler: TripTotals['perTraveler'] = {};
  for (const id of travelerIds) {
    perTraveler[id] = {
      base: sumScoped(budget, id, 'base', target, amountIn),
      fallback: sumScoped(budget, id, 'fallback', target, amountIn),
    };
  }

  const group = {
    base: sumAll(budget, 'base', target, amountIn),
    fallback: sumAll(budget, 'fallback', target, amountIn),
  };

  // Stated figures keep the label the workbook gave them. Pairing "Base budget" with
  // "Fallback budget" is safe (they are the same figure under two scenarios); pairing
  // either with "Group total" would not be, so those stay separate rows.
  const stated: TripTotals['stated'] = [];
  if (facts.baseBudget || facts.fallbackBudget) {
    stated.push({ label: 'Budget', base: facts.baseBudget ?? null, fallback: facts.fallbackBudget ?? null });
  }
  if (facts.perTravelerTotal) {
    stated.push({ label: 'Per traveler', base: facts.perTravelerTotal, fallback: null });
  }
  if (facts.groupTotal) {
    stated.push({ label: 'Group total', base: facts.groupTotal, fallback: null });
  }

  return { totals: { perTraveler, group, stated, currency: target }, unconvertible: [...unconvertible] };
}

type AmountReader = (entry: BudgetEntry, key: 'base' | 'fallback') => number | null;

/**
 * A traveler's share: their own costs in full, plus an equal split of anything marked
 * shared. Entries with no traveler assignment are left out of per-traveler totals —
 * guessing whose they are would be inventing data.
 */
function sumScoped(
  budget: readonly BudgetEntry[],
  travelerId: string,
  key: 'base' | 'fallback',
  currency: string,
  amountIn: AmountReader,
): Money | null {
  let total = 0;
  let found = false;
  for (const entry of budget) {
    if (!entry.scope.travelerIds.includes(travelerId)) continue;
    const amount = amountIn(entry, key);
    if (amount === null) continue;
    const divisor = entry.scope.kind === 'shared' ? Math.max(entry.scope.travelerIds.length, 1) : 1;
    total += amount / divisor;
    found = true;
  }
  return found ? { amount: total, currency } : null;
}

function sumAll(
  budget: readonly BudgetEntry[],
  key: 'base' | 'fallback',
  currency: string,
  amountIn: AmountReader,
): Money | null {
  let total = 0;
  let found = false;
  for (const entry of budget) {
    const amount = amountIn(entry, key);
    if (amount === null) continue;
    total += amount;
    found = true;
  }
  return found ? { amount: total, currency } : null;
}

/**
 * The currency totals and converted amounts are expressed in.
 *
 * The workbook's declared base currency wins. An exchange-rate line like
 * "1 USD = 15,500 IDR" names USD as the reference and IDR as the converted side, so
 * taking the right-hand currency here would total the trip in the wrong one.
 */
export function pickTotalsCurrency(
  budget: readonly BudgetEntry[],
  displayCurrency: string | undefined,
  baseCurrency: string | undefined,
): string {
  if (baseCurrency) return baseCurrency;
  if (displayCurrency) return displayCurrency;
  const counts = new Map<string, number>();
  for (const entry of budget) {
    const currency = entry.base?.currency ?? entry.fallback?.currency;
    if (!currency) continue;
    counts.set(currency, (counts.get(currency) ?? 0) + 1);
  }
  let best = '';
  let bestCount = 0;
  for (const [currency, count] of counts) {
    if (count > bestCount) {
      best = currency;
      bestCount = count;
    }
  }
  return best;
}

/** Fill in converted amounts on itinerary items using the declared exchange rates. */
function applyConversions(trip: Trip): void {
  const target = trip.displayCurrency;
  if (!target || trip.exchangeRates.length === 0) return;

  for (const day of trip.days) {
    for (const item of day.items) {
      if (!item.convertedBase && item.baseCost) {
        const converted = convert(item.baseCost, target, trip.exchangeRates);
        if (converted) item.convertedBase = converted;
      }
      if (!item.convertedFallback && item.fallbackCost) {
        const converted = convert(item.fallbackCost, target, trip.exchangeRates);
        if (converted) item.convertedFallback = converted;
      }
    }
  }
}


/**
 * Attach sources to the itinerary and booking items they talk about.
 *
 * Matching is conservative — an exact URL match, or a topic that appears as a whole
 * phrase in the item's title. A loose word-overlap score would link almost everything
 * to almost everything and make the Sources page useless.
 */
function linkSourcesToItems(
  sources: readonly Source[],
  items: readonly ItineraryItem[],
  bookings: readonly ImportResult['trip']['bookings'][number][],
): void {
  for (const source of sources) {
    const topicKey = normalizeKey(source.topic);
    for (const item of items) {
      const matchesUrl = source.url !== undefined && item.sourceUrl === source.url;
      const matchesTopic = topicKey.length >= 5 && normalizeKey(item.activity).includes(topicKey);
      if (matchesUrl || matchesTopic) source.relatedItemIds.push(item.id);
    }
    for (const booking of bookings) {
      const matchesUrl = source.url !== undefined && booking.url === source.url;
      const matchesTopic = topicKey.length >= 5 && normalizeKey(booking.item).includes(topicKey);
      if (matchesUrl || matchesTopic) source.relatedItemIds.push(booking.id);
    }
  }
}

/** Cross-reference booking items with the itinerary rows that need them. */
function linkBookingsToItinerary(
  bookings: readonly ImportResult['trip']['bookings'][number][],
  items: readonly ItineraryItem[],
): void {
  for (const booking of bookings) {
    const key = normalizeKey(booking.item);
    if (key.length < 5) continue;
    for (const item of items) {
      if (item.bookingItemId) continue;
      const itemKey = normalizeKey(item.activity);
      if (itemKey.includes(key) || key.includes(itemKey)) {
        item.bookingItemId = booking.id;
      }
    }
  }
}
