/**
 * Reading a typed value out of a Cell.
 *
 * Each reader uses the cell's own metadata first (a date-formatted number is a date;
 * a hyperlinked cell already has its target) and falls back to parsing the text.
 */
import type { IsoDate, MinuteOfDay, Money } from '../domain/types';
import type { Cell } from './grid';
import {
  excelSerialToDate,
  excelSerialToMinutes,
  parseCurrencyCode,
  parseDuration,
  parseMoney,
  parseTextDate,
  parseTextTime,
  parseUrl,
} from './coerce';
import { cleanText, isBlank } from './normalize';

export function readText(cell: Cell | undefined): string {
  if (!cell || cell.value === null) return '';
  return cleanText(cell.text || String(cell.value));
}

export type ReadOutcome<T> = { ok: true; value: T } | { ok: false; reason: 'blank' | 'invalid' };

const BLANK = { ok: false, reason: 'blank' } as const;
const INVALID = { ok: false, reason: 'invalid' } as const;

export function readDate(cell: Cell | undefined, date1904: boolean): ReadOutcome<IsoDate> {
  if (!cell || isBlank(cell.value)) return BLANK;

  if (typeof cell.value === 'number') {
    // A date-formatted number is unambiguous. An unformatted number in a date column
    // is still most likely a serial, so try that before giving up.
    const iso = excelSerialToDate(cell.value, date1904);
    if (iso) return { ok: true, value: iso };
    return INVALID;
  }

  // SheetJS hands back an ISO string when a cell already carried a Date object.
  const text = readText(cell);
  const iso = parseTextDate(text);
  if (iso) return { ok: true, value: iso };

  const isoPrefix = /^(\d{4}-\d{2}-\d{2})T/.exec(text);
  if (isoPrefix) return { ok: true, value: isoPrefix[1]! };

  return INVALID;
}

export function readTime(cell: Cell | undefined): ReadOutcome<MinuteOfDay> {
  if (!cell || isBlank(cell.value)) return BLANK;

  if (typeof cell.value === 'number') {
    const minutes = excelSerialToMinutes(cell.value);
    if (minutes === null) return INVALID;
    // A whole number in a time column carries no time-of-day information, unless
    // Excel formatted it as a time (in which case 0 really is midnight).
    if (Number.isInteger(cell.value) && cell.value !== 0 && !cell.isTimeFormatted) return INVALID;
    return { ok: true, value: minutes };
  }

  const minutes = parseTextTime(readText(cell));
  return minutes === null ? INVALID : { ok: true, value: minutes };
}

export function readDurationMinutes(cell: Cell | undefined): ReadOutcome<number> {
  if (!cell || isBlank(cell.value)) return BLANK;
  if (typeof cell.value === 'number' && cell.isTimeFormatted) {
    const minutes = excelSerialToMinutes(cell.value);
    if (minutes !== null && minutes > 0) return { ok: true, value: minutes };
  }
  const minutes = parseDuration(typeof cell.value === 'number' ? cell.value : readText(cell));
  if (minutes === null || minutes <= 0) return INVALID;
  return { ok: true, value: minutes };
}

export function readMoney(cell: Cell | undefined, fallbackCurrency: string | undefined): ReadOutcome<Money> {
  if (!cell || isBlank(cell.value)) return BLANK;
  const parsed = parseMoney(typeof cell.value === 'number' ? cell.value : readText(cell));
  if (!parsed) return INVALID;

  // A currency-formatted cell can name its currency in the number format itself.
  const currency = parsed.currency ?? fallbackCurrency ?? '';
  return { ok: true, value: { amount: parsed.amount, currency } };
}

export function readCurrency(cell: Cell | undefined): string | null {
  if (!cell || isBlank(cell.value)) return null;
  return parseCurrencyCode(readText(cell));
}

/**
 * Prefer the cell's real hyperlink over its text: workbooks routinely show a friendly
 * label ("Traveloka") over a link, and the label alone is not a URL.
 */
export function readUrl(cell: Cell | undefined): { url: string | null; hadText: boolean } {
  if (!cell || isBlank(cell.value)) return { url: null, hadText: false };
  if (cell.hyperlink) {
    const fromLink = parseUrl(cell.hyperlink);
    if (fromLink) return { url: fromLink, hadText: true };
  }
  const text = readText(cell);
  return { url: parseUrl(text), hadText: text.length > 0 };
}
