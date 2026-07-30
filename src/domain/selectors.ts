/**
 * Derived views over the trip.
 *
 * Everything here is computed from `Trip` plus the traveler's overrides. Nothing is
 * stored twice: booking progress, day subtotals and "what's on now" are all functions
 * of state, not extra state.
 */
import type {
  BookingItem,
  BookingStatus,
  BookingUrgency,
  BudgetEntry,
  CostScenario,
  ImportIssue,
  IsoDate,
  ItineraryDay,
  ItineraryItem,
  Money,
  Traveler,
  DerivedCategory,
  Trip,
  TravelerScope,
} from './types';
import type { UserOverrides } from '../state/persistence';
import { convert } from './money';
import { daysBetween, todayIso } from '../lib/format';
import { MINUTES_PER_DAY } from '../import/coerce';

/** Urgency bands in the order the checklist shows them. Headings come from the catalogue. */
export const URGENCY_GROUPS: readonly { key: BookingUrgency; tone: 'danger' | 'default' }[] = [
  { key: 'now', tone: 'danger' },
  { key: '7-14', tone: 'default' },
  { key: '1-3', tone: 'default' },
  { key: 'arrival', tone: 'default' },
  { key: 'site', tone: 'default' },
  { key: 'none', tone: 'default' },
];

/** The traveler's own status if they set one, otherwise what the workbook said. */
export function effectiveBookingStatus(booking: BookingItem, overrides: UserOverrides): BookingStatus {
  return overrides.bookingStatus[booking.id] ?? booking.importedStatus;
}

const DONE_STATUSES: ReadonlySet<BookingStatus> = new Set<BookingStatus>(['booked', 'confirmed']);

export interface BookingProgress {
  done: number;
  total: number;
  label: string;
}

export function bookingProgress(trip: Trip, overrides: UserOverrides): BookingProgress {
  // "No action required" items are not something to complete, so they are excluded.
  const actionable = trip.bookings.filter((booking) => booking.urgency !== 'none');
  const done = actionable.filter((booking) => DONE_STATUSES.has(effectiveBookingStatus(booking, overrides))).length;
  return { done, total: actionable.length, label: `${done} / ${actionable.length}` };
}

/** Sum of an item list in one currency, converting where a rate allows. */
export function sumMoney(
  amounts: readonly (Money | undefined)[],
  target: string,
  rates: Trip['exchangeRates'],
): Money | null {
  let total = 0;
  let found = false;
  for (const money of amounts) {
    if (!money) continue;
    if (!money.currency || money.currency === target) {
      total += money.amount;
      found = true;
      continue;
    }
    const converted = convert(money, target, rates);
    if (converted) {
      total += converted.amount;
      found = true;
    }
  }
  return found ? { amount: total, currency: target } : null;
}

export function dayCost(day: ItineraryDay, scenario: CostScenario, trip: Trip): Money | null {
  const currency = trip.totals.currency || trip.baseCurrency || '';
  if (!currency) return null;
  return sumMoney(
    day.items.map((item) => (scenario === 'base' ? item.baseCost : (item.fallbackCost ?? item.baseCost))),
    currency,
    trip.exchangeRates,
  );
}

/** Does this item belong to the given traveler filter? */
export function matchesTravelerFilter(scope: TravelerScope, filter: string): boolean {
  if (filter === 'all') return true;
  if (filter === 'shared') return scope.kind === 'shared';
  if (filter === 'unassigned') return scope.kind === 'unassigned';
  // An unassigned item is shown under every traveler: we do not know it is *not* theirs.
  if (scope.kind === 'unassigned') return true;
  return scope.travelerIds.includes(filter);
}

export interface NowNext {
  now: ItineraryItem | null;
  next: ItineraryItem | null;
  /** The day the current or next activity belongs to. */
  day: ItineraryDay | null;
}

/**
 * What is happening now, and what is next.
 *
 * Overnight activities are handled: an item that started at 23:40 yesterday and ends
 * at 06:15 is still "now" at 02:00 today.
 */
export function findNowNext(trip: Trip, at: Date = new Date()): NowNext {
  const today = todayIso(at);
  const minutes = at.getHours() * 60 + at.getMinutes();

  let now: { item: ItineraryItem; day: ItineraryDay } | null = null;
  let next: { item: ItineraryItem; day: ItineraryDay } | null = null;

  for (const day of trip.days) {
    if (!day.date) continue;
    for (const item of day.items) {
      if (item.start === null) continue;

      const endExclusive = item.end === null ? item.start + 60 : item.crossesMidnight ? item.end + MINUTES_PER_DAY : item.end;

      if (day.date === today) {
        if (minutes >= item.start && minutes < endExclusive) {
          if (!now) now = { item, day };
        } else if (minutes < item.start && !next) {
          next = { item, day };
        }
      } else if (day.date < today && item.crossesMidnight) {
        // Yesterday's overnight activity can still be running.
        const offset = daysBetween(day.date, today);
        if (offset === 1 && item.end !== null && minutes < item.end && !now) now = { item, day };
      } else if (day.date > today && !next) {
        next = { item, day };
      }
    }
  }

  return {
    now: now?.item ?? null,
    next: next?.item ?? null,
    day: now?.day ?? next?.day ?? null,
  };
}

