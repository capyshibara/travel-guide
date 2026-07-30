import { describe, expect, it } from 'vitest';
import {
  bookingProgress,
  countdownDays,
  dayCost,
  defaultDayId,
  effectiveBookingStatus,
  findConnections,
  findNowNext,
  matchesTravelerFilter,
  visibleIssues,
} from '../selectors';
import { convert } from '../money';
import type { ImportIssue, ItineraryDay, ItineraryItem, Traveler, Trip, TravelerScope } from '../types';
import { DEFAULT_OVERRIDES } from '../../state/persistence';

const A: Traveler = { id: 'a', name: 'Traveler A', initials: 'A', slot: 'a', generatedName: true };
const B: Traveler = { id: 'b', name: 'Traveler B', initials: 'B', slot: 'b', generatedName: true };

const shared = (): TravelerScope => ({ travelerIds: ['a', 'b'], kind: 'shared' });
const only = (id: string): TravelerScope => ({ travelerIds: [id], kind: 'individual' });
const none = (): TravelerScope => ({ travelerIds: [], kind: 'unassigned' });

let seq = 0;
function item(partial: Partial<ItineraryItem> & { start: number | null }): ItineraryItem {
  seq += 1;
  return {
    id: `item-${seq}`,
    sourceKey: `key-${seq}`,
    date: '2026-08-17',
    end: null,
    durationMinutes: null,
    durationDerived: false,
    crossesMidnight: false,
    type: 'other',
    typeLabel: 'Activity',
    activity: `Activity ${seq}`,
    practical: [],
    bookingRequired: false,
    scope: shared(),
    origin: { sheet: 'Itinerary', row: seq + 1 },
    ...partial,
  };
}

function day(date: string | null, items: ItineraryItem[], dayNumber = 1): ItineraryDay {
  return { id: date ?? 'unscheduled', date, dayNumber, items, cities: [], countries: [] };
}

function trip(partial: Partial<Trip> = {}): Trip {
  return {
    id: 'trip',
    title: 'Test trip',
    destinations: [],
    startDate: '2026-08-17',
    endDate: '2026-08-19',
    dayCount: 3,
    travelers: [A, B],
    exchangeRates: [],
    days: [],
    bookings: [],
    budget: [],
    sources: [],
    assumptions: [],
    totals: { perTraveler: {}, group: { base: null, fallback: null }, stated: [], currency: 'USD' },
    ...partial,
  };
}

describe('findNowNext', () => {
  it('finds the activity currently running', () => {
    const running = item({ start: 9 * 60, end: 12 * 60, activity: 'Gardens' });
    const later = item({ start: 15 * 60, end: 16 * 60, activity: 'Dinner' });
    const t = trip({ days: [day('2026-08-17', [running, later])] });

    const at = new Date(2026, 7, 17, 10, 30);
    const result = findNowNext(t, at);
    expect(result.now?.activity).toBe('Gardens');
    expect(result.next?.activity).toBe('Dinner');
  });

  it('keeps an overnight activity current after midnight, on the next calendar day', () => {
    const overnight = item({
      start: 23 * 60 + 40,
      end: 6 * 60 + 15,
      crossesMidnight: true,
      activity: 'Bromo sunrise trek',
      date: '2026-08-17',
    });
    const t = trip({ days: [day('2026-08-17', [overnight])] });

    // 02:00 on 18 August — the trek is still running.
    expect(findNowNext(t, new Date(2026, 7, 18, 2, 0)).now?.activity).toBe('Bromo sunrise trek');
    // 23:50 on 17 August — it has just started.
    expect(findNowNext(t, new Date(2026, 7, 17, 23, 50)).now?.activity).toBe('Bromo sunrise trek');
    // 08:00 on 18 August — it has finished.
    expect(findNowNext(t, new Date(2026, 7, 18, 8, 0)).now).toBeNull();
  });

  it('reports nothing running before the trip starts, but knows what is next', () => {
    const first = item({ start: 9 * 60, end: 10 * 60, date: '2026-08-17', activity: 'First thing' });
    const t = trip({ days: [day('2026-08-17', [first])] });

    const result = findNowNext(t, new Date(2026, 7, 1, 12, 0));
    expect(result.now).toBeNull();
    expect(result.next?.activity).toBe('First thing');
  });

  it('ignores activities with no start time', () => {
    const untimed = item({ start: null, activity: 'Whenever' });
    const t = trip({ days: [day('2026-08-17', [untimed])] });
    expect(findNowNext(t, new Date(2026, 7, 17, 10, 0)).now).toBeNull();
  });
});

