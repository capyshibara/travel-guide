import { describe, expect, it } from 'vitest';
import { buildTrip } from '../buildTrip';
import { en } from '../../i18n/en';
import { renderIssue } from '../../i18n/renderIssue';
import type { ImportIssue, ImportResult, ItineraryItem } from '../../domain/types';
import {
  ITINERARY_HEADER,
  OVERVIEW_ROWS,
  dateCell,
  formulaCell,
  linkCell,
  makeWorkbook,
  timeCell,
  type CellInput,
} from './fixtures';

const FILE = { name: 'trip.xlsx', size: 1024 };

/** Issues carry codes, not prose; these tests assert on the English rendering of them. */
function issueText(issue: ImportIssue): string {
  const { title, detail } = renderIssue(en, issue.message);
  return `${title} ${detail}`;
}

function importSheets(sheets: Record<string, CellInput[][]>, merges?: Record<string, string[]>): ImportResult {
  return buildTrip(makeWorkbook(sheets, merges), FILE);
}

/** Every itinerary item across every day, in day order. */
function allItems(result: ImportResult): ItineraryItem[] {
  return result.trip.days.flatMap((day) => day.items);
}

function itemNamed(result: ImportResult, name: string): ItineraryItem {
  const found = allItems(result).find((item) => item.activity === name);
  if (!found) throw new Error(`No item named "${name}". Got: ${allItems(result).map((i) => i.activity).join(', ')}`);
  return found;
}

/** `[date, start, end, duration, country, city, type, route, activity, booking, ccy, base, fallback, url, notes, traveler]` */
function row(overrides: Partial<Record<number, CellInput>>): CellInput[] {
  const base: CellInput[] = [
    dateCell(2026, 7, 6), timeCell(9, 0), timeCell(10, 0), '', 'Indonesia', 'Surabaya', 'Tour',
    'A → B', 'An activity', '', 'USD', 10, 12, '', '', 'Shared',
  ];
  for (const [index, value] of Object.entries(overrides)) base[Number(index)] = value as CellInput;
  return base;
}

describe('sheet role detection', () => {
  it('recognizes sheets by name', () => {
    const result = importSheets({
      Overview: OVERVIEW_ROWS,
      Itinerary: [ITINERARY_HEADER, row({})],
      'Booking Options': [['Item', 'Target price', 'Booking timing', 'Status'], ['Jeep tour', 250, 'Book 3 days before', 'Researching']],
      Sources: [['Topic', 'Supported fact', 'URL'], ['Fees', 'Entry is Rp 220,000.', 'https://example.com/']],
    });
    const roles = Object.fromEntries(result.sheets.map((s) => [s.name, s.role]));
    expect(roles).toEqual({
      Overview: 'overview',
      Itinerary: 'itinerary',
      'Booking Options': 'bookings',
      Sources: 'sources',
    });
  });

  it('recognizes a sources sheet named "Sheet4" from its columns alone', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({})],
      Sheet4: [
        ['Topic', 'Supported fact or assumption', 'URL', 'Notes'],
        ['Bromo fee', 'Entry is Rp 220,000 on weekdays.', 'https://example.com/', 'Checked 2026'],
      ],
    });
    const sheet4 = result.sheets.find((s) => s.name === 'Sheet4');
    expect(sheet4?.role).toBe('sources');
    expect(result.trip.sources).toHaveLength(1);
  });

  it('reports a sheet it cannot place instead of dropping it silently', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({})],
      Scratch: [['aaa', 'bbb'], ['1', '2']],
    });
    expect(result.issues.some((i) => i.kind === 'unmapped-sheet' && issueText(i).includes('Scratch'))).toBe(true);
  });

  it('flags a workbook with no itinerary as a partial import', () => {
    const result = importSheets({ Overview: OVERVIEW_ROWS });
    expect(result.partial).toBe(true);
    expect(result.issues.some((i) => i.severity === 'critical')).toBe(true);
    // The overview still came through.
    expect(result.trip.title).toBe('Java 2026');
  });
});

