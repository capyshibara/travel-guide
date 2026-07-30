/**
 * Sources sheet -> Source[].
 *
 * A source's `kind` is inferred from what the row actually contains, never asserted:
 * a usable URL makes it 'verified', wording like "assumed" or "estimate" makes it
 * 'assumption', and a link that will not open makes it 'recheck'.
 */
import type { RowOrigin, Source } from '../../domain/types';
import type { SourceField } from '../aliases';
import { SOURCE_ALIASES } from '../aliases';
import { readText, readUrl } from '../cellValues';
import { looksLikeBrokenUrl } from '../coerce';
import type { Grid } from '../grid';
import { findHeaderRow, headerRowValues, isRowBlank } from '../grid';
import type { IssueCollector } from '../issues';
import { normalizeKey, resolveHeaders } from '../normalize';
import { stableId } from '../../lib/id';

export interface SourceMapResult {
  items: Source[];
  mapped: { header: string; field: string }[];
  unmapped: string[];
}

const ASSUMPTION_WORDS = /\b(assum|estimat|approx|guess|likely|probably|expect|should be|around|roughly|tbc|tbd)/i;
const RECHECK_WORDS = /\b(unconfirmed|uncertain|recheck|re-check|verify|check again|out of date|outdated|2024|may have changed)/i;

export function mapSourceSheet(grid: Grid, issues: IssueCollector): SourceMapResult {
  const headerRow = findHeaderRow(grid, 2);
  if (headerRow === null) {
    issues.add({ kind: 'missing-field', message: { id: 'noHeaders', sheet: grid.name, role: 'sources' } });
    return { items: [], mapped: [], unmapped: [] };
  }

  const headers = headerRowValues(grid, headerRow);
  const { columns, mapped, unmapped } = resolveHeaders<SourceField>(headers, SOURCE_ALIASES);
  const items: Source[] = [];

  for (let r = headerRow + 1; r < grid.rows.length; r += 1) {
    const row = grid.rows[r];
    if (!row || isRowBlank(row)) continue;

    const excelRow = grid.firstRowNumber + r;
    const origin: RowOrigin = { sheet: grid.name, row: excelRow };
    const cell = (field: SourceField) => {
      const index = columns[field];
      return index === undefined ? undefined : row[index];
    };

    const topic = readText(cell('topic'));
    const fact = readText(cell('fact'));
    const notes = readText(cell('notes'));
    if (!topic && !fact) continue;

    const urlCell = cell('url');
    const { url } = readUrl(urlCell);
    const urlText = readText(urlCell);
    const broken = !url && looksLikeBrokenUrl(urlText);
    if (broken) {
      issues.add({
        kind: 'broken-url',
        message: { id: 'brokenUrlSource', value: urlText, sheet: grid.name, row: excelRow },
        origin,
      });
    }

    const declared = normalizeKey(readText(cell('kind')));
    const haystack = `${fact} ${notes} ${readText(cell('kind'))}`;

    let kind: Source['kind'];
    if (declared.includes('verif') || declared.includes('confirm')) kind = 'verified';
    else if (declared.includes('assum') || declared.includes('estimat')) kind = 'assumption';
    else if (declared.includes('recheck') || declared.includes('uncertain') || declared.includes('unconfirm')) kind = 'recheck';
    else if (broken || RECHECK_WORDS.test(haystack)) kind = 'recheck';
    else if (ASSUMPTION_WORDS.test(haystack)) kind = 'assumption';
    else if (url) kind = 'verified';
    else kind = 'assumption';

    const sourceKey = `${grid.name}|${topic}|${fact}`;
    const source: Source = {
      id: stableId('src', [sourceKey, excelRow]),
      topic,
      fact: fact || notes,
      kind,
      relatedItemIds: [],
    };
    if (url) source.url = url;
    if (notes) source.notes = notes;
    // Keep an unusable link visible rather than dropping what the author wrote. The
    // UI labels it; only the author's own text is stored.
    if (broken) source.brokenUrlText = urlText;

    items.push(source);
  }

  return { items, mapped, unmapped };
}
