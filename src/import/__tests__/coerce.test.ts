import { describe, expect, it } from 'vitest';
import {
  excelSerialToDate,
  excelSerialToMinutes,
  formatDuration,
  formatMinutes,
  looksLikeBrokenUrl,
  normalizeNumeric,
  parseBooleanish,
  parseCurrencyCode,
  parseDuration,
  parseMoney,
  parseTextDate,
  parseTextTime,
  parseUrl,
} from '../coerce';

describe('excelSerialToDate', () => {
  it('converts known serials', () => {
    // Excel's own anchors: 1 is 1900-01-01, and 25569 is the Unix epoch.
    expect(excelSerialToDate(1)).toBe('1900-01-01');
    expect(excelSerialToDate(25569)).toBe('1970-01-01');
    expect(excelSerialToDate(46206)).toBe('2026-07-03');
  });

  it('reproduces the 1900 leap-year bug that Excel itself carries', () => {
    expect(excelSerialToDate(59)).toBe('1900-02-28');
    expect(excelSerialToDate(61)).toBe('1900-03-01');
  });

  it('ignores the time-of-day fraction', () => {
    expect(excelSerialToDate(46206.9999)).toBe('2026-07-03');
  });

  it('handles the 1904 date system', () => {
    expect(excelSerialToDate(0, true)).toBe('1904-01-01');
    expect(excelSerialToDate(44744, true)).toBe('2026-07-03');
  });

  it('rejects out-of-range and non-finite input', () => {
    expect(excelSerialToDate(0)).toBeNull();
    expect(excelSerialToDate(-5)).toBeNull();
    expect(excelSerialToDate(3_000_000)).toBeNull();
    expect(excelSerialToDate(Number.NaN)).toBeNull();
  });

  it('does not shift by a day regardless of the local timezone', () => {
    // The conversion is pure UTC arithmetic, so this holds in any TZ the CI box uses.
    expect(excelSerialToDate(46206)).toBe('2026-07-03');
    expect(new Date(`${excelSerialToDate(46206)}T12:00:00Z`).getUTCDate()).toBe(3);
  });
});

describe('excelSerialToMinutes', () => {
  it('reads the fractional part as a time of day', () => {
    expect(excelSerialToMinutes(0.5)).toBe(720);
    expect(excelSerialToMinutes(46206.5)).toBe(720);
    expect(excelSerialToMinutes(0)).toBe(0);
  });

  it('rounds 23:59:59.9 down to a valid minute rather than to 1440', () => {
    expect(excelSerialToMinutes(0.9999999)).toBe(0);
  });
});

describe('parseTextDate', () => {
  it.each([
    ['2026-07-03', '2026-07-03'],
    ['2026-7-3', '2026-07-03'],
    ['3 July 2026', '2026-07-03'],
    ['3 Jul 2026', '2026-07-03'],
    ['July 3, 2026', '2026-07-03'],
    ['Jul 3 2026', '2026-07-03'],
  ])('parses %s', (input, expected) => {
    expect(parseTextDate(input)).toBe(expected);
  });

  it('reads ambiguous numeric dates day-first', () => {
    expect(parseTextDate('03/07/2026')).toBe('2026-07-03');
    expect(parseTextDate('3.7.2026')).toBe('2026-07-03');
  });

  it('falls back to month-first when the first number cannot be a day', () => {
    expect(parseTextDate('07/25/2026')).toBe('2026-07-25');
  });

  it('rejects impossible dates', () => {
    expect(parseTextDate('2026-02-30')).toBeNull();
    expect(parseTextDate('2026-13-01')).toBeNull();
    expect(parseTextDate('sometime in July')).toBeNull();
    expect(parseTextDate('')).toBeNull();
  });
});

describe('parseTextTime', () => {
  it.each([
    ['07:30', 450],
    ['7:30', 450],
    ['7.30', 450],
    ['7h30', 450],
    ['23:40', 1420],
    ['00:00', 0],
    ['24:00', 0],
    ['7:30 PM', 1170],
    ['7pm', 1140],
    ['12:00 AM', 0],
    ['12:00 PM', 720],
  ])('parses %s', (input, expected) => {
    expect(parseTextTime(input)).toBe(expected);
  });

  it('rejects impossible times', () => {
    expect(parseTextTime('25:00')).toBeNull();
    expect(parseTextTime('10:75')).toBeNull();
    expect(parseTextTime('morning')).toBeNull();
    expect(parseTextTime('')).toBeNull();
  });
});

describe('parseDuration', () => {
  it.each([
    ['2h 30m', 150],
    ['2h', 120],
    ['45m', 45],
    ['90 min', 90],
    ['1:30', 90],
    ['2.5h', 150],
    ['6h 35m', 395],
    ['2 hours 30 minutes', 150],
  ])('parses %s', (input, expected) => {
    expect(parseDuration(input)).toBe(expected);
  });

  it('treats an Excel time fraction as a duration', () => {
    expect(parseDuration(0.25)).toBe(360);
  });

  it('treats a plain number as minutes', () => {
    expect(parseDuration(90)).toBe(90);
  });

  it('returns null for unreadable input', () => {
    expect(parseDuration('a while')).toBeNull();
    expect(parseDuration('')).toBeNull();
  });
});

