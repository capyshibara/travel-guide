/**
 * Worksheet -> normalized cell grid.
 *
 * We read worksheet cell objects rather than `sheet_to_json` because the cell object
 * is where the interesting metadata lives: the cached value of a formula (`v` next to
 * `f`), the hyperlink target (`l`), the display text Excel would show (`w`), and the
 * number format (`z`) that tells a date apart from a plain number.
 */
import type { CellObject, WorkBook, WorkSheet } from './sheetjs';
import { isDateTimeFormat, isTimeOnlyFormat, utils } from './sheetjs';
import { cleanText, isBlank } from './normalize';

export interface Cell {
  /** The cell's value; for a formula cell this is Excel's cached result. */
  value: string | number | boolean | null;
  /** Display text — Excel's formatted string when available, else the raw value. */
  text: string;
  /** Present when the cell held a formula. */
  formula?: string;
  /** Hyperlink target attached to the cell. */
  hyperlink?: string;
  /** The number format renders a date and/or a time. */
  isDateFormatted: boolean;
  /** The number format renders a time with no date part. */
  isTimeFormatted: boolean;
  /** This cell is inside a merged range and inherited its value from the anchor. */
  inheritedFromMerge: boolean;
}

export interface Grid {
  name: string;
  /** Row-major cells. Trailing all-blank rows are trimmed. */
  rows: Cell[][];
  /** Excel row number (1-based) of `rows[0]`. */
  firstRowNumber: number;
  /** Excel's 1904 date system flag, needed to read date serials. */
  date1904: boolean;
}

const EMPTY_CELL: Cell = {
  value: null,
  text: '',
  isDateFormatted: false,
  isTimeFormatted: false,
  inheritedFromMerge: false,
};

export function emptyCell(): Cell {
  return EMPTY_CELL;
}

function toCell(raw: CellObject | undefined): Cell {
  if (!raw || raw.t === 'z') return EMPTY_CELL;
  // `t === 'e'` is an Excel error value (#REF!, #N/A). Treat it as empty rather than
  // letting the error literal leak into the UI as if it were data.
  if (raw.t === 'e') return EMPTY_CELL;

  const value =
    raw.v === undefined || raw.v === null
      ? null
      : raw.v instanceof Date
        ? raw.v.toISOString()
        : (raw.v as string | number | boolean);

  const cell: Cell = {
    value,
    text: cleanText(raw.w ?? (value === null ? '' : value)),
    isDateFormatted: raw.t === 'n' && isDateTimeFormat(raw.z),
    isTimeFormatted: raw.t === 'n' && isTimeOnlyFormat(raw.z),
    inheritedFromMerge: false,
  };
  if (raw.f) cell.formula = raw.f;
  const target = raw.l?.Target;
  if (target) cell.hyperlink = target;
  return cell;
}

/**
 * Read a worksheet into a rectangular grid.
 *
 * Merged ranges are expanded: every cell in the range receives the anchor's value and
 * is flagged `inheritedFromMerge`, so a merged "Day 3" header spanning six itinerary
 * rows gives all six rows a date instead of five blanks.
 */
export function readGrid(workbook: WorkBook, name: string): Grid | null {
  const sheet: WorkSheet | undefined = workbook.Sheets[name];
  if (!sheet || !sheet['!ref']) return null;

  const ref = utils.decode_range(sheet['!ref']);
  const rowCount = ref.e.r - ref.s.r + 1;
  const colCount = ref.e.c - ref.s.c + 1;
  if (rowCount <= 0 || colCount <= 0) return null;

  // Guard against a pathological !ref (some generators emit a full-sheet range).
  const maxRows = Math.min(rowCount, 20000);
  const maxCols = Math.min(colCount, 512);

  const rows: Cell[][] = [];
  for (let r = 0; r < maxRows; r += 1) {
    const row: Cell[] = [];
    for (let c = 0; c < maxCols; c += 1) {
      const address = utils.encode_cell({ r: ref.s.r + r, c: ref.s.c + c });
      row.push(toCell(sheet[address] as CellObject | undefined));
    }
    rows.push(row);
  }

  for (const merge of sheet['!merges'] ?? []) {
    const anchorRow = merge.s.r - ref.s.r;
    const anchorCol = merge.s.c - ref.s.c;
    const anchor = rows[anchorRow]?.[anchorCol];
    if (!anchor || anchor.value === null) continue;
    for (let r = merge.s.r - ref.s.r; r <= merge.e.r - ref.s.r; r += 1) {
      for (let c = merge.s.c - ref.s.c; c <= merge.e.c - ref.s.c; c += 1) {
        if (r === anchorRow && c === anchorCol) continue;
        const row = rows[r];
        if (!row || r < 0 || c < 0 || c >= maxCols) continue;
        row[c] = { ...anchor, inheritedFromMerge: true };
      }
    }
  }

  while (rows.length > 0 && rows[rows.length - 1]!.every((cell) => isBlank(cell.value))) {
    rows.pop();
  }

  return {
    name,
    rows,
    firstRowNumber: ref.s.r + 1,
    date1904: workbook.Workbook?.WBProps?.date1904 === true,
  };
}

export function isRowBlank(row: readonly Cell[]): boolean {
  return row.every((cell) => isBlank(cell.value));
}

/**
 * Locate the header row.
 *
 * Scans the first 25 rows and scores each by how many non-blank, mostly-textual cells
 * it holds relative to the widest row seen, preferring the earliest strong candidate.
 * Real workbooks bury the header under a title row and a blank spacer often enough
 * that assuming row 1 is not good enough.
 */
export function findHeaderRow(grid: Grid, minColumns = 2): number | null {
  const limit = Math.min(grid.rows.length, 25);
  let best: { index: number; score: number } | null = null;

  for (let i = 0; i < limit; i += 1) {
    const row = grid.rows[i];
    if (!row) continue;
    const filled = row.filter((cell) => !isBlank(cell.value));
    if (filled.length < minColumns) continue;

    const textual = filled.filter((cell) => typeof cell.value === 'string').length;
    const shortLabels = filled.filter((cell) => cell.text.length > 0 && cell.text.length <= 40).length;
    // A header row is mostly short text labels, and the rows under it are populated.
    const nextRow = grid.rows[i + 1];
    const hasBodyBelow = nextRow ? !isRowBlank(nextRow) : false;
    const score = textual * 2 + shortLabels + filled.length + (hasBodyBelow ? 4 : 0);

    if (textual < Math.ceil(filled.length * 0.6)) continue;
    if (!best || score > best.score) best = { index: i, score };
  }

  return best?.index ?? null;
}

/** Header strings for a given row, trimmed. */
export function headerRowValues(grid: Grid, rowIndex: number): string[] {
  return (grid.rows[rowIndex] ?? []).map((cell) => cell.text);
}
