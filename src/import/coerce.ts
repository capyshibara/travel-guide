/**
 * Turning spreadsheet cell values into model values.
 *
 * Every function here returns `null` rather than a guess when it cannot read the
 * input. Callers turn those nulls into ImportIssues, so nothing is silently invented.
 */
import type { IsoDate, MinuteOfDay } from '../domain/types';
import { cleanText, isBlank, normalizeKey } from './normalize';

export const MINUTES_PER_DAY = 1440;

/**
 * Excel's day-zero under the 1900 date system.
 *
 * Excel believes 1900 was a leap year. Serials 1–59 are 1900-01-01 to 1900-02-28,
 * serial 60 is the imaginary 1900-02-29, and serials 61 onward are 1900-03-01 onward.
 * That makes day-zero 1899-12-31 below the bug and 1899-12-30 above it.
 */
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);
const EXCEL_EPOCH_PRE_BUG_UTC = Date.UTC(1899, 11, 31);
/** The serial Excel assigns to the date that never existed. */
const PHANTOM_LEAP_DAY = 60;

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toIsoDate(year: number, month: number, day: number): IsoDate {
  return `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;
}

/**
 * Convert an Excel date serial to a calendar date.
 *
 * Done with UTC arithmetic and then read back with UTC getters, so the result is the
 * date the workbook author typed regardless of the viewer's timezone. Going through
 * local-time `Date` here is the classic off-by-one-day import bug.
 */
export function excelSerialToDate(serial: number, date1904 = false): IsoDate | null {
  if (!Number.isFinite(serial)) return null;
  const whole = Math.floor(serial);
  // Serial 0 is valid in the 1904 system; in 1900 the usable range starts at 1.
  if (whole < (date1904 ? 0 : 1) || whole > 2958465) return null;
  if (!date1904 && whole === PHANTOM_LEAP_DAY) return null;

  const epoch = date1904 || whole > PHANTOM_LEAP_DAY ? EXCEL_EPOCH_UTC : EXCEL_EPOCH_PRE_BUG_UTC;
  const offsetDays = date1904 ? whole + 1462 : whole;
  const d = new Date(epoch + offsetDays * 86400000);
  return toIsoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** The fractional part of an Excel serial is the time of day. */
export function excelSerialToMinutes(serial: number): MinuteOfDay | null {
  if (!Number.isFinite(serial)) return null;
  const frac = serial - Math.floor(serial);
  const minutes = Math.round(frac * MINUTES_PER_DAY);
  return minutes === MINUTES_PER_DAY ? 0 : minutes;
}

const ISO_DATE_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/;
const DMY_RE = /^(\d{1,2})[/.\- ](\d{1,2})[/.\- ](\d{2,4})$/;
const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};
const TEXT_DATE_RE = /^(\d{1,2})\s*([a-z]+)\s*(\d{4})$/i;
const TEXT_DATE_MD_RE = /^([a-z]+)\s+(\d{1,2}),?\s*(\d{4})$/i;

function validDate(y: number, m: number, d: number): IsoDate | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
  return toIsoDate(y, m, d);
}

/**
 * Parse a date written as text.
 *
 * Ambiguous all-numeric forms are read day-first (`03/07/2026` = 3 July), matching the
 * majority-world convention this kind of workbook is usually written in. When the first
 * number cannot be a day, it is read as a month instead. The caller records an issue
 * either way so the traveler can check.
 */
export function parseTextDate(input: string): IsoDate | null {
  const text = cleanText(input);
  if (!text) return null;

  const iso = ISO_DATE_RE.exec(text);
  if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const textual = TEXT_DATE_RE.exec(text);
  if (textual) {
    const month = MONTH_NAMES[textual[2]!.toLowerCase()];
    if (month) return validDate(Number(textual[3]), month, Number(textual[1]));
  }

  const textualMd = TEXT_DATE_MD_RE.exec(text);
  if (textualMd) {
    const month = MONTH_NAMES[textualMd[1]!.toLowerCase()];
    if (month) return validDate(Number(textualMd[3]), month, Number(textualMd[2]));
  }

  const dmy = DMY_RE.exec(text);
  if (dmy) {
    const a = Number(dmy[1]);
    const b = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += year < 70 ? 2000 : 1900;
    // Day-first, unless the second number is too large to be a month.
    return b > 12 ? validDate(year, a, b) : validDate(year, b, a);
  }
  return null;
}

const TIME_RE = /^(\d{1,2})\s*[:.h]\s*(\d{2})?\s*(?::\s*(\d{2}))?\s*(am|pm)?$/i;
const COMPACT_TIME_RE = /^(\d{1,2})\s*(am|pm)$/i;

/** Parse "07:30", "7.30", "7h30", "7:30 PM", "23:40", "7pm" into minutes from midnight. */
export function parseTextTime(input: string): MinuteOfDay | null {
  const text = cleanText(input).toLowerCase();
  if (!text) return null;

  const compact = COMPACT_TIME_RE.exec(text);
  if (compact) {
    const h = Number(compact[1]);
    if (h < 1 || h > 12) return null;
    return ((h % 12) + (compact[2] === 'pm' ? 12 : 0)) * 60;
  }

  const m = TIME_RE.exec(text);
  if (!m) return null;
  let hours = Number(m[1]);
  const minutes = m[2] === undefined ? 0 : Number(m[2]);
  const meridiem = m[4];
  if (minutes > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (meridiem === 'pm' ? 12 : 0);
  } else if (hours === 24 && minutes === 0) {
    return 0;
  } else if (hours > 23) {
    return null;
  }
  return hours * 60 + minutes;
}

/** Parse "2h 30m", "2.5h", "90 min", "1:30", "2 hours 30 minutes" into minutes. */
export function parseDuration(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) {
    // A bare number below 1 is an Excel time fraction; otherwise treat it as minutes.
    return input > 0 && input < 1 ? Math.round(input * MINUTES_PER_DAY) : Math.round(input);
  }
  const text = cleanText(input).toLowerCase();
  if (!text) return null;

  const clock = /^(\d{1,3}):(\d{2})$/.exec(text);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);

  let total = 0;
  let matched = false;
  const hours = /(\d+(?:[.,]\d+)?)\s*(?:h(?:ou)?rs?\b|h\b|jam\b|giờ\b)/.exec(text);
  if (hours) {
    total += Number(hours[1]!.replace(',', '.')) * 60;
    matched = true;
  }
  const mins = /(\d+(?:[.,]\d+)?)\s*(?:m(?:in)?(?:ute)?s?\b|m\b|menit\b|phút\b)/.exec(text);
  if (mins) {
    total += Number(mins[1]!.replace(',', '.'));
    matched = true;
  }
  if (!matched) {
    const bare = /^(\d+(?:[.,]\d+)?)$/.exec(text);
    if (bare) return Math.round(Number(bare[1]!.replace(',', '.')));
    return null;
  }
  return Math.round(total);
}

/** Minutes from midnight to "HH:MM". */
export function formatMinutes(minutes: MinuteOfDay): string {
  const m = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}

/** Minutes to "6h 35m" / "45m" / "2h". */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  $: 'USD', '£': 'GBP', '€': 'EUR', '¥': 'JPY', '₫': 'VND', '₩': 'KRW', '₹': 'INR', '₱': 'PHP', '฿': 'THB',
};
const CURRENCY_WORDS: Record<string, string> = {
  rp: 'IDR', idr: 'IDR', rupiah: 'IDR', usd: 'USD', us: 'USD', dollar: 'USD', dollars: 'USD',
  sgd: 'SGD', vnd: 'VND', dong: 'VND', eur: 'EUR', euro: 'EUR', gbp: 'GBP', myr: 'MYR', rm: 'MYR',
  thb: 'THB', baht: 'THB', jpy: 'JPY', yen: 'JPY', aud: 'AUD', cad: 'CAD', krw: 'KRW', inr: 'INR',
  php: 'PHP', chf: 'CHF', nzd: 'NZD', cny: 'CNY', rmb: 'CNY', hkd: 'HKD', twd: 'TWD',
};

/** Recognize a currency from a cell that holds only a currency label. */
export function parseCurrencyCode(input: unknown): string | null {
  const text = cleanText(input);
  if (!text) return null;
  if (CURRENCY_SYMBOLS[text]) return CURRENCY_SYMBOLS[text]!;
  const key = normalizeKey(text);
  if (CURRENCY_WORDS[key]) return CURRENCY_WORDS[key]!;
  if (/^[A-Za-z]{3}$/.test(text)) return text.toUpperCase();
  return null;
}

/**
 * Parse an amount that may carry a currency, thousands separators in either
 * convention, or a parenthesised negative.
 *
 *   "Rp 250,000"  -> { amount: 250000, currency: 'IDR' }
 *   "1.234,56 €"  -> { amount: 1234.56, currency: 'EUR' }
 *   "$1,234.56"   -> { amount: 1234.56, currency: 'USD' }
 */
export function parseMoney(input: unknown): { amount: number; currency: string | null } | null {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? { amount: input, currency: null } : null;
  }
  const text = cleanText(input);
  if (!text) return null;
  if (/^(n\/?a|tbd|tba|free|-|—|\?)$/i.test(text)) return null;

  let currency: string | null = null;
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (text.includes(symbol)) {
      currency = code;
      break;
    }
  }
  if (!currency) {
    const word = /(^|\s)([A-Za-z]{2,7})(?=\s*[\d.,])|([\d.,])\s*([A-Za-z]{2,7})\s*$/.exec(text);
    const candidate = word?.[2] ?? word?.[4];
    if (candidate) currency = parseCurrencyCode(candidate);
  }

  const negative = /^\(.*\)$/.test(text) || text.trimStart().startsWith('-');
  const digits = text.replace(/[^\d.,]/g, '');
  if (!digits || !/\d/.test(digits)) return null;

  const amount = Number(normalizeNumeric(digits));
  if (!Number.isFinite(amount)) return null;
  return { amount: negative ? -Math.abs(amount) : amount, currency };
}

/**
 * Normalize a digits-and-separators string to a JavaScript number literal.
 *
 * Workbooks mix the two grouping conventions freely — "1,234.56" and "1.234,56" mean
 * the same amount — and Indonesian rupiah amounts like "250.000" are written with the
 * separator this app's other users would read as a decimal point. The rules:
 *
 *   - both separators present -> the rightmost one is the decimal point
 *   - one separator, appearing more than once -> grouping ("1.234.567")
 *   - one separator, appearing once, followed by exactly 3 digits -> grouping
 *     ("15,500" is fifteen thousand five hundred, not fifteen and a half)
 *   - anything else -> decimal point ("16.10", "0,5")
 */
export function normalizeNumeric(digits: string): string {
  const commas = (digits.match(/,/g) ?? []).length;
  const dots = (digits.match(/\./g) ?? []).length;

  if (commas > 0 && dots > 0) {
    const decimal = digits.lastIndexOf(',') > digits.lastIndexOf('.') ? ',' : '.';
    const grouping = decimal === ',' ? '.' : ',';
    return digits.split(grouping).join('').replace(decimal, '.');
  }

  const separator = commas > 0 ? ',' : dots > 0 ? '.' : null;
  if (separator === null) return digits;

  const count = commas + dots;
  if (count > 1) return digits.split(separator).join('');

  const [whole = '', fraction = ''] = digits.split(separator);
  if (fraction.length === 3) return `${whole}${fraction}`;
  return `${whole}.${fraction}`;
}

/**
 * Accept a URL only if it is http(s) and parses. Everything else — `javascript:`,
 * `data:`, bare text — is rejected, because these strings end up in `href`.
 */
export function parseUrl(input: unknown): string | null {
  const text = cleanText(input);
  if (!text) return null;
  const candidate = /^(https?:)?\/\//i.test(text) || !/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : text;
  let normalized = candidate;
  if (/^www\./i.test(normalized)) normalized = `https://${normalized}`;
  if (/^\/\//.test(normalized)) normalized = `https:${normalized}`;
  try {
    const url = new URL(normalized);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname.includes('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** True when the text looks like it was meant to be a link but is not usable. */
export function looksLikeBrokenUrl(input: unknown): boolean {
  const text = cleanText(input);
  if (!text || parseUrl(text) !== null) return false;
  return /(^|\s)(https?:|www\.|\S+\.(com|org|net|io|co|id|sg|vn|gov|edu)\b)/i.test(text);
}

const TRUTHY = new Set(['yes', 'y', 'true', 'required', 'needed', 'x', '1', 'ya', 'perlu']);
const FALSY = new Set(['no', 'n', 'false', 'none', 'notrequired', 'na', '0', 'tidak']);

/** Read a yes/no-ish cell. Returns null when the cell says nothing either way. */
export function parseBooleanish(input: unknown): boolean | null {
  if (typeof input === 'boolean') return input;
  if (isBlank(input)) return null;
  const key = normalizeKey(input);
  if (TRUTHY.has(key)) return true;
  if (FALSY.has(key)) return false;
  return null;
}
