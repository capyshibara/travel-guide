/**
 * Overview sheet -> trip-level facts.
 *
 * Overview sheets are almost always label/value pairs rather than a table, so this
 * mapper walks rows looking for a label in the leftmost populated cell and reads the
 * rest of the row as its value(s).
 */
import type { Assumption, ExchangeRate, IsoDate, Money, RowOrigin } from '../../domain/types';
import type { OverviewField } from '../aliases';
import { OVERVIEW_ALIASES } from '../aliases';
import { readDate, readMoney, readText } from '../cellValues';
import { parseCurrencyCode, parseMoney, parseTextDate } from '../coerce';
import type { Cell, Grid } from '../grid';
import { isRowBlank } from '../grid';
import type { IssueCollector } from '../issues';
import { cleanText, matchAlias, normalizeKey } from '../normalize';
import type { TravelerRegistry } from '../travelers';
import { splitTravelerTokens } from '../travelers';
import { stableId } from '../../lib/id';

export interface OverviewFacts {
  title?: string;
  destinations: string[];
  startDate?: IsoDate;
  endDate?: IsoDate;
  dayCount?: number;
  travelerCount?: number;
  baseCurrency?: string;
  displayCurrency?: string;
  exchangeRates: ExchangeRate[];
  assumptions: Assumption[];
  baseBudget?: Money;
  fallbackBudget?: Money;
  perTravelerTotal?: Money;
  groupTotal?: Money;
  /** Recognized label/value pairs we did not model, kept for the import summary. */
  extras: { label: string; value: string }[];
}

/** "1 USD = 15,500 IDR" / "1 USD : 15500 IDR" / "USD/IDR 15500". */
const FX_RE = /(\d[\d.,]*)?\s*([A-Za-z]{2,4}|\$|€|£|¥|₫)\s*(?:=|:|to|->|→|\/)\s*([\d.,]+)\s*([A-Za-z]{2,4}|\$|€|£|¥|₫)/g;

export function parseExchangeRates(text: string): ExchangeRate[] {
  const rates: ExchangeRate[] = [];
  const cleaned = cleanText(text);
  FX_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FX_RE.exec(cleaned)) !== null) {
    const from = parseCurrencyCode(match[2]);
    const to = parseCurrencyCode(match[4]);
    const amount = parseMoney(match[3]);
    const unit = match[1] ? parseMoney(match[1])?.amount : 1;
    if (!from || !to || !amount || !unit || unit === 0) continue;
    if (from === to) continue;
    rates.push({ from, to, rate: amount.amount / unit, note: cleaned });
  }
  return rates;
}