describe('itinerary dates and times', () => {
  it('reads Excel date serials as the calendar date the author typed', () => {
    const result = importSheets({ Itinerary: [ITINERARY_HEADER, row({ 0: dateCell(2026, 7, 3) })] });
    expect(result.trip.days[0]?.date).toBe('2026-07-03');
  });

  it('reads a date written as text', () => {
    const result = importSheets({ Itinerary: [ITINERARY_HEADER, row({ 0: '3 July 2026' })] });
    expect(result.trip.days[0]?.date).toBe('2026-07-03');
  });

  it('carries the previous date forward through blank date cells', () => {
    const result = importSheets({
      Itinerary: [
        ITINERARY_HEADER,
        row({ 0: dateCell(2026, 7, 6), 8: 'First' }),
        row({ 0: null, 8: 'Second' }),
        row({ 0: null, 8: 'Third' }),
      ],
    });
    expect(result.trip.days).toHaveLength(1);
    expect(result.trip.days[0]?.items.map((i) => i.activity)).toEqual(['First', 'Second', 'Third']);
  });

  it('expands a merged date cell across the rows it spans', () => {
    const result = importSheets(
      {
        Itinerary: [
          ITINERARY_HEADER,
          row({ 0: dateCell(2026, 7, 6), 8: 'First' }),
          row({ 0: null, 8: 'Second' }),
        ],
      },
      { Itinerary: ['A2:A3'] },
    );
    expect(allItems(result).every((i) => i.date === '2026-07-06')).toBe(true);
  });

  it('records an issue for an unreadable date but keeps the activity', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({ 0: dateCell(2026, 7, 6) }), row({ 0: 'next Tuesday', 8: 'Vague' })],
    });
    expect(result.issues.some((i) => i.kind === 'invalid-date')).toBe(true);
    expect(itemNamed(result, 'Vague')).toBeDefined();
  });

  it('groups undated activities into a trailing unscheduled day rather than dropping them', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({ 0: null, 8: 'Someday' })],
    });
    const last = result.trip.days.at(-1);
    expect(last?.id).toBe('unscheduled');
    expect(last?.items[0]?.activity).toBe('Someday');
  });

  it('orders a day chronologically and puts untimed items last', () => {
    const result = importSheets({
      Itinerary: [
        ITINERARY_HEADER,
        row({ 1: timeCell(15, 0), 8: 'Afternoon' }),
        row({ 1: null, 2: null, 8: 'Whenever' }),
        row({ 1: timeCell(7, 30), 8: 'Morning' }),
      ],
    });
    expect(result.trip.days[0]?.items.map((i) => i.activity)).toEqual(['Morning', 'Afternoon', 'Whenever']);
  });
});

describe('overnight activities', () => {
  it('treats an end time before the start as crossing midnight, not as an error', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({ 1: timeCell(23, 40), 2: timeCell(6, 15), 8: 'Bromo sunrise trek' })],
    });
    const item = itemNamed(result, 'Bromo sunrise trek');
    expect(item.crossesMidnight).toBe(true);
    expect(item.start).toBe(23 * 60 + 40);
    expect(item.end).toBe(6 * 60 + 15);
    // 23:40 -> 06:15 is 6h 35m.
    expect(item.durationMinutes).toBe(395);
    expect(item.durationDerived).toBe(true);
    expect(result.issues.some((i) => i.kind === 'time-conflict')).toBe(false);
  });

  it('keeps a stated duration and flags it when it contradicts the times', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({ 1: timeCell(1, 0), 2: timeCell(8, 0), 3: '2h', 8: 'Ijen hike' })],
    });
    const item = itemNamed(result, 'Ijen hike');
    expect(item.durationMinutes).toBe(120);
    expect(item.durationDerived).toBe(false);
    expect(result.issues.some((i) => i.kind === 'time-conflict')).toBe(false);
  });

  it('flags an overnight row whose stated duration disagrees with its times', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({ 1: timeCell(23, 0), 2: timeCell(6, 0), 3: '30m', 8: 'Night bus' })],
    });
    expect(result.issues.some((i) => i.kind === 'time-conflict')).toBe(true);
    expect(itemNamed(result, 'Night bus').durationMinutes).toBe(30);
  });

  it('derives an end time that runs past midnight from start plus duration', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({ 1: timeCell(23, 0), 2: null, 3: '3h', 8: 'Late transfer' })],
    });
    const item = itemNamed(result, 'Late transfer');
    expect(item.end).toBe(120);
    expect(item.crossesMidnight).toBe(true);
  });
});