/** The day to open the itinerary on: today if the trip is running, else the first day. */
export function defaultDayId(trip: Trip, at: Date = new Date()): string | null {
  if (trip.days.length === 0) return null;
  const today = todayIso(at);
  const exact = trip.days.find((day) => day.date === today);
  if (exact) return exact.id;
  const upcoming = trip.days.find((day) => day.date !== null && day.date >= today);
  return (upcoming ?? trip.days[0])?.id ?? null;
}

/** Days until departure. Null once the trip has started or if there is no start date. */
export function countdownDays(trip: Trip, at: Date = new Date()): number | null {
  if (!trip.startDate) return null;
  const days = daysBetween(todayIso(at), trip.startDate);
  return days !== null && days > 0 ? days : null;
}

/** How far through today we are, 0–100, for the day progress bar. */
export function dayProgressPercent(day: ItineraryDay, at: Date = new Date()): number | undefined {
  if (day.date !== todayIso(at)) return undefined;
  const minutes = at.getHours() * 60 + at.getMinutes();
  const starts = day.items.map((item) => item.start).filter((start): start is number => start !== null);
  if (starts.length === 0) return undefined;
  const first = Math.min(...starts);
  const last = Math.max(...starts);
  if (last <= first) return minutes >= first ? 100 : 0;
  return Math.min(100, Math.max(0, ((minutes - first) / (last - first)) * 100));
}

/** What to say about a tight or clashing connection. Worded by the page, in its language. */
export type ConnectionMessage =
  | { id: 'overlaps'; title: string }
  | { id: 'startsImmediatelyAfter'; title: string }
  | { id: 'onlyMinutesAfter'; minutes: number; title: string };

export interface Connection {
  itemId: string;
  /** Minutes of slack before this item starts. */
  gapMinutes: number;
  kind: 'tight' | 'overlap';
  message: ConnectionMessage;
}

const TIGHT_CONNECTION_MINUTES = 30;

/**
 * Tight connections and overlaps within a day, per traveler.
 *
 * Two travelers doing different things at the same time is normal and not flagged;
 * one traveler double-booked, or given ten minutes between a landing and a train, is.
 */
export function findConnections(day: ItineraryDay, travelers: readonly Traveler[]): Connection[] {
  const connections: Connection[] = [];

  const groups: { key: string; items: ItineraryItem[] }[] = travelers.map((traveler) => ({
    key: traveler.id,
    items: day.items.filter(
      (item) => item.scope.travelerIds.includes(traveler.id) || item.scope.kind === 'unassigned',
    ),
  }));
  if (travelers.length === 0) groups.push({ key: 'all', items: [...day.items] });

  for (const group of groups) {
    const timed = group.items
      .filter((item) => item.start !== null)
      .sort((a, b) => (a.start ?? 0) - (b.start ?? 0));

    for (let i = 1; i < timed.length; i += 1) {
      const previous = timed[i - 1]!;
      const current = timed[i]!;
      if (previous.end === null || current.start === null) continue;
      // An overnight item ends the next day; it cannot clash with a later item today.
      if (previous.crossesMidnight) continue;

      const gap = current.start - previous.end;
      if (gap < 0) {
        connections.push({
          itemId: current.id,
          gapMinutes: gap,
          kind: 'overlap',
          message: { id: 'overlaps', title: previous.activity },
        });
      } else if (gap <= TIGHT_CONNECTION_MINUTES && previous.type !== current.type) {
        connections.push({
          itemId: current.id,
          gapMinutes: gap,
          kind: 'tight',
          message:
            gap === 0
              ? { id: 'startsImmediatelyAfter', title: previous.activity }
              : { id: 'onlyMinutesAfter', minutes: gap, title: previous.activity },
        });
      }
    }
  }

  // One warning per item, worst case first.
  const byItem = new Map<string, Connection>();
  for (const connection of connections) {
    const existing = byItem.get(connection.itemId);
    if (!existing || connection.gapMinutes < existing.gapMinutes) byItem.set(connection.itemId, connection);
  }
  return [...byItem.values()];
}

export function visibleIssues(issues: readonly ImportIssue[], overrides: UserOverrides): ImportIssue[] {
  return issues.filter((issue) => !overrides.dismissedIssues.includes(issue.id));
}