export function mapOverviewSheet(
  grid: Grid,
  registry: TravelerRegistry,
  issues: IssueCollector,
): OverviewFacts {
  const facts: OverviewFacts = { destinations: [], exchangeRates: [], assumptions: [], extras: [] };
  /** Values seen for "Traveler A departure city" style labels. */
  const declaredTravelers: { name: string; city?: string; generated?: boolean }[] = [];

  for (let r = 0; r < grid.rows.length; r += 1) {
    const row = grid.rows[r];
    if (!row || isRowBlank(row)) continue;

    const firstIndex = row.findIndex((c) => c.value !== null && c.text !== '');
    if (firstIndex === -1) continue;
    const labelCell = row[firstIndex]!;
    const label = readText(labelCell);
    const valueCells = row.slice(firstIndex + 1).filter((c) => c.value !== null && c.text !== '');
    const excelRow = grid.firstRowNumber + r;
    const origin: RowOrigin = { sheet: grid.name, row: excelRow };

    // A row with a label but no value carries nothing; a row with no label is prose.
    if (valueCells.length === 0) continue;

    const valueText = valueCells.map((c) => readText(c)).join(' · ');
    const firstValue = valueCells[0]!;

    // Traveler-specific rows: "Traveler A departure city", "Alice — departs from".
    const travelerLabel = /^(?:traveler|traveller)\s*([a-z0-9]+)/i.exec(label);
    if (travelerLabel && /depart|from|origin|city|airport/i.test(label)) {
      declaredTravelers.push({ name: `Traveler ${travelerLabel[1]!.toUpperCase()}`, city: valueText, generated: true });
      continue;
    }

    const field = matchAlias(label, OVERVIEW_ALIASES);
    if (field === null) {
      // Unlabelled prose in an overview sheet is usually a note worth surfacing.
      if (label.length > 24 && valueCells.length === 0) {
        facts.assumptions.push(makeAssumption(grid.name, excelRow, 'note', label));
      } else {
        facts.extras.push({ label, value: valueText });
      }
      continue;
    }

    applyField(field, { facts, declaredTravelers, label, valueText, firstValue, grid, origin, issues });
  }

  // Seed the traveler roster before any itinerary row is read.
  for (const declared of declaredTravelers) {
    registry.declare(declared.name, declared.city, declared.generated ?? false);
  }
  if (facts.travelerCount !== undefined) {
    registry.ensureCount(facts.travelerCount);
    if (registry.list().length < facts.travelerCount) {
      issues.add({
        kind: 'missing-field',
        message: { id: 'fewerTravelers', stated: facts.travelerCount, found: registry.list().length },
      });
    }
  }

  return facts;
}

interface ApplyContext {
  facts: OverviewFacts;
  declaredTravelers: { name: string; city?: string; generated?: boolean }[];
  label: string;
  valueText: string;
  firstValue: Cell;
  grid: Grid;
  origin: RowOrigin;
  issues: IssueCollector;
}

function applyField(field: OverviewField, ctx: ApplyContext): void {
  const { facts, valueText, firstValue, grid, origin, issues } = ctx;

  switch (field) {
    case 'title':
      facts.title = valueText;
      return;

    case 'destinations':
      facts.destinations = splitList(valueText);
      return;

    case 'startDate':
    case 'endDate': {
      const outcome = readDate(firstValue, grid.date1904);
      if (outcome.ok) {
        if (field === 'startDate') facts.startDate = outcome.value;
        else facts.endDate = outcome.value;
      } else {
        issues.add({
          kind: 'invalid-date',
          message: {
            id: 'invalidTripDate',
            which: field === 'startDate' ? 'start' : 'end',
            value: valueText,
            sheet: grid.name,
            row: origin.row,
          },
          origin,
        });
      }
      return;
    }

    case 'dates': {
      const range = parseDateRange(valueText);
      if (range) {
        facts.startDate ??= range.start;
        facts.endDate ??= range.end;
      } else {
        facts.extras.push({ label: ctx.label, value: valueText });
      }
      return;
    }

    case 'duration': {
      const days = /(\d+)/.exec(valueText);
      if (days) facts.dayCount = Number(days[1]);
      return;
    }

    case 'travelerCount': {
      const count = /(\d+)/.exec(valueText);
      if (count) {
        facts.travelerCount = Number(count[1]);
      } else {
        // "Travelers: Alice, Bob" — a roster, not a count.
        for (const name of splitTravelerTokens(valueText)) {
          ctx.declaredTravelers.push({ name });
        }
      }
      return;
    }

    case 'travelers':
      for (const name of splitTravelerTokens(valueText)) {
        ctx.declaredTravelers.push({ name });
      }
      return;

    case 'departureCities': {
      const cities = splitList(valueText);
      cities.forEach((city, index) => {
        const existing = ctx.declaredTravelers[index];
        if (existing) existing.city ??= city;
        else ctx.declaredTravelers.push({ name: `Traveler ${String.fromCharCode(65 + index)}`, city, generated: true });
      });
      return;
    }

    case 'exchangeRate': {
      const rates = parseExchangeRates(valueText);
      if (rates.length > 0) {
        facts.exchangeRates.push(...rates);
        facts.assumptions.push(makeAssumption(grid.name, origin.row, 'exchangeRate', valueText));
      } else {
        issues.add({
          kind: 'invalid-currency',
          message: { id: 'invalidExchangeRate', value: valueText, sheet: grid.name, row: origin.row },
          origin,
        });
        facts.assumptions.push(makeAssumption(grid.name, origin.row, 'exchangeRate', valueText));
      }
      return;
    }

    case 'baseCurrency': {
      const code = parseCurrencyCode(valueText);
      if (code) facts.baseCurrency = code;
      return;
    }

    case 'displayCurrency': {
      const code = parseCurrencyCode(valueText);
      if (code) facts.displayCurrency = code;
      return;
    }

    case 'baseBudget':
    case 'fallbackBudget':
    case 'perTravelerTotal':
    case 'groupTotal': {
      const outcome = readMoney(firstValue, facts.baseCurrency);
      if (!outcome.ok) {
        issues.add({
          kind: 'invalid-number',
          message: { id: 'invalidBudgetFigure', value: valueText, sheet: grid.name, row: origin.row },
          origin,
        });
        return;
      }
      if (field === 'baseBudget') facts.baseBudget = outcome.value;
      else if (field === 'fallbackBudget') facts.fallbackBudget = outcome.value;
      else if (field === 'perTravelerTotal') facts.perTravelerTotal = outcome.value;
      else facts.groupTotal = outcome.value;
      return;
    }

    case 'assumption':
      facts.assumptions.push(makeAssumption(grid.name, origin.row, 'assumption', valueText));
      return;

    case 'warning':
      facts.assumptions.push(makeAssumption(grid.name, origin.row, 'recheck', valueText, 'recheck'));
      return;
  }
}