describe('normalizeNumeric', () => {
  it('treats a single separator with three trailing digits as grouping', () => {
    expect(normalizeNumeric('15,500')).toBe('15500');
    expect(normalizeNumeric('250,000')).toBe('250000');
    expect(normalizeNumeric('250.000')).toBe('250000');
  });

  it('treats a single separator with other digit counts as a decimal point', () => {
    expect(normalizeNumeric('16.10')).toBe('16.10');
    expect(normalizeNumeric('0,5')).toBe('0.5');
    expect(normalizeNumeric('1.2345')).toBe('1.2345');
  });

  it('uses the rightmost separator as the decimal point when both appear', () => {
    expect(normalizeNumeric('1,234.56')).toBe('1234.56');
    expect(normalizeNumeric('1.234,56')).toBe('1234.56');
  });

  it('treats a repeated separator as grouping', () => {
    expect(normalizeNumeric('1.234.567')).toBe('1234567');
    expect(normalizeNumeric('1,234,567')).toBe('1234567');
  });
});

describe('parseMoney', () => {
  it('reads amount and currency together', () => {
    expect(parseMoney('Rp 250,000')).toEqual({ amount: 250000, currency: 'IDR' });
    expect(parseMoney('$1,234.56')).toEqual({ amount: 1234.56, currency: 'USD' });
    expect(parseMoney('142 USD')).toEqual({ amount: 142, currency: 'USD' });
    expect(parseMoney('IDR 250000')).toEqual({ amount: 250000, currency: 'IDR' });
  });

  it('reads a bare number with no currency', () => {
    expect(parseMoney(142)).toEqual({ amount: 142, currency: null });
    expect(parseMoney('142')).toEqual({ amount: 142, currency: null });
  });

  it('reads a parenthesised amount as negative', () => {
    expect(parseMoney('(50)')).toEqual({ amount: -50, currency: null });
  });

  it('returns null for placeholders rather than guessing zero', () => {
    expect(parseMoney('TBD')).toBeNull();
    expect(parseMoney('n/a')).toBeNull();
    expect(parseMoney('-')).toBeNull();
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('free')).toBeNull();
  });

  it('reads an explicit zero as zero', () => {
    expect(parseMoney(0)).toEqual({ amount: 0, currency: null });
  });
});

describe('parseCurrencyCode', () => {
  it.each([
    ['USD', 'USD'],
    ['usd', 'USD'],
    ['$', 'USD'],
    ['Rp', 'IDR'],
    ['IDR', 'IDR'],
    ['rupiah', 'IDR'],
    ['₫', 'VND'],
    ['SGD', 'SGD'],
  ])('reads %s', (input, expected) => {
    expect(parseCurrencyCode(input)).toBe(expected);
  });

  it('returns null for text that is not a currency', () => {
    expect(parseCurrencyCode('per person')).toBeNull();
    expect(parseCurrencyCode('')).toBeNull();
  });
});

describe('parseUrl', () => {
  it('accepts http and https', () => {
    expect(parseUrl('https://example.com/a')).toBe('https://example.com/a');
    expect(parseUrl('http://example.com/')).toBe('http://example.com/');
  });

  it('upgrades a bare www host', () => {
    expect(parseUrl('www.example.com')).toBe('https://www.example.com/');
  });

  it('rejects schemes that must never reach an href', () => {
    expect(parseUrl('javascript:alert(1)')).toBeNull();
    expect(parseUrl('data:text/html,<script>')).toBeNull();
    expect(parseUrl('file:///etc/passwd')).toBeNull();
  });

  it('rejects text that is not a URL', () => {
    expect(parseUrl('Vietjet booking confirmation')).toBeNull();
    expect(parseUrl('https//example.com')).toBeNull();
    expect(parseUrl('')).toBeNull();
  });
});

describe('looksLikeBrokenUrl', () => {
  it('flags text that was clearly meant to be a link', () => {
    expect(looksLikeBrokenUrl('https//example.com/page')).toBe(true);
    expect(looksLikeBrokenUrl('see example.com for details')).toBe(true);
  });

  it('does not flag ordinary prose or working links', () => {
    expect(looksLikeBrokenUrl('Vietjet booking confirmation')).toBe(false);
    expect(looksLikeBrokenUrl('https://example.com')).toBe(false);
    expect(looksLikeBrokenUrl('')).toBe(false);
  });
});

describe('formatting', () => {
  it('formats minutes as a clock time', () => {
    expect(formatMinutes(450)).toBe('07:30');
    expect(formatMinutes(0)).toBe('00:00');
    expect(formatMinutes(1420)).toBe('23:40');
  });

  it('formats durations the way the design system writes them', () => {
    expect(formatDuration(395)).toBe('6h 35m');
    expect(formatDuration(120)).toBe('2h');
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(0)).toBe('');
  });
});

describe('parseBooleanish', () => {
  it('reads yes/no style cells', () => {
    expect(parseBooleanish('Yes')).toBe(true);
    expect(parseBooleanish('no')).toBe(false);
    expect(parseBooleanish(true)).toBe(true);
  });

  it('returns null when the cell says nothing either way', () => {
    expect(parseBooleanish('')).toBeNull();
    expect(parseBooleanish('maybe')).toBeNull();
  });
});
