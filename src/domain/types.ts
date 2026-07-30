/**
 * Normalized trip model.
 *
 * This is the only shape the UI knows about. Everything workbook-shaped —
 * sheet names, header aliases, Excel serial dates, merged cells — is resolved in
 * `src/import` and never reaches a component.
 *
 * Two conventions matter throughout:
 *
 * - Dates are naive local calendar dates as `YYYY-MM-DD`. Excel has no timezone;
 *   converting through `Date` in UTC is what makes workbook dates land a day early
 *   for users west of Greenwich, so we never do that.
 * - Times are minutes from midnight (`0`–`1439`), with the original cell text kept
 *   for display so we never re-format something the traveler wrote deliberately.
 */

/** A `YYYY-MM-DD` calendar date with no timezone attached. */
export type IsoDate = string;

/** Minutes from midnight, 0–1439. */
export type MinuteOfDay = number;

export type PracticalField = 'food' | 'toilet' | 'shower' | 'sleep' | 'recovery';

export type ActivityType =
  | 'flight'
  | 'transport'
  | 'food'
  | 'hotel'
  | 'sleep'
  | 'sightseeing'
  | 'tour'
  | 'prep'
  | 'arrival'
  | 'rest'
  | 'other';

export type BookingStatus = 'not-started' | 'researching' | 'ready' | 'booked' | 'confirmed';

export type BookingUrgency = 'now' | '7-14' | '1-3' | 'arrival' | 'site' | 'none';

export type CostScenario = 'base' | 'fallback';

/** How confident the importer is about a mapping it inferred. */
export type Confidence = 'high' | 'medium' | 'low';

export interface Money {
  amount: number;
  /** ISO 4217 where recognized, otherwise the workbook's own label. */
  currency: string;
}

export interface Traveler {
  id: string;
  /**
   * Name exactly as the workbook wrote it. Empty when the workbook only gave a
   * traveler count — the UI then renders a translated "Traveler A" style label from
   * `slot`, so the placeholder follows the reader's language.
   */
  name: string;
  /** 1–2 characters for the avatar. */
  initials: string;
  departureCity?: string;
  /** Drives the traveler color system: first traveler is `a`, second `b`, rest cycle. */
  slot: 'a' | 'b' | 'c' | 'd';
  /** True when `name` is our placeholder rather than the workbook's own wording. */
  generatedName: boolean;
}

/** Who an itinerary item or cost belongs to. */
export interface TravelerScope {
  /** Empty means the workbook did not say. */
  travelerIds: string[];
  kind: 'shared' | 'individual' | 'unassigned';
}

export interface Source {
  id: string;
  /** The workbook's own topic. Empty when it gave none — the UI supplies a label. */
  topic: string;
  /** The fact or assumption this source supports. */
  fact: string;
  url?: string;
  notes?: string;
  /** A link that would not parse, kept verbatim so nothing the author wrote is lost. */
  brokenUrlText?: string;
  /** 'verified' when a usable URL is present, else 'assumption'. Never invented. */
  kind: 'verified' | 'assumption' | 'recheck';
  /** Ids of itinerary items / booking items this source was matched to. */
  relatedItemIds: string[];
}

export interface Assumption {
  id: string;
  /** Which heading to show. The detail below it is the workbook's own text. */
  labelKey: 'assumption' | 'recheck' | 'verified' | 'note' | 'exchangeRate';
  detail: string;
  kind: 'assumption' | 'verified' | 'recheck';
}