describe('defaultDayId and countdown', () => {
  const t = trip({
    days: [day('2026-08-17', [], 1), day('2026-08-18', [], 2), day('2026-08-19', [], 3)],
  });

  it('opens on today while the trip is running', () => {
    expect(defaultDayId(t, new Date(2026, 7, 18, 9, 0))).toBe('2026-08-18');
  });

  it('opens on the first day before the trip starts', () => {
    expect(defaultDayId(t, new Date(2026, 7, 1))).toBe('2026-08-17');
  });

  it('opens on the first day once the trip is over', () => {
    expect(defaultDayId(t, new Date(2026, 8, 30))).toBe('2026-08-17');
  });

  it('counts down only before departure', () => {
    expect(countdownDays(t, new Date(2026, 7, 10))).toBe(7);
    expect(countdownDays(t, new Date(2026, 7, 18))).toBeNull();
  });
});

describe('findConnections', () => {
  it('flags a tight gap between two different kinds of activity', () => {
    const flight = item({ start: 9 * 60, end: 10 * 60, type: 'flight', activity: 'Flight in' });
    const train = item({ start: 10 * 60 + 15, end: 12 * 60, type: 'transport', activity: 'Train out' });
    const connections = findConnections(day('2026-08-17', [flight, train]), [A, B]);

    expect(connections).toHaveLength(1);
    expect(connections[0]?.itemId).toBe(train.id);
    expect(connections[0]?.kind).toBe('tight');
    expect(connections[0]?.message).toEqual({ id: 'onlyMinutesAfter', minutes: 15, title: 'Flight in' });
  });

  it('flags an overlap for the same traveler', () => {
    const first = item({ start: 9 * 60, end: 12 * 60, scope: only('a'), activity: 'Museum' });
    const second = item({ start: 11 * 60, end: 13 * 60, scope: only('a'), activity: 'Lunch' });
    const connections = findConnections(day('2026-08-17', [first, second]), [A, B]);

    expect(connections[0]?.kind).toBe('overlap');
  });

  it('does not flag two travelers doing different things at the same time', () => {
    const forA = item({ start: 9 * 60, end: 12 * 60, scope: only('a'), activity: 'A museum' });
    const forB = item({ start: 9 * 60, end: 12 * 60, scope: only('b'), activity: 'B market' });
    expect(findConnections(day('2026-08-17', [forA, forB]), [A, B])).toHaveLength(0);
  });

  it('does not flag an activity that follows an overnight one', () => {
    const overnight = item({ start: 23 * 60, end: 6 * 60, crossesMidnight: true, activity: 'Night bus' });
    const morning = item({ start: 7 * 60, end: 8 * 60, activity: 'Breakfast' });
    expect(findConnections(day('2026-08-17', [overnight, morning]), [A, B])).toHaveLength(0);
  });

  it('does not flag a comfortable gap', () => {
    const first = item({ start: 9 * 60, end: 10 * 60, type: 'flight', activity: 'Flight' });
    const second = item({ start: 13 * 60, end: 14 * 60, type: 'food', activity: 'Lunch' });
    expect(findConnections(day('2026-08-17', [first, second]), [A, B])).toHaveLength(0);
  });
});

describe('matchesTravelerFilter', () => {
  it('shows everything under "all"', () => {
    expect(matchesTravelerFilter(only('a'), 'all')).toBe(true);
    expect(matchesTravelerFilter(none(), 'all')).toBe(true);
  });

  it('shows a traveler their own and shared items', () => {
    expect(matchesTravelerFilter(only('a'), 'a')).toBe(true);
    expect(matchesTravelerFilter(only('b'), 'a')).toBe(false);
    expect(matchesTravelerFilter(shared(), 'a')).toBe(true);
  });

  it('shows unassigned items under every traveler, since we cannot rule them out', () => {
    expect(matchesTravelerFilter(none(), 'a')).toBe(true);
    expect(matchesTravelerFilter(none(), 'b')).toBe(true);
  });

  it('isolates shared items under the shared filter', () => {
    expect(matchesTravelerFilter(shared(), 'shared')).toBe(true);
    expect(matchesTravelerFilter(only('a'), 'shared')).toBe(false);
  });
});

