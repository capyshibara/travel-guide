/**
 * Itinerary sheet -> ItineraryItem[].
 *
 * This is the sheet that matters most, so it is also the most forgiving: a row only
 * needs *something* describing an activity to be kept. Every field we could not read
 * becomes an issue rather than a fabricated value.
 */
import type { ItineraryItem, RowOrigin, TravelerScope } from '../../domain/types';
import type { ItineraryField } from '../aliases';
import { ITINERARY_ALIASES } from '../aliases';
import { bookingActionIsRequired, classifyActivityType } from '../classify';
import { MINUTES_PER_DAY } from '../coerce';
import { readCurrency, readDate, readDurationMinutes, readMoney, readText, readTime, readUrl } from '../cellValues';
import type { Grid } from '../grid';
import { findHeaderRow, headerRowValues, isRowBlank } from '../grid';
import type { IssueCollector } from '../issues';
import { looksLikeBrokenUrl } from '../coerce';
import { cleanText, resolveHeaders } from '../normalize';
import type { TravelerRegistry } from '../travelers';
import { stableId } from '../../lib/id';

export interface ItineraryMapResult {
  items: ItineraryItem[];
  mapped: { header: string; field: string }[];
  unmapped: string[];
  headerRow: number | null;
}

const PRACTICAL_FIELDS: { field: ItineraryField; label: string }[] = [
  { field: 'food', label: 'Food' },
  { field: 'toilet', label: 'Toilet' },
  { field: 'shower', label: 'Shower' },
  { field: 'sleep', label: 'Sleep' },
  { field: 'recovery', label: 'Rest & recovery' },
];