export interface ItineraryItem {
  id: string;
  /** Stable key derived from the source row, so user state survives re-import. */
  sourceKey: string;
  date: IsoDate | null;
  start: MinuteOfDay | null;
  end: MinuteOfDay | null;
  /** Original cell text, shown verbatim when present. */
  startText?: string;
  endText?: string;
  /** Minutes. Read from the workbook when given, otherwise derived from start/end. */
  durationMinutes: number | null;
  durationDerived: boolean;
  /** End time is on the following calendar day. */
  crossesMidnight: boolean;
  country?: string;
  city?: string;
  type: ActivityType;
  /**
   * The workbook's own wording for the segment type. Absent when we inferred the type
   * ourselves, in which case the UI shows a translated label for `type`.
   */
  typeLabel?: string;
  /** Raw segment-type text from the workbook, kept when we could not classify it. */
  rawType?: string;
  activity: string;
  routeFrom?: string;
  routeTo?: string;
  place?: string;
  notes?: string;
  /**
   * Food / toilet / shower / sleep / recovery notes. The key is ours (and translated
   * on render); the value is the workbook's own text.
   */
  practical: { field: PracticalField; value: string }[];
  bookingAction?: string;
  bookingRequired: boolean;
  baseCost?: Money;
  fallbackCost?: Money;
  convertedBase?: Money;
  convertedFallback?: Money;
  scope: TravelerScope;
  sourceUrl?: string;
  /** Id of a BookingItem this row was matched to. */
  bookingItemId?: string;
  /** Sheet + row this came from, for the Data issues page. */
  origin: RowOrigin;
}

export interface ItineraryDay {
  /** `YYYY-MM-DD`, or `unscheduled` for items with no readable date. */
  id: string;
  date: IsoDate | null;
  /** 1-based position in the trip. */
  dayNumber: number;
  items: ItineraryItem[];
  cities: string[];
  countries: string[];
}

export interface BookingItem {
  id: string;
  sourceKey: string;
  item: string;
  recommendedPlan?: string;
  targetPrice?: Money;
  fallbackPrice?: Money;
  channel?: string;
  /** Original "book 3 days before" style text. */
  timingText?: string;
  urgency: BookingUrgency;
  confirmation?: string;
  url?: string;
  /** Status as read from the workbook — the user's own status lives separately. */
  importedStatus: BookingStatus;
  scope: TravelerScope;
  origin: RowOrigin;
}

/** Categories we derive ourselves, which therefore need translating. */
export type DerivedCategory =
  | 'flights' | 'localTransport' | 'food' | 'lodging' | 'tours' | 'preparation' | 'other';

export interface BudgetEntry {
  id: string;
  label: string;
  /** Set when the category came from a budget sheet — shown verbatim. */
  category?: string;
  /** Set when we derived the category from the activity type — translated on render. */
  categoryKey?: DerivedCategory;
  base?: Money;
  fallback?: Money;
  scope: TravelerScope;
  /** Set when the entry was derived from an itinerary row, enabling a link back. */
  itineraryItemId?: string;
  /** Flights are shown separately from shared trip costs on the Budget page. */
  isFlight: boolean;
  origin: RowOrigin;
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  note?: string;
}

export interface RowOrigin {
  sheet: string;
  /** 1-based row number as it appears in Excel. */
  row: number;
}

export type ImportIssueKind =
  | 'missing-field'
  | 'unrecognized-column'
  | 'invalid-date'
  | 'invalid-currency'
  | 'invalid-number'
  | 'time-conflict'
  | 'duplicate'
  | 'missing-traveler'
  | 'broken-url'
  | 'unmapped-sheet'
  | 'empty-sheet';

export type IssueSeverity = 'critical' | 'warning' | 'info';

/**
 * What an import issue says, as a code plus its data — never as prose.
 *
 * The parsed result is persisted, so prose baked in at import time could not be
 * re-rendered if the reader later switches language. Keeping the message as a code
 * also stops the parsing layer from owning presentation copy.
 *
 * Values quoted back from the workbook (`value`, `title`, `columns`) are the author's
 * own text and are shown verbatim in every language.
 */
