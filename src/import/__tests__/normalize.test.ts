import { describe, expect, it } from 'vitest';
import { matchAlias, normalizeKey, resolveHeaders, tokenize } from '../normalize';
import { ITINERARY_ALIASES, OVERVIEW_ALIASES, SHEET_ROLE_ALIASES } from '../aliases';

describe('normalizeKey', () => {
  it('folds case, whitespace and punctuation', () => {
    expect(normalizeKey('Start Time')).toBe('starttime');
    expect(normalizeKey('  start_time  ')).toBe('starttime');
    expect(normalizeKey('START-TIME')).toBe('starttime');
    expect(normalizeKey('Start / Time')).toBe('starttime');
  });

  it('strips diacritics so accented headers match their plain form', () => {
    expect(normalizeKey('Ngày')).toBe('ngay');
    expect(normalizeKey('Thời gian')).toBe('thoigian');
    expect(normalizeKey('País')).toBe('pais');
  });

  it('returns an empty string for nullish input', () => {
    expect(normalizeKey(null)).toBe('');
    expect(normalizeKey(undefined)).toBe('');
    expect(normalizeKey('   ')).toBe('');
  });
});

describe('sheet-name matching', () => {
  it.each([
    ['Overview', 'overview'],
    ['Trip Overview', 'overview'],
    ['Itinerary', 'itinerary'],
    ['Day-by-day', 'itinerary'],
    ['Jadwal', 'itinerary'],
    ['Booking Options', 'bookings'],
    ['To Book', 'bookings'],
    ['Sources', 'sources'],
    ['References', 'sources'],
    ['Budget', 'budget'],
  ])('maps %s to %s', (name, expected) => {
    expect(matchAlias(name, SHEET_ROLE_ALIASES)).toBe(expected);
  });

  it('returns null for a name it does not know', () => {
    expect(matchAlias('Sheet4', SHEET_ROLE_ALIASES)).toBeNull();
    expect(matchAlias('', SHEET_ROLE_ALIASES)).toBeNull();
  });
});

describe('tokenize', () => {
  it('splits on non-alphanumeric runs and folds case', () => {
    expect(tokenize('Base VND / person')).toEqual(['base', 'vnd', 'person']);
    expect(tokenize('TOTAL 4-leg flight/person (VND)')).toEqual(['total', '4', 'leg', 'flight', 'person', 'vnd']);
  });
});

describe('matchAlias whole-word matching', () => {
  // A real trip workbook once had this exact label matched to "endDate" — a short
  // alias like "to" matched as a raw character prefix of "total", not as its own word.
  it('does not let a short alias match inside a longer, unrelated word', () => {
    expect(matchAlias('TOTAL 4-leg flight/person (VND)', OVERVIEW_ALIASES)).not.toBe('endDate');
    expect(matchAlias('TOTAL incl. flight + visa', OVERVIEW_ALIASES)).toBe('groupTotal');
  });

  it('does not let an alias match as a substring buried inside another word', () => {
    // "separate" contains the letters "rate"; a real workbook's "kept separate" budget
    // note was once misread as an exchange-rate declaration because of it.
    expect(matchAlias('Shopping budget kept separate', OVERVIEW_ALIASES, { anywhere: true })).not.toBe(
      'exchangeRate',
    );
  });

  it('still matches a short alias when it is genuinely its own word', () => {
    expect(matchAlias('To', OVERVIEW_ALIASES)).toBe('endDate');
    expect(matchAlias('End date: 21 Nov', OVERVIEW_ALIASES)).toBe('endDate');
  });

  it('with anywhere: false, only matches a field name that leads the text', () => {
    // "Flight + Visa (fixed, from assumptions)" contains the standalone word "from",
    // but it is not declaring a start date — the field name has to lead the label.
    expect(
      matchAlias('Flight + Visa (fixed, from assumptions)', OVERVIEW_ALIASES, { anywhere: false }),
    ).toBeNull();
    expect(matchAlias('From: 14 Nov 2026', OVERVIEW_ALIASES, { anywhere: false })).toBe('startDate');
  });
});

describe('resolveHeaders', () => {
  it('maps a typical itinerary header row', () => {
    const { columns } = resolveHeaders(
      ['Date', 'Start time', 'End time', 'Activity', 'Base cost', 'Traveler'],
      ITINERARY_ALIASES,
    );
    expect(columns.date).toBe(0);
    expect(columns.start).toBe(1);
    expect(columns.end).toBe(2);
    expect(columns.activity).toBe(3);
    expect(columns.baseCost).toBe(4);
    expect(columns.traveler).toBe(5);
  });

  it('prefers the exact match so "Cost" cannot steal the "Base cost" column', () => {
    const { columns } = resolveHeaders(['Base cost', 'Fallback cost'], ITINERARY_ALIASES);
    expect(columns.baseCost).toBe(0);
    expect(columns.fallbackCost).toBe(1);
  });

  it('keeps the first column when two headers claim the same field', () => {
    const { columns, unmapped } = resolveHeaders(['Notes', 'Remarks'], ITINERARY_ALIASES);
    expect(columns.notes).toBe(0);
    expect(unmapped).toContain('Remarks');
  });

  it('reports headers it does not recognize', () => {
    const { unmapped, mapped } = resolveHeaders(['Activity', 'Vibe check'], ITINERARY_ALIASES);
    expect(unmapped).toEqual(['Vibe check']);
    expect(mapped).toEqual([{ header: 'Activity', field: 'activity' }]);
  });

  it('ignores blank header cells rather than reporting them as unmapped', () => {
    const { unmapped } = resolveHeaders(['Activity', '', '   '], ITINERARY_ALIASES);
    expect(unmapped).toEqual([]);
  });

  it('matches non-English headers', () => {
    const { columns } = resolveHeaders(['Tanggal', 'Kegiatan', 'Catatan'], ITINERARY_ALIASES);
    expect(columns.date).toBe(0);
    expect(columns.activity).toBe(1);
    expect(columns.notes).toBe(2);
  });
});
