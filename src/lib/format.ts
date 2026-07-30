/**
 * Locale-aware display formatting.
 *
 * Dates are naive `YYYY-MM-DD` strings, so every date here is built and formatted in
 * UTC. Formatting a naive date through the local timezone is what makes a July 3rd
 * itinerary render as July 2nd for anyone west of Greenwich.
 */
import type { IsoDate, Money } from '../domain/types';
import { formatMinutes } from '../import/coerce';
import { CATALOGUES, getLanguage, getLocale } from '../i18n/locale';

export { formatMinutes };

/**
 * Minutes as "6h 35m" in the active language.
 *
 * The parsing layer has its own units-free duration helper; this is the display one,
 * so a Vietnamese reader gets "6 giờ 35 phút" rather than English abbreviations.
 */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '';
  const t = CATALOGUES[getLanguage()].common;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return t.minutes(m);
  if (m === 0) return t.hours(h);
  return `${t.hours(h)} ${t.minutes(m)}`;
}

/**
 * The locale the Intl formatters use — the app's chosen language, not the browser's.
 *
 * Picking the app language keeps dates and amounts consistent with the surrounding
 * copy: a reader who chose Vietnamese sees Vietnamese month names and 15.500 grouping,
 * whatever their browser is set to.
 */
export function currentLocale(): string {
  return getLocale();
}

function parseIso(date: IsoDate): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

function dateFormatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  // Keyed by locale as well as options, so switching language rebuilds the formatter.
  const key = `${currentLocale()}|${JSON.stringify(options)}`;
  const cached = dateFormatterCache.get(key);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat(currentLocale(), { ...options, timeZone: 'UTC' });
  dateFormatterCache.set(key, formatter);
  return formatter;
}

/** "Mon, 6 Jul". `noDate` is supplied by the caller so this file holds no copy. */
export function formatDayLabel(date: IsoDate | null, noDate = '—'): string {
  if (!date) return noDate;
  const parsed = parseIso(date);
  if (!parsed) return date;
  return dateFormatter({ weekday: 'short', day: 'numeric', month: 'short' }).format(parsed);
}

/** "Monday, 6 July 2026" — used for accessible labels and page headings. */
export function formatFullDate(date: IsoDate | null, noDate = '—'): string {
  if (!date) return noDate;
  const parsed = parseIso(date);
  if (!parsed) return date;
  return dateFormatter({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(parsed);
}

/** "Mon" */
export function formatWeekdayShort(date: IsoDate | null): string {
  if (!date) return '—';
  const parsed = parseIso(date);
  if (!parsed) return '—';
  return dateFormatter({ weekday: 'short' }).format(parsed);
}

/** "6" */
export function formatDayOfMonth(date: IsoDate | null): string {
  if (!date) return '–';
  const parsed = parseIso(date);
  if (!parsed) return '–';
  return String(parsed.getUTCDate());
}

/** "3–15 Jul 2026", or a single date when both ends match. */
export function formatDateRange(start: IsoDate | null, end: IsoDate | null, noDates = '—'): string {
  if (!start && !end) return noDates;
  if (!start) return formatDayLabel(end, noDates);
  if (!end || start === end) return formatFullDate(start, noDates);
  const from = parseIso(start);
  const to = parseIso(end);
  if (!from || !to) return `${start} – ${end}`;
  return dateFormatter({ day: 'numeric', month: 'short', year: 'numeric' }).formatRange(from, to);
}

/** Today as a naive local calendar date, matching how workbook dates are stored. */
export function todayIso(now: Date = new Date()): IsoDate {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Whole days from `from` to `to`. Negative when `to` is in the past. */
export function daysBetween(from: IsoDate, to: IsoDate): number | null {
  const a = parseIso(from);
  const b = parseIso(to);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

const ISO_4217 = /^[A-Z]{3}$/;
const moneyFormatterCache = new Map<string, Intl.NumberFormat>();

/**
 * Format an amount in its own currency.
 *
 * Currencies the workbook wrote as a non-ISO label (or left blank) are shown as
 * `LABEL 1,234` rather than being coerced into something Intl recognizes, because
 * relabelling a traveler's currency would misstate what they wrote.
 */
export function formatMoney(money: Money | null | undefined, options: { compact?: boolean } = {}): string {
  if (!money) return '—';
  const locale = currentLocale();
  const isIso = ISO_4217.test(money.currency);
  // Compact notation is only worth it once it actually shortens the number: "$803.1"
  // is both longer and less precise than "$803.13".
  const compact = (options.compact ?? false) && Math.abs(money.amount) >= 10_000;
  const key = `${locale}|${money.currency}|${isIso}|${compact}`;

  let formatter = moneyFormatterCache.get(key);
  if (!formatter) {
    const shared: Intl.NumberFormatOptions = compact
      ? { notation: 'compact', maximumFractionDigits: 1 }
      : { maximumFractionDigits: fractionDigitsFor(money.currency) };
    formatter = new Intl.NumberFormat(
      locale,
      isIso ? { style: 'currency', currency: money.currency, ...shared } : shared,
    );
    moneyFormatterCache.set(key, formatter);
  }

  const formatted = formatter.format(money.amount);
  return isIso ? formatted : `${money.currency ? `${money.currency} ` : ''}${formatted}`.trim();
}

/**
 * Currencies with no minor unit should not gain ".00".
 * Intl knows this for ISO codes; this covers the ones we see written as labels too.
 */
function fractionDigitsFor(currency: string): number {
  const zeroDecimal = new Set(['IDR', 'VND', 'JPY', 'KRW', 'CLP', 'ISK', 'HUF', 'TWD']);
  return zeroDecimal.has(currency) ? 0 : 2;
}

/** Converted amounts are always secondary and always marked with "≈". */
export function formatConverted(money: Money | null | undefined): string | null {
  if (!money) return null;
  return `≈ ${formatMoney(money)}`;
}

/** "+$420" / "−$30", or `noDifference` when the two scenarios match. */
export function formatDelta(base: Money | null, fallback: Money | null, noDifference = '—'): string {
  if (!base || !fallback || base.currency !== fallback.currency) return '—';
  const difference = fallback.amount - base.amount;
  if (difference === 0) return noDifference;
  const sign = difference > 0 ? '+' : '−';
  return `${sign}${formatMoney({ amount: Math.abs(difference), currency: base.currency })}`;
}

/** Bytes as "1.2 MB", for the import summary. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
