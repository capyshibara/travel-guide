/**
 * Helpers for building in-memory workbooks in tests.
 *
 * Cells can be given as plain values or as `{ v, t, z }` descriptors, which is how a
 * test writes a real date serial or a time fraction rather than a string that happens
 * to look like one.
 */
import { utils, type WorkBook } from '../sheetjs';

export interface CellSpec {
  v: string | number | boolean;
  t: 'n' | 's' | 'b';
  z?: string;
  /** Hyperlink target, as Excel stores it. */
  l?: { Target: string };
  f?: string;
}

export type CellInput = string | number | boolean | null | CellSpec;

const isSpec = (cell: CellInput): cell is CellSpec =>
  cell !== null && typeof cell === 'object' && 'v' in cell;

/** Excel serial for a calendar date, 1900 system. */
export function dateSerial(y: number, m: number, d: number): number {
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
}

export function dateCell(y: number, m: number, d: number): CellSpec {
  return { v: dateSerial(y, m, d), t: 'n', z: 'yyyy-mm-dd' };
}

export function timeCell(h: number, m: number): CellSpec {
  return { v: (h * 60 + m) / 1440, t: 'n', z: 'hh:mm' };
}

export function linkCell(text: string, target: string): CellSpec {
  return { v: text, t: 's', l: { Target: target } };
}

/** A formula cell carrying its cached result, the way Excel saves one. */
export function formulaCell(formula: string, cached: number, format?: string): CellSpec {
  const spec: CellSpec = { v: cached, t: 'n', f: formula };
  if (format) spec.z = format;
  return spec;
}

export function makeSheet(rows: CellInput[][], merges?: string[]) {
  const sheet = utils.aoa_to_sheet(rows.map((row) => row.map((cell) => (isSpec(cell) ? null : cell))));
  rows.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (!isSpec(cell)) return;
      sheet[utils.encode_cell({ r, c })] = { ...cell };
    });
  });
  if (merges) sheet['!merges'] = merges.map((ref) => utils.decode_range(ref));
  return sheet;
}

export function makeWorkbook(sheets: Record<string, CellInput[][]>, merges: Record<string, string[]> = {}): WorkBook {
  const book = utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    utils.book_append_sheet(book, makeSheet(rows, merges[name]), name);
  }
  return book;
}

/** The header row used by most itinerary fixtures. */
export const ITINERARY_HEADER = [
  'Date', 'Start time', 'End time', 'Duration', 'Country', 'City / Area', 'Segment type',
  'Route / Place', 'Activity', 'Booking / Action', 'Currency', 'Base cost', 'Fallback cost',
  'Source URL', 'Notes', 'Traveler',
];

export const OVERVIEW_ROWS: CellInput[][] = [
  ['Trip title', 'Java 2026'],
  ['Destinations', 'Singapore → Java'],
  ['Traveler count', 2],
  ['Traveler A departure city', 'Hanoi (HAN)'],
  ['Traveler B departure city', 'Ho Chi Minh City (SGN)'],
  ['Base currency', 'USD'],
  ['Exchange rate', '1 USD = 15,500 IDR'],
];