export function mapItinerarySheet(
  grid: Grid,
  registry: TravelerRegistry,
  issues: IssueCollector,
  defaults: { currency?: string },
): ItineraryMapResult {
  // One column is enough to accept a header here: a sheet with nothing but an
  // "Activity" column still gives the traveler a usable list, and `findHeaderRow`
  // scores by row width, so a wide real header still beats a one-cell title row.
  const headerRow = findHeaderRow(grid, 1);
  if (headerRow === null) {
    issues.add({
      kind: 'missing-field',
      title: `No column headers found in "${grid.name}"`,
      detail: 'This sheet was detected as an itinerary but no header row could be identified, so no activities were imported from it.',
      severity: 'critical',
    });
    return { items: [], mapped: [], unmapped: [], headerRow: null };
  }

  const headers = headerRowValues(grid, headerRow);
  const { columns, mapped, unmapped } = resolveHeaders<ItineraryField>(headers, ITINERARY_ALIASES);

  if (columns.activity === undefined && columns.route === undefined) {
    issues.add({
      kind: 'missing-field',
      title: `No activity column in "${grid.name}"`,
      detail: 'Wayfare could not find a column describing what happens (tried: activity, description, item, title). Activities were imported using whatever other columns matched.',
    });
  }

  const items: ItineraryItem[] = [];
  /** The last date we successfully read, so rows under a merged day header inherit it. */
  let carriedDate: string | null = null;
  const seenKeys = new Map<string, number>();

  for (let r = headerRow + 1; r < grid.rows.length; r += 1) {
    const row = grid.rows[r];
    if (!row || isRowBlank(row)) continue;

    const excelRow = grid.firstRowNumber + r;
    const origin: RowOrigin = { sheet: grid.name, row: excelRow };
    const cell = (field: ItineraryField) => {
      const index = columns[field];
      return index === undefined ? undefined : row[index];
    };

    const activityText = readText(cell('activity'));
    const routeText = readText(cell('route'));
    const notesText = readText(cell('notes'));

    // A row with no activity, route or note is a spacer, not data.
    if (!activityText && !routeText && !notesText) continue;

    // --- date -------------------------------------------------------------
    const dateOutcome = readDate(cell('date'), grid.date1904);
    let date: string | null;
    if (dateOutcome.ok) {
      date = dateOutcome.value;
      carriedDate = date;
    } else if (dateOutcome.reason === 'invalid') {
      issues.add({
        kind: 'invalid-date',
        title: 'Date could not be read',
        detail: `"${readText(cell('date'))}" in ${grid.name} row ${excelRow} is not a date Wayfare recognizes. The activity was kept but placed under the previous day.`,
        origin,
      });
      date = carriedDate;
    } else {
      // Blank date: inherit the current day, which is how merged day headers work.
      date = carriedDate;
    }

    // --- times ------------------------------------------------------------
    const startOutcome = readTime(cell('start'));
    const endOutcome = readTime(cell('end'));
    const start = startOutcome.ok ? startOutcome.value : null;
    let end = endOutcome.ok ? endOutcome.value : null;

    if (startOutcome.ok === false && startOutcome.reason === 'invalid') {
      issues.add({
        kind: 'invalid-date',
        title: 'Start time could not be read',
        detail: `"${readText(cell('start'))}" in ${grid.name} row ${excelRow} is not a time Wayfare recognizes.`,
        origin,
      });
    }
    if (endOutcome.ok === false && endOutcome.reason === 'invalid') {
      issues.add({
        kind: 'invalid-date',
        title: 'End time could not be read',
        detail: `"${readText(cell('end'))}" in ${grid.name} row ${excelRow} is not a time Wayfare recognizes.`,
        origin,
      });
    }

    // --- duration and midnight crossing -----------------------------------
    const durationOutcome = readDurationMinutes(cell('duration'));
    let durationMinutes: number | null = durationOutcome.ok ? durationOutcome.value : null;
    let durationDerived = false;
    let crossesMidnight = false;

    if (start !== null && end !== null) {
      if (end < start) {
        // An end before the start is an overnight activity, not an error — the Bromo
        // trek that leaves at 23:40 and returns at 06:15 is the product's own example.
        crossesMidnight = true;
        const overnight = end + MINUTES_PER_DAY - start;
        if (durationMinutes === null) {
          durationMinutes = overnight;
          durationDerived = true;
        } else if (Math.abs(durationMinutes - overnight) > 60) {
          issues.add({
            kind: 'time-conflict',
            title: 'Duration does not match the times',
            detail: `${grid.name} row ${excelRow} runs past midnight (${readText(cell('start'))} → ${readText(cell('end'))}) but states a duration of ${readText(cell('duration'))}. Both values were kept as written.`,
            origin,
          });
        }
      } else if (durationMinutes === null) {
        durationMinutes = end - start;
        durationDerived = true;
      }
    } else if (start !== null && durationMinutes !== null && end === null) {
      const computedEnd = start + durationMinutes;
      end = computedEnd % MINUTES_PER_DAY;
      crossesMidnight = computedEnd >= MINUTES_PER_DAY;
    }

    // --- money ------------------------------------------------------------
    const rowCurrency = readCurrency(cell('currency')) ?? defaults.currency;
    const baseOutcome = readMoney(cell('baseCost'), rowCurrency);
    const fallbackOutcome = readMoney(cell('fallbackCost'), rowCurrency);
    const convertedOutcome = readMoney(cell('convertedCost'), undefined);

    if (!baseOutcome.ok && baseOutcome.reason === 'invalid') {
      issues.add({
        kind: 'invalid-number',
        title: 'Cost could not be read',
        detail: `"${readText(cell('baseCost'))}" in ${grid.name} row ${excelRow} is not an amount Wayfare recognizes, so it is not counted in the budget.`,
        origin,
      });
    }
    if (columns.currency !== undefined && readText(cell('currency')) && rowCurrency === undefined) {
      issues.add({
        kind: 'invalid-currency',
        title: 'Currency not recognized',
        detail: `"${readText(cell('currency'))}" in ${grid.name} row ${excelRow} is not a currency code Wayfare recognizes. Amounts are shown without conversion.`,
        origin,
      });
    }

    // --- source url -------------------------------------------------------
    const sourceCell = cell('sourceUrl');
    const { url } = readUrl(sourceCell);
    if (!url && sourceCell && looksLikeBrokenUrl(readText(sourceCell))) {
      issues.add({
        kind: 'broken-url',
        title: 'Source link is not usable',
        detail: `"${readText(sourceCell)}" in ${grid.name} row ${excelRow} looks like a link but could not be opened. The text was kept in the activity's notes.`,
        origin,
      });
    }

    // --- traveler ---------------------------------------------------------
    const travelerText = readText(cell('traveler'));
    const scope: TravelerScope = registry.resolve(travelerText);

    // --- type -------------------------------------------------------------
    const segmentText = readText(cell('segmentType'));
    const classified = classifyActivityType(segmentText, activityText);
    if (segmentText && !classified.matched) {
      issues.add({
        kind: 'unrecognized-column',
        title: 'Segment type not recognized',
        detail: `"${segmentText}" in ${grid.name} row ${excelRow} did not match a known activity type. It is shown as written, with a generic icon.`,
        origin,
        severity: 'info',
      });
    }

    // --- route ------------------------------------------------------------
    const { from, to } = splitRoute(routeText);
    const bookingAction = readText(cell('booking'));

    const practical = PRACTICAL_FIELDS.map(({ field, label }) => ({
      label,
      value: readText(cell(field)),
    })).filter((entry) => entry.value.length > 0);

    const title = activityText || routeText || notesText;
    const sourceKey = `${grid.name}|${date ?? ''}|${readText(cell('start'))}|${title}`;
    const duplicateOf = seenKeys.get(sourceKey);
    if (duplicateOf !== undefined) {
      issues.add({
        kind: 'duplicate',
        title: 'Duplicate activity',
        detail: `${grid.name} row ${excelRow} repeats "${title}" at the same date and time as row ${duplicateOf}. Both are shown.`,
        origin,
      });
    } else {
      seenKeys.set(sourceKey, excelRow);
    }

    const id = stableId('act', [sourceKey, excelRow]);

    if (scope.kind === 'unassigned') {
      issues.add({
        kind: 'missing-traveler',
        title: 'No traveler assigned',
        detail: `"${title}" (${grid.name} row ${excelRow}) does not say which traveler it is for. It is shown for everyone and excluded from per-traveler totals.`,
        origin,
        relatedItemId: id,
      });
    }

    const item: ItineraryItem = {
      id,
      sourceKey,
      date,
      start,
      end,
      durationMinutes,
      durationDerived,
      crossesMidnight,
      type: classified.type,
      typeLabel: classified.label,
      activity: title,
      practical,
      bookingRequired: bookingActionIsRequired(bookingAction),
      scope,
      origin,
    };

    const startText = readText(cell('start'));
    if (startText) item.startText = startText;
    const endText = readText(cell('end'));
    if (endText) item.endText = endText;
    const country = readText(cell('country'));
    if (country) item.country = country;
    const city = readText(cell('city'));
    if (city) item.city = city;
    if (segmentText && !classified.matched) item.rawType = segmentText;
    if (from) item.routeFrom = from;
    if (to) item.routeTo = to;
    if (!to && from) item.place = from;
    if (notesText) item.notes = notesText;
    if (bookingAction) item.bookingAction = bookingAction;
    if (baseOutcome.ok) item.baseCost = baseOutcome.value;
    if (fallbackOutcome.ok) item.fallbackCost = fallbackOutcome.value;
    if (convertedOutcome.ok) item.convertedBase = convertedOutcome.value;
    if (url) item.sourceUrl = url;

    items.push(item);
  }

  if (items.length === 0) {
    issues.add({
      kind: 'empty-sheet',
      title: `No activities found in "${grid.name}"`,
      detail: 'The sheet was detected as an itinerary but every row below the header was empty.',
    });
  }

  return { items, mapped, unmapped, headerRow };
}

const ROUTE_SEPARATOR = /\s*(?:→|->|–>|=>|>|~>|\bto\b|—|–)\s*/i;

/** Split "Hanoi (HAN) → Singapore (SIN)" into its two ends. */
export function splitRoute(text: string): { from: string; to: string | null } {
  const cleaned = cleanText(text);
  if (!cleaned) return { from: '', to: null };
  const parts = cleaned.split(ROUTE_SEPARATOR).map((p) => cleanText(p)).filter(Boolean);
  if (parts.length < 2) return { from: cleaned, to: null };
  return { from: parts[0]!, to: parts.slice(1).join(' → ') };
}