describe('bookingProgress', () => {
  const base = {
    sourceKey: 'k',
    item: 'Thing',
    scope: shared(),
    origin: { sheet: 'Booking Options', row: 2 },
  };

  it('counts booked and confirmed as done, and ignores no-action items', () => {
    const t = trip({
      bookings: [
        { ...base, id: '1', urgency: 'now', importedStatus: 'confirmed' },
        { ...base, id: '2', urgency: '1-3', importedStatus: 'booked' },
        { ...base, id: '3', urgency: '7-14', importedStatus: 'not-started' },
        { ...base, id: '4', urgency: 'none', importedStatus: 'not-started' },
      ],
    });
    expect(bookingProgress(t, DEFAULT_OVERRIDES)).toMatchObject({ done: 2, total: 3, label: '2 / 3' });
  });

  it("lets the traveler's own status override the workbook's", () => {
    const booking = { ...base, id: '1', urgency: 'now' as const, importedStatus: 'not-started' as const };
    const overrides = { ...DEFAULT_OVERRIDES, bookingStatus: { '1': 'confirmed' as const } };
    expect(effectiveBookingStatus(booking, overrides)).toBe('confirmed');
    expect(bookingProgress(trip({ bookings: [booking] }), overrides).done).toBe(1);
  });
});

describe('dayCost', () => {
  it('sums a day in the trip currency, converting where a rate exists', () => {
    const usd = item({ start: 9 * 60, baseCost: { amount: 20, currency: 'USD' } });
    const idr = item({ start: 10 * 60, baseCost: { amount: 155000, currency: 'IDR' } });
    const t = trip({
      exchangeRates: [{ from: 'USD', to: 'IDR', rate: 15500 }],
      totals: { perTraveler: {}, group: { base: null, fallback: null }, stated: [], currency: 'USD' },
    });
    expect(dayCost(day('2026-08-17', [usd, idr]), 'base', t)).toEqual({ amount: 30, currency: 'USD' });
  });

  it('falls back to the base cost when a fallback is missing', () => {
    const priced = item({ start: 9 * 60, baseCost: { amount: 20, currency: 'USD' } });
    const t = trip();
    expect(dayCost(day('2026-08-17', [priced]), 'fallback', t)).toEqual({ amount: 20, currency: 'USD' });
  });
});

describe('convert', () => {
  const rates = [{ from: 'USD', to: 'IDR', rate: 15500 }];

  it('converts in both directions from a single declared rate', () => {
    expect(convert({ amount: 1, currency: 'USD' }, 'IDR', rates)).toEqual({ amount: 15500, currency: 'IDR' });
    expect(convert({ amount: 15500, currency: 'IDR' }, 'USD', rates)).toEqual({ amount: 1, currency: 'USD' });
  });

  it('refuses to invent a rate it was not given', () => {
    expect(convert({ amount: 10, currency: 'SGD' }, 'USD', rates)).toBeNull();
  });

  it('returns null when there is nothing to convert', () => {
    expect(convert({ amount: 10, currency: 'USD' }, 'USD', rates)).toBeNull();
  });
});

describe('visibleIssues', () => {
  it('hides issues the traveler has reviewed', () => {
    const issues: ImportIssue[] = [
      {
        id: 'x',
        kind: 'broken-url',
        severity: 'info',
        message: { id: 'brokenUrlSource', value: 'x', sheet: 'Sources', row: 2 },
      },
      {
        id: 'y',
        kind: 'missing-traveler',
        severity: 'warning',
        message: { id: 'missingTraveler', title: 'Ferry', sheet: 'Itinerary', row: 3 },
      },
    ];
    const overrides = { ...DEFAULT_OVERRIDES, dismissedIssues: ['x'] };
    expect(visibleIssues(issues, overrides).map((i) => i.id)).toEqual(['y']);
  });
});