/** Issue count that should drive an attention badge — dismissed ones do not. */
export function actionableIssueCount(issues: readonly ImportIssue[], overrides: UserOverrides): number {
  return visibleIssues(issues, overrides).filter((issue) => issue.severity !== 'info').length;
}

/** Dates that carry at least one data issue, for the date-tab warning dots. */
export function daysWithIssues(trip: Trip, issues: readonly ImportIssue[]): Set<string> {
  const itemToDay = new Map<string, string>();
  for (const day of trip.days) {
    for (const item of day.items) itemToDay.set(item.id, day.id);
  }
  const flagged = new Set<string>();
  for (const issue of issues) {
    if (issue.relatedItemId) {
      const dayId = itemToDay.get(issue.relatedItemId);
      if (dayId) flagged.add(dayId);
    }
  }
  return flagged;
}

export interface BudgetCategoryTotal {
  /** The workbook's own category wording, kept verbatim. Null when we inferred the bucket. */
  label: string | null;
  /** Our own bucket, translated by the page. Only used when `label` is null. */
  categoryKey: DerivedCategory | null;
  value: number;
  display: string;
}

export interface BudgetView {
  categories: BudgetCategoryTotal[];
  flights: Money | null;
  shared: Money | null;
  individual: { traveler: Traveler; entries: BudgetEntry[]; total: Money | null }[];
  currency: string;
}

/** Everything the Budget page needs for one scenario, in one pass. */
export function buildBudgetView(trip: Trip, scenario: CostScenario): BudgetView {
  const currency = trip.totals.currency || trip.baseCurrency || '';
  const amountOf = (entry: BudgetEntry): Money | undefined =>
    scenario === 'base' ? entry.base : (entry.fallback ?? entry.base);

  // Grouped on the workbook's own wording where it gave one, so a Vietnamese workbook
  // keeps its Vietnamese category names; rows without one fall back to our derived
  // bucket, which the page translates. The `#` prefix cannot collide with a real cell.
  const byCategory = new Map<string, { label: string | null; categoryKey: DerivedCategory | null; amounts: Money[] }>();
  for (const entry of trip.budget) {
    const money = amountOf(entry);
    if (!money) continue;
    const key = entry.category ?? `#${entry.categoryKey ?? 'other'}`;
    const bucket = byCategory.get(key);
    if (bucket) bucket.amounts.push(money);
    else
      byCategory.set(key, {
        label: entry.category ?? null,
        categoryKey: entry.category ? null : (entry.categoryKey ?? 'other'),
        amounts: [money],
      });
  }

  const categories = [...byCategory.values()]
    .map((bucket) => {
      const total = sumMoney(bucket.amounts, currency, trip.exchangeRates);
      return { label: bucket.label, categoryKey: bucket.categoryKey, value: total?.amount ?? 0, money: total };
    })
    .filter((category) => category.money !== null)
    .sort((a, b) => b.value - a.value);

  const flightEntries = trip.budget.filter((entry) => entry.isFlight);
  const sharedEntries = trip.budget.filter((entry) => !entry.isFlight && entry.scope.kind === 'shared');

  const individual = trip.travelers.map((traveler) => {
    const entries = trip.budget.filter(
      (entry) => entry.scope.kind === 'individual' && entry.scope.travelerIds.includes(traveler.id),
    );
    return {
      traveler,
      entries,
      total: sumMoney(entries.map(amountOf), currency, trip.exchangeRates),
    };
  });

  return {
    // `display` is filled by the page, which owns money formatting.
    categories: categories.map((category) => ({
      label: category.label,
      categoryKey: category.categoryKey,
      value: category.value,
      display: '',
    })),
    flights: sumMoney(flightEntries.map(amountOf), currency, trip.exchangeRates),
    shared: sumMoney(sharedEntries.map(amountOf), currency, trip.exchangeRates),
    individual,
    currency,
  };
}

/** Flat, ordered list of every activity — used for prev/next navigation on the detail page. */
export function flatItems(trip: Trip): ItineraryItem[] {
  return trip.days.flatMap((day) => day.items);
}

export function findItem(trip: Trip, id: string): { item: ItineraryItem; day: ItineraryDay } | null {
  for (const day of trip.days) {
    const item = day.items.find((candidate) => candidate.id === id);
    if (item) return { item, day };
  }
  return null;
}

export function findDay(trip: Trip, id: string): ItineraryDay | null {
  return trip.days.find((day) => day.id === id) ?? null;
}

/** Trip dates as a label, falling back sensibly when the workbook gave none. */
export function tripDateBounds(trip: Trip): { start: IsoDate | null; end: IsoDate | null } {
  return { start: trip.startDate, end: trip.endDate };
}