describe('traveler assignment', () => {
  it('assigns single-letter tokens to the travelers declared in the overview', () => {
    const result = importSheets({
      Overview: OVERVIEW_ROWS,
      Itinerary: [
        ITINERARY_HEADER,
        row({ 8: 'A flight', 15: 'A' }),
        row({ 8: 'B flight', 15: 'B' }),
      ],
    });
    const [a, b] = result.trip.travelers;
    expect(a?.departureCity).toBe('Hanoi (HAN)');
    expect(b?.departureCity).toBe('Ho Chi Minh City (SGN)');
    expect(itemNamed(result, 'A flight').scope).toEqual({ travelerIds: [a!.id], kind: 'individual' });
    expect(itemNamed(result, 'B flight').scope).toEqual({ travelerIds: [b!.id], kind: 'individual' });
  });

  it.each(['Shared', 'Both', 'All', 'A & B', 'A + B', 'A, B'])('treats "%s" as shared', (text) => {
    const result = importSheets({
      Overview: OVERVIEW_ROWS,
      Itinerary: [ITINERARY_HEADER, row({ 8: 'Together', 15: text })],
    });
    const item = itemNamed(result, 'Together');
    expect(item.scope.kind).toBe('shared');
    expect(item.scope.travelerIds).toHaveLength(2);
  });

  it('learns travelers from names when the overview does not declare them', () => {
    const result = importSheets({
      Itinerary: [
        ITINERARY_HEADER,
        row({ 8: 'Alice flight', 15: 'Alice' }),
        row({ 8: 'Bob flight', 15: 'Bob' }),
        row({ 8: 'Dinner', 15: 'Alice & Bob' }),
      ],
    });
    expect(result.trip.travelers.map((t) => t.name)).toEqual(['Alice', 'Bob']);
    expect(result.trip.travelers.map((t) => t.slot)).toEqual(['a', 'b']);
    expect(itemNamed(result, 'Dinner').scope.kind).toBe('shared');
  });

  it('expands a shared row read before the whole roster was known', () => {
    const result = importSheets({
      Itinerary: [
        ITINERARY_HEADER,
        // "Shared" appears before Bob has ever been seen.
        row({ 8: 'Early shared', 15: 'Shared' }),
        row({ 8: 'Alice only', 15: 'Alice' }),
        row({ 8: 'Bob only', 15: 'Bob' }),
      ],
    });
    expect(itemNamed(result, 'Early shared').scope.travelerIds).toHaveLength(2);
  });

  it('leaves a blank assignment unassigned and reports it', () => {
    const result = importSheets({
      Overview: OVERVIEW_ROWS,
      Itinerary: [ITINERARY_HEADER, row({ 8: 'Laundry', 15: '' })],
    });
    expect(itemNamed(result, 'Laundry').scope.kind).toBe('unassigned');
    expect(result.issues.some((i) => i.kind === 'missing-traveler')).toBe(true);
  });

  it('does not invent a traveler from a placeholder', () => {
    const result = importSheets({
      Overview: OVERVIEW_ROWS,
      Itinerary: [ITINERARY_HEADER, row({ 8: 'Unknown', 15: 'TBD' })],
    });
    expect(result.trip.travelers).toHaveLength(2);
    expect(itemNamed(result, 'Unknown').scope.kind).toBe('unassigned');
  });
});

