/**
 * Optional dedicated budget sheet -> BudgetEntry[].
 *
 * Most workbooks carry costs on the itinerary instead; when they do, `buildTrip`
 * derives budget entries from itinerary rows and this mapper is not used.
 */
import type { BudgetEntry, RowOrigin } from '../../domain/types';
import type { BudgetField } from '../aliases';
import { BUDGET_ALIASES } from '../aliases';
import { readCurrency, readMoney, readText } from '../cellValues';
import type { Grid } from '../grid';
import { findHeaderRow, headerRowValues, isRowBlank } from '../grid';
import type { IssueCollector } from '../issues';
import { resolveHeaders } from '../normalize';
import type { TravelerRegistry } from '../travelers';
import { stableId } from '../../lib/id';

export interface BudgetMapResult {
  entries: BudgetEntry[];
  mapped: { header: string; field: string }[];
  unmapped: string[];
}

const FLIGHT_WORDS = /\b(flight|flights|airfare|air fare|plane|airline)\b/i;
const TOTAL_ROW = /^(total|subtotal|grand total|sum)\b/i;

export function mapBudgetSheet(
  grid: Grid,
  registry: TravelerRegistry,
  issues: IssueCollector,
  defaults: { currency?: string },
): BudgetMapResult {
  const headerRow = findHeaderRow(grid, 2);
  if (headerRow === null) {
    issues.add({
      kind: 'missing-field',
      title: `No column headers found in "${grid.name}"`,
      detail: 'This sheet looked like a budget but no header row could be identified, so nothing was imported from it.',
    });
    return { entries: [], mapped: [], unmapped: [] };
  }

  const headers = headerRowValues(grid, headerRow);
  const { columns, mapped, unmapped } = resolveHeaders<BudgetField>(headers, BUDGET_ALIASES);
  const entries: BudgetEntry[] = [];

  for (let r = headerRow + 1; r < grid.rows.length; r += 1) {
    const row = grid.rows[r];
    if (!row || isRowBlank(row)) continue;

    const excelRow = grid.firstRowNumber + r;
    const origin: RowOrigin = { sheet: grid.name, row: excelRow };
    const cell = (field: BudgetField) => {
      const index = columns[field];
      return index === undefined ? undefined : row[index];
    };

    const label = readText(cell('label'));
    if (!label) continue;
    // Skip the sheet's own total rows so we do not double-count them.
    if (TOTAL_ROW.test(label)) continue;

    const rowCurrency = readCurrency(cell('currency')) ?? defaults.currency;
    const base = readMoney(cell('base'), rowCurrency);
    const fallback = readMoney(cell('fallback'), rowCurrency);
    if (!base.ok && !fallback.ok) continue;

    const category = readText(cell('category')) || 'Other';
    const entry: BudgetEntry = {
      id: stableId('budget', [grid.name, label, excelRow]),
      label,
      category,
      scope: registry.resolve(readText(cell('traveler'))),
      isFlight: FLIGHT_WORDS.test(`${label} ${category}`),
      origin,
    };
    if (base.ok) entry.base = base.value;
    if (fallback.ok) entry.fallback = fallback.value;
    entries.push(entry);
  }

  return { entries, mapped, unmapped };
}