export type IssueMessage =
  | { id: 'emptySheet'; sheet: string }
  | { id: 'unmappedSheet'; sheet: string; guess: string }
  | { id: 'noItinerarySheet' }
  | { id: 'unconvertibleCosts'; count: number; currencies: string; target: string; labels: string }
  | { id: 'unmappedColumns'; count: number; sheet: string; columns: string }
  | { id: 'noHeaders'; sheet: string; role: SheetRole }
  | { id: 'noActivityColumn'; sheet: string }
  | { id: 'invalidDate'; value: string; sheet: string; row: number }
  | { id: 'invalidStartTime'; value: string; sheet: string; row: number }
  | { id: 'invalidEndTime'; value: string; sheet: string; row: number }
  | { id: 'durationConflict'; sheet: string; row: number; start: string; end: string; duration: string }
  | { id: 'invalidCost'; value: string; sheet: string; row: number }
  | { id: 'unknownCurrency'; value: string; sheet: string; row: number }
  | { id: 'brokenUrlItinerary'; value: string; sheet: string; row: number }
  | { id: 'unknownSegmentType'; value: string; sheet: string; row: number }
  | { id: 'duplicateActivity'; sheet: string; row: number; title: string; firstRow: number }
  | { id: 'missingTraveler'; title: string; sheet: string; row: number }
  | { id: 'noActivitiesFound'; sheet: string }
  | { id: 'unknownBookingTiming'; value: string; sheet: string; row: number; item: string }
  | { id: 'unknownBookingStatus'; value: string; sheet: string; row: number; item: string }
  | { id: 'brokenUrlBooking'; value: string; sheet: string; row: number }
  | { id: 'brokenUrlSource'; value: string; sheet: string; row: number }
  | { id: 'fewerTravelers'; stated: number; found: number }
  | { id: 'invalidTripDate'; which: 'start' | 'end'; value: string; sheet: string; row: number }
  | { id: 'invalidExchangeRate'; value: string; sheet: string; row: number }
  | { id: 'invalidBudgetFigure'; value: string; sheet: string; row: number };

export interface ImportIssue {
  /** Deterministic, so a dismissal survives a re-import of the same workbook. */
  id: string;
  kind: ImportIssueKind;
  severity: IssueSeverity;
  message: IssueMessage;
  origin?: RowOrigin;
  /** Item this issue is attached to, when it is row-level. */
  relatedItemId?: string;
}

export interface SheetDetection {
  name: string;
  role: SheetRole;
  confidence: Confidence;
  rowCount: number;
  /** Headers we recognized, and the model field each mapped to. */
  mappedColumns: { header: string; field: string }[];
  unmappedColumns: string[];
}

export type SheetRole = 'overview' | 'itinerary' | 'bookings' | 'sources' | 'budget' | 'unknown';

export interface Trip {
  id: string;
  title: string;
  destinations: string[];
  startDate: IsoDate | null;
  endDate: IsoDate | null;
  dayCount: number;
  travelers: Traveler[];
  baseCurrency?: string;
  displayCurrency?: string;
  exchangeRates: ExchangeRate[];
  days: ItineraryDay[];
  bookings: BookingItem[];
  budget: BudgetEntry[];
  sources: Source[];
  assumptions: Assumption[];
  /** Per-traveler and group totals, when the workbook stated or implied them. */
  totals: TripTotals;
}

/** A budget figure the Overview sheet stated, kept under its own label. */
export interface StatedTotal {
  label: string;
  base: Money | null;
  fallback: Money | null;
}

export interface TripTotals {
  /** Summed from the trip's budget entries. Keyed by traveler id. */
  perTraveler: Record<string, { base: Money | null; fallback: Money | null }>;
  /** Summed from the trip's budget entries. */
  group: { base: Money | null; fallback: Money | null };
  /**
   * Figures the workbook stated outright, shown alongside our sums rather than
   * replacing them — the two rarely agree, and deciding which is "right" would mean
   * guessing what the author meant.
   */
  stated: StatedTotal[];
  /** Currency the summed figures are expressed in. */
  currency: string;
}

export interface ImportResult {
  trip: Trip;
  sheets: SheetDetection[];
  issues: ImportIssue[];
  /** File name and size, kept for the import summary. The file itself is not stored. */
  file: { name: string; size: number };
  importedAt: string;
  /** True when at least one expected sheet could not be read. */
  partial: boolean;
}
