/**
 * Booking Options sheet -> BookingItem[].
 */
import type { BookingItem, RowOrigin } from '../../domain/types';
import type { BookingField } from '../aliases';
import { BOOKING_ALIASES } from '../aliases';
import { classifyBookingStatus, classifyBookingUrgency } from '../classify';
import { readCurrency, readMoney, readText, readUrl } from '../cellValues';
import { looksLikeBrokenUrl } from '../coerce';
import type { Grid } from '../grid';
import { findHeaderRow, headerRowValues, isRowBlank } from '../grid';
import type { IssueCollector } from '../issues';
import { resolveHeaders } from '../normalize';
import type { TravelerRegistry } from '../travelers';
import { stableId } from '../../lib/id';

export interface BookingMapResult {
  items: BookingItem[];
  mapped: { header: string; field: string }[];
  unmapped: string[];
}

export function mapBookingSheet(
  grid: Grid,
  registry: TravelerRegistry,
  issues: IssueCollector,
  defaults: { currency?: string },
): BookingMapResult {
  const headerRow = findHeaderRow(grid, 2);
  if (headerRow === null) {
    issues.add({
      kind: 'missing-field',
      title: `No column headers found in "${grid.name}"`,
      detail: 'This sheet looked like a booking list but no header row could be identified, so nothing was imported from it.',
    });
    return { items: [], mapped: [], unmapped: [] };
  }

  const headers = headerRowValues(grid, headerRow);
  const { columns, mapped, unmapped } = resolveHeaders<BookingField>(headers, BOOKING_ALIASES);
  const items: BookingItem[] = [];

  for (let r = headerRow + 1; r < grid.rows.length; r += 1) {
    const row = grid.rows[r];
    if (!row || isRowBlank(row)) continue;

    const excelRow = grid.firstRowNumber + r;
    const origin: RowOrigin = { sheet: grid.name, row: excelRow };
    const cell = (field: BookingField) => {
      const index = columns[field];
      return index === undefined ? undefined : row[index];
    };

    const itemText = readText(cell('item'));
    if (!itemText) continue;

    const rowCurrency = readCurrency(cell('currency')) ?? defaults.currency;
    const target = readMoney(cell('targetPrice'), rowCurrency);
    const fallback = readMoney(cell('fallbackPrice'), rowCurrency);

    const timingText = readText(cell('timing'));
    const urgency = classifyBookingUrgency(timingText);
    if (timingText && !urgency.matched) {
      issues.add({
        kind: 'unrecognized-column',
        title: 'Booking timing not recognized',
        detail: `"${timingText}" in ${grid.name} row ${excelRow} did not match a known booking window, so "${itemText}" is grouped under "No action required". The original wording is shown on the item.`,
        origin,
      });
    }

    const statusText = readText(cell('status'));
    const status = classifyBookingStatus(statusText);
    if (statusText && !status.matched) {
      issues.add({
        kind: 'unrecognized-column',
        title: 'Booking status not recognized',
        detail: `"${statusText}" in ${grid.name} row ${excelRow} did not match a known status, so "${itemText}" starts as Not started.`,
        origin,
      });
    }

    const urlCell = cell('url');
    const { url } = readUrl(urlCell);
    if (!url && urlCell && looksLikeBrokenUrl(readText(urlCell))) {
      issues.add({
        kind: 'broken-url',
        title: 'Booking link is not usable',
        detail: `"${readText(urlCell)}" in ${grid.name} row ${excelRow} looks like a link but could not be opened.`,
        origin,
      });
    }

    const sourceKey = `${grid.name}|${itemText}`;
    const id = stableId('book', [sourceKey, excelRow]);

    const item: BookingItem = {
      id,
      sourceKey,
      item: itemText,
      urgency: urgency.value,
      importedStatus: status.value,
      scope: registry.resolve(readText(cell('traveler'))),
      origin,
    };

    const plan = readText(cell('plan'));
    if (plan) item.recommendedPlan = plan;
    if (target.ok) item.targetPrice = target.value;
    if (fallback.ok) item.fallbackPrice = fallback.value;
    const channel = readText(cell('channel'));
    if (channel) item.channel = channel;
    if (timingText) item.timingText = timingText;
    const confirmation = readText(cell('confirmation'));
    if (confirmation) item.confirmation = confirmation;
    if (url) item.url = url;

    items.push(item);
  }

  return { items, mapped, unmapped };
}
