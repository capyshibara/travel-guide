/**
 * The single place SheetJS is imported.
 *
 * We depend on `@e965/xlsx`, which is an npm-registry republication of the official
 * SheetJS 0.20.3 release. SheetJS stopped publishing to npm at 0.18.5, and that version
 * carries CVE-2023-30533 (prototype pollution) and CVE-2024-22363 (ReDoS) — both
 * relevant here, since every workbook we parse is untrusted user input.
 *
 * To use the vendor's own distribution instead, the swap is:
 *   npm rm @e965/xlsx
 *   npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
 * and change the import below to `from 'xlsx'`. The API is identical.
 */
export { read, utils } from '@e965/xlsx';
export type { WorkBook, WorkSheet, CellObject, Range } from '@e965/xlsx';

/**
 * Built-in Excel number-format ids that denote a date and/or time.
 * 14–22 are the standard date/time formats; 27–36 and 50–58 are the East Asian
 * locale date formats; 45–47 are the elapsed-time and mm:ss formats.
 */
const BUILTIN_DATE_FORMAT_IDS = new Set<number>([
  ...range(14, 22),
  ...range(27, 36),
  ...range(45, 47),
  ...range(50, 58),
]);

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/**
 * Decide whether a cell's number format renders a date or a time.
 *
 * SheetJS exposes its format library as `SSF: any`, so rather than cast our way
 * around the project's no-`any` rule we read the format string directly. Quoted
 * literals, escapes, and bracketed sections are stripped first, otherwise a format
 * like `"Rp "#,##0` would look like it contains a month token.
 */
export function isDateTimeFormat(format: string | number | undefined): boolean {
  if (format === undefined) return false;
  if (typeof format === 'number') return BUILTIN_DATE_FORMAT_IDS.has(format);

  const stripped = format
    .replace(/"[^"]*"/g, '')
    .replace(/\\./g, '')
    .replace(/\[[^\]]*\]/g, '');
  return /[ymdhs]/i.test(stripped);
}

/** True when the format shows a time of day but no calendar date. */
export function isTimeOnlyFormat(format: string | number | undefined): boolean {
  if (format === undefined) return false;
  if (typeof format === 'number') return format === 18 || format === 19 || format === 20 || format === 21;

  const stripped = format
    .replace(/"[^"]*"/g, '')
    .replace(/\\./g, '')
    .replace(/\[[^\]]*\]/g, '');
  return /[hs]/i.test(stripped) && !/[yd]/i.test(stripped);
}