describe('costs and currency', () => {
  it('keeps base and fallback costs separately, in their stated currency', () => {
    const result = importSheets({
      Overview: OVERVIEW_ROWS,
      Itinerary: [ITINERARY_HEADER, row({ 8: 'Jeep', 10: 'IDR', 11: 250000, 12: 320000 })],
    });
    const item = itemNamed(result, 'Jeep');
    expect(item.baseCost).toEqual({ amount: 250000, currency: 'IDR' });
    expect(item.fallbackCost).toEqual({ amount: 320000, currency: 'IDR' });
  });

  it('converts to the declared base currency using the workbook rate', () => {
    const result = importSheets({
      Overview: OVERVIEW_ROWS,
      Itinerary: [ITINERARY_HEADER, row({ 8: 'Jeep', 10: 'IDR', 11: 250000, 12: 320000 })],
    });
    const item = itemNamed(result, 'Jeep');
    // 1 USD = 15,500 IDR
    expect(item.convertedBase?.currency).toBe('USD');
    expect(item.convertedBase?.amount).toBeCloseTo(250000 / 15500, 4);
  });

  it('reads a currency written into the amount', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({ 8: 'Jeep', 10: '', 11: 'Rp 250,000', 12: 'Rp 320,000' })],
    });
    expect(itemNamed(result, 'Jeep').baseCost).toEqual({ amount: 250000, currency: 'IDR' });
  });

  it('uses a formula cell\'s cached result', () => {
    const result = importSheets({
      Overview: OVERVIEW_ROWS,
      Itinerary: [ITINERARY_HEADER, row({ 8: 'Computed', 11: formulaCell('=B2*2', 84) })],
    });
    expect(itemNamed(result, 'Computed').baseCost?.amount).toBe(84);
  });

  it('splits shared costs and charges individual costs in full', () => {
    const result = importSheets({
      Overview: OVERVIEW_ROWS,
      Itinerary: [
        ITINERARY_HEADER,
        row({ 8: 'Shared jeep', 10: 'USD', 11: 100, 12: 100, 15: 'Shared' }),
        row({ 8: 'A flight', 10: 'USD', 11: 40, 12: 40, 15: 'A' }),
      ],
    });
    const [a, b] = result.trip.travelers;
    // A: half of 100 + 40 = 90. B: half of 100 = 50.
    expect(result.trip.totals.perTraveler[a!.id]?.base?.amount).toBeCloseTo(90, 5);
    expect(result.trip.totals.perTraveler[b!.id]?.base?.amount).toBeCloseTo(50, 5);
    expect(result.trip.totals.group.base?.amount).toBeCloseTo(140, 5);
  });

  it('leaves an unconvertible amount out of the totals and says so', () => {
    const result = importSheets({
      Overview: OVERVIEW_ROWS,
      Itinerary: [
        ITINERARY_HEADER,
        row({ 8: 'US thing', 10: 'USD', 11: 100, 12: 100, 15: 'Shared' }),
        row({ 8: 'SG thing', 10: 'SGD', 11: 50, 12: 50, 15: 'Shared' }),
      ],
    });
    expect(result.trip.totals.group.base?.amount).toBeCloseTo(100, 5);
    expect(result.issues.some((i) => i.kind === 'invalid-currency' && issueText(i).includes('SGD'))).toBe(true);
  });

  it('keeps stated overview figures under their own labels rather than as our sums', () => {
    const result = importSheets({
      Overview: [...OVERVIEW_ROWS, ['Base budget', 1840], ['Fallback budget', 2260], ['Group total', 3680]],
      Itinerary: [ITINERARY_HEADER, row({ 8: 'Cheap thing', 10: 'USD', 11: 10, 12: 12, 15: 'Shared' })],
    });
    expect(result.trip.totals.stated).toEqual([
      { label: 'Budget', base: { amount: 1840, currency: 'USD' }, fallback: { amount: 2260, currency: 'USD' } },
      { label: 'Group total', base: { amount: 3680, currency: 'USD' }, fallback: null },
    ]);
    // Our own sum is unaffected by the stated figures.
    expect(result.trip.totals.group.base?.amount).toBe(10);
  });

  it('records an issue for an unreadable cost instead of counting it as zero', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({ 8: 'Mystery', 11: 'ask Bob', 12: null })],
    });
    expect(itemNamed(result, 'Mystery').baseCost).toBeUndefined();
    expect(result.issues.some((i) => i.kind === 'invalid-number')).toBe(true);
  });
});

