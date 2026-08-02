/**
 * Classifying free text into the design system's fixed vocabularies.
 *
 * When nothing matches we return the neutral member and keep the original text, so
 * the UI can show what the workbook actually said instead of a wrong label.
 */
import type { ActivityType, BookingStatus, BookingUrgency } from '../domain/types';
import { ACTIVITY_TYPE_ALIASES, BOOKING_STATUS_ALIASES, BOOKING_URGENCY_ALIASES } from './aliases';
import { cleanText, matchAlias, normalizeKey } from './normalize';

/**
 * Classify a short piece of free text into one bucket of a fixed vocabulary.
 *
 * Delegates to `matchAlias`'s whole-word matching, so "Already booked" cannot match
 * "ready" (hiding inside "al-ready-booked") the way raw substring matching once did.
 */
function classify<T extends string>(
  text: string,
  table: Record<string, readonly string[]>,
  fallback: T,
): { value: T; matched: boolean } {
  if (!normalizeKey(text)) return { value: fallback, matched: false };
  const field = matchAlias(text, table);
  return field === null ? { value: fallback, matched: false } : { value: field as T, matched: true };
}

/**
 * Classify a segment type. When the workbook's own segment column is blank we look at
 * the activity description, which usually names the mode ("Flight HAN → SIN").
 *
 * `label` is the workbook's own wording, or null when we inferred the type ourselves —
 * the UI then shows a translated label for `type` rather than an English one we made up.
 */
export function classifyActivityType(
  segmentText: string,
  activityText: string,
): { type: ActivityType; label: string | null; matched: boolean } {
  const written = cleanText(segmentText);
  const primary = classify<ActivityType>(segmentText, ACTIVITY_TYPE_ALIASES, 'other');
  if (primary.matched) {
    return { type: primary.value, label: written ? titleCaseFirst(written) : null, matched: true };
  }

  const secondary = classifyFromDescription(activityText);
  if (secondary) return { type: secondary, label: null, matched: false };

  return { type: 'other', label: written ? titleCaseFirst(written) : null, matched: false };
}

/** Word-boundary scan of a free-text description for a mode keyword. */
function classifyFromDescription(text: string): ActivityType | null {
  const words = cleanText(text).toLowerCase().split(/[^a-z]+/).filter(Boolean);
  if (words.length === 0) return null;
  const wordSet = new Set(words);
  for (const [type, aliases] of Object.entries(ACTIVITY_TYPE_ALIASES)) {
    if (aliases.some((a) => wordSet.has(a))) return type as ActivityType;
  }
  return null;
}

function titleCaseFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function classifyBookingStatus(text: string): { value: BookingStatus; matched: boolean } {
  return classify<BookingStatus>(text, BOOKING_STATUS_ALIASES, 'not-started');
}

const URGENCY_FROM_DAYS = (days: number): BookingUrgency => {
  if (days <= 0) return 'now';
  if (days <= 3) return '1-3';
  if (days <= 14) return '7-14';
  return 'now';
};

/**
 * Read booking timing. Numeric lead times ("book 10 days before") are bucketed
 * before falling back to the phrase aliases.
 */
export function classifyBookingUrgency(text: string): { value: BookingUrgency; matched: boolean } {
  const cleaned = cleanText(text);
  if (!cleaned) return { value: 'none', matched: false };

  // Workbooks often reuse the timing column to record that something is already done
  // ("Booked", "Confirmed"). That is a status, not an unreadable window — nothing is
  // left to book, so it belongs under "No action required" without a warning.
  const asStatus = classifyBookingStatus(cleaned);
  if (asStatus.matched && (asStatus.value === 'booked' || asStatus.value === 'confirmed')) {
    return { value: 'none', matched: true };
  }

  const dayRange = /(\d+)\s*(?:[-–—to]+\s*(\d+))?\s*(?:day|days|hari|ngay)\b/i.exec(cleaned);
  if (dayRange && /befor|ahead|prior|sebelum|truoc/i.test(cleaned)) {
    const low = Number(dayRange[1]);
    const high = dayRange[2] === undefined ? low : Number(dayRange[2]);
    return { value: URGENCY_FROM_DAYS(Math.max(low, high)), matched: true };
  }
  if (/(\d+)\s*week/i.test(cleaned) && /befor|ahead|prior/i.test(cleaned)) {
    return { value: '7-14', matched: true };
  }
  return classify<BookingUrgency>(cleaned, BOOKING_URGENCY_ALIASES, 'none');
}

/** Does this booking-action text describe something the traveler must actually do? */
export function bookingActionIsRequired(text: string): boolean {
  const cleaned = cleanText(text);
  if (!cleaned) return false;
  if (/^(no|none|n\/?a|not required|no booking|nothing|free|walk[- ]?in)\b/i.test(cleaned)) return false;
  return /\b(book|reserve|buy|purchase|pay|arrange|confirm|apply|order|register|ticket)/i.test(cleaned);
}
