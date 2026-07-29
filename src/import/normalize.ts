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
 * Resolve a header against an alias table.
 *
 * Matching runs in three passes, most precise first, so that a sheet with both
 * "Cost" and "Base cost" columns does not assign both to the same field:
 *   1. exact normalized equality
 *   2. header starts with an alias
 *   3. header contains an alias (only for aliases of 4+ characters, so short
 *      aliases like "to" or "ccy" cannot swallow unrelated headers)
 */
export function matchAlias<F extends string>(
  header: string,
  aliases: Readonly<Record<F, readonly string[]>>,
): F | null {
  const key = normalizeKey(header);
  if (!key) return null;
  const entries = Object.entries(aliases) as [F, readonly string[]][];

  for (const [field, list] of entries) {
    if (list.some((a) => normalizeKey(a) === key)) return field;
  }
  for (const [field, list] of entries) {
    if (list.some((a) => key.startsWith(normalizeKey(a)))) return field;
  }
  for (const [field, list] of entries) {
    if (list.some((a) => normalizeKey(a).length >= 4 && key.includes(normalizeKey(a)))) return field;
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