describe('urls', () => {
  it('keeps a valid source URL', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({ 8: 'Trek', 13: 'https://example.com/bromo' })],
    });
    expect(itemNamed(result, 'Trek').sourceUrl).toBe('https://example.com/bromo');
  });

  it('prefers a cell hyperlink over its display text', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({ 8: 'Trek', 13: linkCell('Traveloka', 'https://traveloka.com/deal') })],
    });
    expect(itemNamed(result, 'Trek').sourceUrl).toBe('https://traveloka.com/deal');
  });

  it('drops a malformed link and reports it', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({ 8: 'Trek', 13: 'https//example.com/bromo' })],
    });
    expect(itemNamed(result, 'Trek').sourceUrl).toBeUndefined();
    expect(result.issues.some((i) => i.kind === 'broken-url')).toBe(true);
  });

  it('never keeps a javascript: URL', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({ 8: 'Trek', 13: 'javascript:alert(1)' })],
    });
    expect(itemNamed(result, 'Trek').sourceUrl).toBeUndefined();
  });

  it('does not flag ordinary prose in the source column as a broken link', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({ 8: 'Trek', 13: 'Vietjet booking confirmation' })],
    });
    expect(result.issues.some((i) => i.kind === 'broken-url')).toBe(false);
  });
});

describe('partial and missing data', () => {
  it('imports an itinerary that has only an activity column', () => {
    const result = importSheets({ Itinerary: [['Activity'], ['Wander around'], ['Eat something']] });
    expect(allItems(result)).toHaveLength(2);
    expect(result.trip.days[0]?.id).toBe('unscheduled');
  });

  it('skips blank rows without treating them as data', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({ 8: 'First' }), [], row({ 8: 'Second' })],
    });
    expect(allItems(result)).toHaveLength(2);
  });

  it('finds the header row when a title sits above it', () => {
    const result = importSheets({
      Itinerary: [['My trip plan 2026'], [], ITINERARY_HEADER, row({ 8: 'Real activity' })],
    });
    expect(itemNamed(result, 'Real activity')).toBeDefined();
  });

  it('reports unrecognized columns without discarding the row', () => {
    const result = importSheets({
      Itinerary: [[...ITINERARY_HEADER, 'Vibe check'], [...row({ 8: 'Kept' }), 'ok']],
    });
    expect(itemNamed(result, 'Kept')).toBeDefined();
    const issue = result.issues.find((i) => i.kind === 'unrecognized-column' && issueText(i).includes('Vibe check'));
    expect(issue).toBeDefined();
  });

  it('flags duplicate rows but keeps both', () => {
    const duplicate = row({ 8: 'Laundry' });
    const result = importSheets({ Itinerary: [ITINERARY_HEADER, duplicate, [...duplicate]] });
    expect(allItems(result).filter((i) => i.activity === 'Laundry')).toHaveLength(2);
    expect(result.issues.some((i) => i.kind === 'duplicate')).toBe(true);
  });

  it('reports an empty sheet', () => {
    const result = importSheets({ Itinerary: [ITINERARY_HEADER, row({})], Notes: [[]] });
    expect(result.issues.some((i) => i.kind === 'empty-sheet')).toBe(true);
  });
});

describe('bookings', () => {
  it('buckets booking timing into urgency groups', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({})],
      'Booking Options': [
        ['Item', 'Target price', 'Booking timing', 'Status'],
        ['Insurance', 45, 'Book now', 'Researching'],
        ['Train', 180, 'Book 7-14 days before', 'Ready to book'],
        ['Jeep', 250, 'Book 3 days before', 'Not started'],
        ['Transfer', 120, 'Arrange on arrival', 'Not started'],
        ['Homestay', 350, 'Pay on site', 'Booked'],
        ['Flight', 142, 'Confirmed', 'Confirmed'],
      ],
    });
    const byItem = Object.fromEntries(result.trip.bookings.map((b) => [b.item, b.urgency]));
    expect(byItem).toEqual({
      Insurance: 'now',
      Train: '7-14',
      Jeep: '1-3',
      Transfer: 'arrival',
      Homestay: 'site',
      // "Confirmed" in the timing column is a status: nothing left to book.
      Flight: 'none',
    });
  });

  it('does not warn when the timing column holds an already-done status', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({})],
      'Booking Options': [['Item', 'Booking timing'], ['Flight', 'Booked']],
    });
    expect(result.issues.some((i) => issueText(i).includes('Booked'))).toBe(false);
  });

  it('reads the five booking statuses', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({})],
      'Booking Options': [
        ['Item', 'Status'],
        ['A', 'Not started'],
        ['B', 'Researching'],
        ['C', 'Ready to book'],
        ['D', 'Booked'],
        ['E', 'Confirmed'],
      ],
    });
    expect(result.trip.bookings.map((b) => b.importedStatus)).toEqual([
      'not-started', 'researching', 'ready', 'booked', 'confirmed',
    ]);
  });
});

