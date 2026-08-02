/**
 * Text normalization and column-alias resolution.
 *
 * Everything here is pure and workbook-agnostic: given some text from a spreadsheet,
 * decide what it means. No SheetJS types cross this boundary.
 */

/**
 * Fold a header or sheet name to a comparison key: lowercase, accents stripped,
 * every run of non-alphanumerics collapsed away.
 *
 *   "Start Time"     -> "starttime"
 *   " start_time "   -> "starttime"
 *   "Ngày / Date"    -> "ngaydate"
 */
export function normalizeKey(input: unknown): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/** Trim and collapse internal whitespace, preserving the original characters. */
export function cleanText(input: unknown): string {
  if (input === null || input === undefined) return '';
  return String(input).replace(/\s+/g, ' ').trim();
}

export function isBlank(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === '';
}

/**
 * Split text into lowercase, accent-stripped word tokens.
 *
 *   "Base VND / person"  -> ["base", "vnd", "person"]
 *   "TOTAL 4-leg flight"  -> ["total", "4", "leg", "flight"]
 */
export function tokenize(input: unknown): string[] {
  if (input === null || input === undefined) return [];
  const folded = String(input)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
  return folded.split(/[^a-z0-9]+/).filter(Boolean);
}

/** Does `tokens` contain `needle` as a contiguous run, starting anywhere? */
function containsTokenRun(tokens: readonly string[], needle: readonly string[]): boolean {
  if (needle.length === 0 || needle.length > tokens.length) return false;
  for (let start = 0; start <= tokens.length - needle.length; start += 1) {
    if (needle.every((word, i) => tokens[start + i] === word)) return true;
  }
  return false;
}

export interface MatchAliasOptions {
  /**
   * Whether an alias may match anywhere in the text, not just as its leading words.
   * Column headers are a handful of words where "anywhere" and "leading" are nearly
   * the same thing; free-text label cells (an Overview sheet's "label: value" rows)
   * are often full sentences, where matching a field name buried mid-sentence finds
   * coincidences rather than the field the row actually declares. Default true.
   */
  anywhere?: boolean;
}

/**
 * Resolve a header or label against an alias table.
 *
 * Matching runs in three passes, most precise first, so that a sheet with both
 * "Cost" and "Base cost" columns does not assign both to the same field:
 *   1. exact normalized equality (handles concatenated forms like "EndDate")
 *   2. the alias is a token-level prefix of the text ("End date: 12 Jul" matches "end date")
 *   3. the alias appears as a whole word (token run) anywhere in the text
 *
 * All matching is on whole word tokens, never raw substrings — "to" cannot match
 * inside "total", and "rate" cannot match inside "separate". An earlier version of
 * this function matched substrings, and a real workbook's "TOTAL flight cost" row was
 * consequently misread as an end date because it starts with "to".
 */
export function matchAlias<F extends string>(
  header: string,
  aliases: Readonly<Record<F, readonly string[]>>,
  options: MatchAliasOptions = {},
): F | null {
  const key = normalizeKey(header);
  if (!key) return null;
  const { anywhere = true } = options;
  const entries = Object.entries(aliases) as [F, readonly string[]][];
  const tokens = tokenize(header);

  for (const [field, list] of entries) {
    if (list.some((a) => normalizeKey(a) === key)) return field;
  }
  for (const [field, list] of entries) {
    if (list.some((a) => { const at = tokenize(a); return at.length > 0 && at.every((w, i) => tokens[i] === w); })) {
      return field;
    }
  }
  if (anywhere) {
    for (const [field, list] of entries) {
      if (list.some((a) => containsTokenRun(tokens, tokenize(a)))) return field;
    }
  }
  return null;
}

/**
 * Map a row of header cells to fields, keeping the first column that claims a field
 * so a duplicated header cannot silently overwrite an earlier column.
 */
export function resolveHeaders<F extends string>(
  headers: readonly string[],
  aliases: Readonly<Record<F, readonly string[]>>,
): { columns: Partial<Record<F, number>>; mapped: { header: string; field: string }[]; unmapped: string[] } {
  const columns: Partial<Record<F, number>> = {};
  const mapped: { header: string; field: string }[] = [];
  const unmapped: string[] = [];

  headers.forEach((header, index) => {
    if (isBlank(header)) return;
    const field = matchAlias(header, aliases);
    if (field === null) {
      unmapped.push(cleanText(header));
      return;
    }
    if (columns[field] !== undefined) {
      unmapped.push(cleanText(header));
      return;
    }
    columns[field] = index;
    mapped.push({ header: cleanText(header), field });
  });

  return { columns, mapped, unmapped };
}
