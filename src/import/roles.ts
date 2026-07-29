/**
 * Deciding what each worksheet is for.
 *
 * Sheet names are unreliable — the brief's own example has the sources sheet named
 * "Sheet4" — so a name match is treated as strong evidence and a header fingerprint
 * as the fallback. Confidence is surfaced in the import summary rather than hidden.
 */
import type { Confidence, SheetRole } from '../domain/types';
import {
  SHEET_ROLE_ALIASES,
  ITINERARY_ALIASES,
  BOOKING_ALIASES,
  SOURCE_ALIASES,
  BUDGET_ALIASES,
  OVERVIEW_ALIASES,
} from './aliases';
import { matchAlias, normalizeKey } from './normalize';

export interface RoleGuess {
  role: SheetRole;
  confidence: Confidence;
}

/** Match a sheet name against the role aliases. */
export function roleFromSheetName(name: string): SheetRole | null {
  return matchAlias(name, SHEET_ROLE_ALIASES);
}

/** How many of a role's alias groups are represented in this header row. */
function fingerprintScore(headers: readonly string[], aliases: Record<string, readonly string[]>): number {
  const keys = headers.map(normalizeKey).filter(Boolean);
  let hits = 0;
  for (const list of Object.values(aliases)) {
    const normalized = list.map(normalizeKey);
    if (keys.some((k) => normalized.some((a) => k === a || k.startsWith(a) || (a.length >= 4 && k.includes(a))))) {
      hits += 1;
    }
  }
  return hits;
}

/** Columns that only one kind of sheet realistically has. */
const SIGNATURE_COLUMNS: Record<Exclude<SheetRole, 'overview' | 'unknown'>, readonly string[]> = {
  itinerary: ['date', 'starttime', 'start', 'endtime', 'day', 'tanggal', 'ngay', 'jam'],
  bookings: ['bookingtiming', 'bookingchannel', 'status', 'confirmation', 'recommendedplan', 'whentobook'],
  sources: ['topic', 'supportedfact', 'supportedfactorassumption', 'assumption', 'claim'],
  budget: ['category', 'kategori', 'expense', 'lineitem'],
};

/**
 * Score the header row against each role's column vocabulary.
 *
 * Scoring is by raw hit count, not by the fraction of a role's aliases matched: the
 * budget role defines 7 alias groups and the itinerary role 23, so a fraction would
 * let a budget sheet's 7/7 beat an itinerary's 16/23 on an obvious itinerary. A bonus
 * is added for columns only one kind of sheet has (a date column means itinerary; a
 * booking-timing column means bookings), which is what actually separates them.
 */
export function roleFromHeaders(headers: readonly string[]): { role: SheetRole; ratio: number } {
  const keys = headers.map(normalizeKey).filter(Boolean);
  const candidates = [
    { role: 'itinerary' as const, aliases: ITINERARY_ALIASES },
    { role: 'bookings' as const, aliases: BOOKING_ALIASES },
    { role: 'sources' as const, aliases: SOURCE_ALIASES },
    { role: 'budget' as const, aliases: BUDGET_ALIASES },
  ].map(({ role, aliases }) => {
    const hits = fingerprintScore(headers, aliases);
    const signatures = SIGNATURE_COLUMNS[role].filter((sig) => keys.includes(sig)).length;
    return {
      role,
      hits,
      score: hits + signatures * 3,
      ratio: hits / Object.keys(aliases).length,
    };
  });

  candidates.sort((a, b) => b.score - a.score || b.ratio - a.ratio);
  const best = candidates[0]!;
  // A sheet needs at least three recognized columns before a fingerprint means anything.
  if (best.hits < 3 || best.ratio < 0.25) return { role: 'unknown', ratio: best.ratio };
  return { role: best.role, ratio: best.ratio };
}

/**
 * Two-column label/value layouts (the usual Overview shape) have no header row to
 * fingerprint, so they are detected structurally instead.
 *
 * Shape alone is not enough — any narrow scratch sheet has the same shape — so the
 * caller also has to find labels it recognizes before treating the sheet as an
 * Overview. See `decideRole`.
 */
export function looksLikeKeyValueSheet(rows: readonly (readonly { text: string; value: unknown }[])[]): boolean {
  const populated = rows.filter((row) => row.some((cell) => cell.value !== null && cell.value !== ''));
  if (populated.length < 2) return false;
  const narrow = populated.filter(
    (row) => row.filter((cell) => cell.value !== null && cell.value !== '').length <= 3,
  );
  return narrow.length / populated.length >= 0.7;
}

/** How many first-column labels look like Overview fields. */
export function countOverviewLabels(rows: readonly (readonly { text: string; value: unknown }[])[]): number {
  let hits = 0;
  for (const row of rows) {
    const label = row.find((cell) => cell.value !== null && cell.text !== '');
    if (!label) continue;
    if (matchAlias(label.text, OVERVIEW_ALIASES) !== null) hits += 1;
    else if (/^(?:traveler|traveller)\s*[a-z0-9]/i.test(label.text)) hits += 1;
  }
  return hits;
}

/**
 * Combine the name signal and the header signal into a final role plus a confidence
 * we can honestly show the traveler.
 */
export function decideRole(
  sheetName: string,
  headers: readonly string[],
  keyValueShaped: boolean,
  overviewLabelHits: number,
): RoleGuess {
  const byName = roleFromSheetName(sheetName);
  const byHeaders = roleFromHeaders(headers);
  // A key/value sheet only counts as an Overview if we actually recognize some of
  // its labels; otherwise a two-column scratch sheet would silently become one.
  const isOverviewShaped = keyValueShaped && overviewLabelHits >= 2;

  if (byName && byName === byHeaders.role) return { role: byName, confidence: 'high' };
  if (byName === 'overview' && isOverviewShaped) return { role: 'overview', confidence: 'high' };
  if (isOverviewShaped && byHeaders.role === 'unknown') {
    return { role: 'overview', confidence: byName === 'overview' ? 'high' : 'medium' };
  }
  if (byName && byHeaders.role === 'unknown') return { role: byName, confidence: 'medium' };
  if (byName && byHeaders.role !== 'unknown') {
    // Name and content disagree. Content wins — a sheet named "Plan" full of
    // booking columns is a booking sheet — but say so with lower confidence.
    return { role: byHeaders.role, confidence: 'low' };
  }
  if (byHeaders.role !== 'unknown') {
    return { role: byHeaders.role, confidence: byHeaders.ratio >= 0.4 ? 'medium' : 'low' };
  }
  return { role: 'unknown', confidence: 'low' };
}