describe('overview parsing on real-world sheet layouts', () => {
  // A real Overview sheet had rows like "Trip year" (2026) and "TOTAL 4-leg flight/
  // person (VND)" (8,681,000) sharing the sheet with a second, unrelated table further
  // along the same rows. The trip title ended up as "2,026 · Base: actual booked
  // stays..." — a splice of unrelated cells — because "Trip year" matched the generic
  // "trip" alias for the title field.
  it('does not let a generic word like "trip" claim an unrelated label as the title', () => {
    const result = importSheets({
      Overview: [
        ['Trip year', 2026, null, 'Base: actual booked stays', 9751256],
        ['Traveler count', 2],
      ],
      Itinerary: [ITINERARY_HEADER, row({})],
    });
    expect(result.trip.title).not.toContain('2,026');
    expect(result.trip.title).not.toContain('9,751,256');
  });

  it('reads a lone long sentence at the top of the sheet as the trip title', () => {
    const result = importSheets({
      Overview: [
        ['Seoul - Jeju - Busan (South Korea) | 8 days | 2 women | 14-21 Nov 2026'],
        ['Traveler count', 2],
      ],
      Itinerary: [ITINERARY_HEADER, row({})],
    });
    expect(result.trip.title).toBe('Seoul - Jeju - Busan (South Korea) | 8 days | 2 women | 14-21 Nov 2026');
  });

  it('does not let "cities" buried in an unrelated sentence corrupt destinations', () => {
    const result = importSheets({
      Overview: [['Korea visa - shared across all 3 cities', 1020000]],
      Itinerary: [ITINERARY_HEADER, row({})],
    });
    expect(result.trip.destinations).not.toEqual(['1', '020', '000']);
  });

  // "KRW to VND" / "USD to VND (ref)" states the currency pair as the label and the
  // rate as the row's own value — a different convention from an inline "1 USD =
  // 15,500 IDR" sentence, and one `parseExchangeRates` alone does not recognize.
  it('reads a "<currency> to <currency>" label as an exchange rate', () => {
    const result = importSheets({
      Overview: [
        ['KRW to VND', 18.5],
        ['USD to VND (ref)', 26300],
      ],
      Itinerary: [ITINERARY_HEADER, row({})],
    });
    expect(result.trip.exchangeRates).toEqual(
      expect.arrayContaining([
        { from: 'KRW', to: 'VND', rate: 18.5, note: '1 KRW = 18.5 VND' },
        { from: 'USD', to: 'VND', rate: 26300, note: '1 USD = 26300 VND' },
      ]),
    );
  });

  it("reads the rate cell's numeric value rather than its rounded display text", () => {
    // Format "0" (no decimals) displays 18.5 as "19" — the parsed rate must come from
    // the cell's own number, not the text Excel would render.
    const result = importSheets({
      Overview: [['KRW to VND', { v: 18.5, t: 'n', z: '0' }]],
      Itinerary: [ITINERARY_HEADER, row({})],
    });
    const rate = result.trip.exchangeRates.find((r) => r.from === 'KRW');
    expect(rate?.rate).toBe(18.5);
  });

  it('infers the trip currency from the shared target of its exchange rates, not the first one declared', () => {
    const result = importSheets({
      Overview: [
        ['KRW to VND', 18.5],
        ['USD to VND (ref)', 26300],
      ],
      Itinerary: [ITINERARY_HEADER, row({ 10: 'VND', 11: 100000, 12: 120000 })],
    });
    expect(result.trip.baseCurrency).toBe('VND');
  });

  it('backfills a stated total with the inferred currency when its own cell has none', () => {
    const result = importSheets({
      Overview: [
        ['KRW to VND', 18.5],
        ['USD to VND (ref)', 26300],
        ['TOTAL incl. flight + visa', 19452256],
      ],
      Itinerary: [ITINERARY_HEADER, row({ 10: 'VND', 11: 100000, 12: 120000 })],
    });
    const stated = result.trip.totals.stated.find((s) => s.label === 'Group total');
    expect(stated?.base).toEqual({ amount: 19452256, currency: 'VND' });
  });

  // Two travelers planning everything together, with no per-activity breakdown, is a
  // common real workbook shape. It should read as one clear note, not one warning per
  // activity — 70 near-identical cards would drown out anything genuinely worth fixing.
  it('collapses a wholly absent traveler column into a single issue, not one per row', () => {
    const headerWithoutTraveler = ITINERARY_HEADER.slice(0, -1);
    const rowWithoutTraveler = (activity: string): CellInput[] => [
      dateCell(2026, 7, 6), timeCell(9, 0), timeCell(10, 0), '', 'Indonesia', 'Surabaya', 'Tour',
      'A → B', activity, '', 'USD', 10, 12, '', '',
    ];
    const result = importSheets({
      Overview: [['Traveler count', 2]],
      Itinerary: [
        headerWithoutTraveler,
        rowWithoutTraveler('Breakfast'),
        rowWithoutTraveler('Lunch'),
        rowWithoutTraveler('Dinner'),
      ],
    });
    const travelerIssues = result.issues.filter((i) => i.kind === 'missing-traveler');
    expect(travelerIssues).toHaveLength(1);
    expect(travelerIssues[0]?.message).toEqual({ id: 'noTravelerColumn', sheet: 'Itinerary', count: 3 });
    expect(travelerIssues[0]?.severity).toBe('info');
  });

  it('still warns per row when the traveler column exists but a specific cell is blank', () => {
    const result = importSheets({
      Overview: [['Traveler count', 2]],
      Itinerary: [ITINERARY_HEADER, row({ 15: '' }), row({ 15: 'A' })],
    });
    const travelerIssues = result.issues.filter((i) => i.kind === 'missing-traveler');
    expect(travelerIssues).toHaveLength(1);
    expect(travelerIssues[0]?.message.id).toBe('missingTraveler');
  });
});

