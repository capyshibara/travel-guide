/**
 * Classifying free text into the design system's fixed vocabularies.
 *
 * When nothing matches we return the neutral member and keep the original text, so
 * the UI can show what the workbook actually said instead of a wrong label.
 */
import type { ActivityType, BookingStatus, BookingUrgency } from '../domain/types';
import { ACTIVITY_TYPE_ALIASES, BOOKING_STATUS_ALIASES, BOOKING_URGENCY_ALIASES } from './aliases';
import { cleanText, normalizeKey } from './normalize';

function classify<T extends string>(
  text: string,
  table: Record<string, readonly string[]>,
  fallback: T,
): { value: T; matched: boolean } {
  const key = normalizeKey(text);
  if (!key) return { value: fallback, matched: false };

  for (const [value, aliases] of Object.entries(table)) {
    if (aliases.some((a) => normalizeKey(a) === key)) return { value: value as T, matched: true };
  }
  for (const [value, aliases] of Object.entries(table)) {
    if (aliases.some((a) => key.startsWith(normalizeKey(a)) || normalizeKey(a).startsWith(key))) {
      return { value: value as T, matched: true };
    }
  }
  for (const [value, aliases] of Object.entries(table)) {
    if (aliases.some((a) => normalizeKey(a).length >= 4 && key.includes(normalizeKey(a)))) {
      return { value: value as T, matched: true };
    }
  }
  return { value: fallback, matched: false };
}

const TYPE_LABELS: Record<ActivityType, string> = {
  flight: 'Flight',
  transport: 'Transport',
  food: 'Food',
  hotel: 'Hotel',
  sleep: 'Sleep',
  sightseeing: 'Sightseeing',
  tour: 'Tour',
  prep: 'Prep',
  arrival: 'Arrival',
  rest: 'Rest',
  other: 'Activity',
};

export function activityTypeLabel(type: ActivityType): string {
  return TYPE_LABELS[type];
}

/**
 * Classify a segment type. When the workbook's own segment column is blank we look at
 * the activity description, which usually names the mode ("Flight HAN → SIN").
 */
export function classifyActivityType(
  segmentText: string,
  activityText: string,
): { type: ActivityType; label: string; matched: boolean } {
  const primary = classify<ActivityType>(segmentText, ACTIVITY_TYPE_ALIASES, 'other');
  if (primary.matched) {
    // Keep the workbook's own wording as the label when it had one.
    const label = cleanText(segmentText) || TYPE_LABELS[primary.value];
    return { type: primary.value, label: titleCaseFirst(label), matched: true };
  }

  const secondary = classifyFromDescription(activityText);
  if (secondary) return { type: secondary, label: TYPE_LABELS[secondary], matched: false };

  const label = cleanText(segmentText);
  return { type: 'other', label: label ? titleCaseFirst(label) : TYPE_LABELS.other, matched: false };
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