function makeAssumption(
  sheet: string,
  row: number,
  labelKey: Assumption['labelKey'],
  detail: string,
  kind: Assumption['kind'] = 'assumption',
): Assumption {
  return { id: stableId('assume', [sheet, row, detail]), labelKey, detail, kind };
}

/** Split "Vietnam, Singapore, Indonesia" or "Hanoi → Singapore → Java". */
export function splitList(text: string): string[] {
  const cleaned = cleanText(text);
  if (!cleaned) return [];
  return cleaned
    .split(/\s*(?:→|->|=>|,|;|·|\||\/|\bthen\b)\s*/i)
    .map((part) => cleanText(part))
    .filter(Boolean);
}

/** "Jul 3 – 15, 2026" / "2026-07-03 to 2026-07-15" / "3/7/2026 - 15/7/2026". */
export function parseDateRange(text: string): { start: IsoDate; end: IsoDate } | null {
  const cleaned = cleanText(text);
  const parts = cleaned.split(/\s*(?:–|—|-{1,2}|\bto\b|\buntil\b|→)\s*/i).filter(Boolean);
  if (parts.length < 2) return null;

  const last = parts[parts.length - 1]!;
  const end = parseTextDate(last);
  if (!end) return null;

  // The left side often omits the year ("Jul 3 – 15, 2026"); borrow it from the right.
  const year = end.slice(0, 4);
  const first = parts[0]!;
  const start = parseTextDate(first) ?? parseTextDate(`${first} ${year}`) ?? parseTextDate(`${first}, ${year}`);
  if (!start) return null;
  return start <= end ? { start, end } : null;
}

/** Currency code implied by an overview sheet, used as a default for cost columns. */
export function inferBaseCurrency(facts: OverviewFacts): string | undefined {
  if (facts.baseCurrency) return facts.baseCurrency;
  if (facts.baseBudget?.currency) return facts.baseBudget.currency;
  const first = facts.exchangeRates[0];
  return first ? first.from : undefined;
}

export function overviewLabelIsKnown(label: string): boolean {
  return matchAlias(label, OVERVIEW_ALIASES) !== null || normalizeKey(label).length === 0;
}