describe('sources', () => {
  it('marks a source with a working link as verified', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({})],
      Sources: [['Topic', 'Supported fact', 'URL'], ['Fees', 'Entry is Rp 220,000.', 'https://example.com/']],
    });
    expect(result.trip.sources[0]?.kind).toBe('verified');
  });

  it('marks a source with no link and hedging language as an assumption', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({})],
      Sources: [['Topic', 'Supported fact', 'URL'], ['Permit', 'Assumed Rp 100,000 on weekdays.', '']],
    });
    expect(result.trip.sources[0]?.kind).toBe('assumption');
  });

  it('marks a source with a broken link as needing a recheck and keeps the text', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({})],
      Sources: [['Topic', 'Supported fact', 'URL'], ['Hawkers', 'Cash only.', 'https//example.com/x']],
    });
    const source = result.trip.sources[0];
    expect(source?.kind).toBe('recheck');
    expect(source?.url).toBeUndefined();
    // The unusable link is preserved separately so the page can show it as written.
    expect(source?.brokenUrlText).toBe('https//example.com/x');
  });

  it('links a source to the activity that cites the same URL', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({ 8: 'Bromo trek', 13: 'https://example.com/bromo' })],
      Sources: [['Topic', 'Supported fact', 'URL'], ['Fees', 'Entry is Rp 220,000.', 'https://example.com/bromo']],
    });
    expect(result.trip.sources[0]?.relatedItemIds).toContain(itemNamed(result, 'Bromo trek').id);
  });
});

describe('stable identifiers', () => {
  it('gives the same row the same id across two imports of the same workbook', () => {
    const sheets = { Overview: OVERVIEW_ROWS, Itinerary: [ITINERARY_HEADER, row({ 8: 'Bromo trek' })] };
    const first = importSheets(sheets);
    const second = importSheets(sheets);
    expect(itemNamed(first, 'Bromo trek').id).toBe(itemNamed(second, 'Bromo trek').id);
    expect(first.issues.map((i) => i.id)).toEqual(second.issues.map((i) => i.id));
  });

  it('gives different rows different ids', () => {
    const result = importSheets({
      Itinerary: [ITINERARY_HEADER, row({ 8: 'First' }), row({ 8: 'Second' })],
    });
    const ids = allItems(result).map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
