/**
 * English message catalogue — the source of truth for the app's copy.
 *
 * `Messages` is derived from this object, so adding a key here makes it a compile
 * error in every other language until it is translated. Entries that need data are
 * functions, which keeps parameters type-checked and lets each language handle its own
 * grammar (English pluralises; Vietnamese does not).
 *
 * Only Wayfare's own chrome lives here. Anything the traveler wrote — activity names,
 * notes, places, the workbook's own column wording — is shown verbatim in every
 * language and never passes through this file.
 */
import type {
  ActivityType,
  BookingStatus,
  BookingUrgency,
  Confidence,
  DerivedCategory,
  IssueMessage,
  IssueSeverity,
  PracticalField,
  SheetRole,
} from '../domain/types';

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export const en = {
  meta: {
    /** BCP 47 tag used for date, number and currency formatting. */
    locale: 'en-GB',
    /** Shown in the language picker, in the language itself. */
    name: 'English',
  },

  app: {
    name: 'Wayfare',
    tagline: 'Your trip, day by day',
    skipToContent: 'Skip to content',
  },

  common: {
    back: 'Back',
    close: 'Close',
    cancel: 'Cancel',
    dismiss: 'Dismiss',
    tryAgain: 'Try again',
    review: 'Review',
    search: 'Search',
    filter: 'Filter',
    clearFilters: 'Clear filters',
    opensInNewTab: '(opens in a new tab)',
    notPriced: 'Not priced',
    noLinkGiven: 'No link given',
    viewSource: 'View source',
    routeTo: 'to',
    /** Duration units, e.g. "6h 35m". Both parts are omitted when zero. */
    hours: (n: number) => `${n}h`,
    minutes: (n: number) => `${n}m`,
    days: (n: number) => plural(n, 'day', 'days'),
    activities: (n: number) => plural(n, 'activity', 'activities'),
    travelers: (n: number) => plural(n, 'traveler', 'travelers'),
    bookings: (n: number) => plural(n, 'booking', 'bookings'),
    sources: (n: number) => plural(n, 'source', 'sources'),
    sheets: (n: number) => plural(n, 'sheet', 'sheets'),
    rows: (n: number) => plural(n, 'row', 'rows'),
    issues: (n: number) => plural(n, 'issue', 'issues'),
    things: (n: number) => plural(n, 'thing', 'things'),
  },

  nav: {
    primary: 'Primary',
    home: 'Home',
    itinerary: 'Itinerary',
    budget: 'Budget',
    bookings: 'Bookings',
    more: 'More',
    sources: 'Sources & assumptions',
    issues: 'Data issues',
    importDetails: 'Import details',
    unresolvedIssues: 'Unresolved data issues',
    settingsAndData: 'Settings & data',
  },

  header: {
    import: { title: 'Import', subtitle: 'Read your workbook' },
    itinerary: 'Itinerary',
    dayOf: (day: number, total: number) => `Day ${day} of ${total}`,
    activity: 'Activity',
    budget: { title: 'Budget', subtitle: 'Base and fallback' },
    bookings: { title: 'Bookings', subtitle: 'What to book, and when' },
    sources: { title: 'Sources', subtitle: 'What the plan is based on' },
    issues: { title: 'Data issues', subtitle: 'From your import' },
    more: 'More',
  },

  traveler: {
    /** Placeholder used when the workbook gave a count but no names. */
    placeholder: (slot: string) => `Traveler ${slot.toUpperCase()}`,
    both: 'Both travelers',
    everyone: 'Everyone',
    unassigned: 'Unassigned',
    all: 'All',
    shared: 'Shared',
    filterLabel: 'Filter by traveler',
    departingFrom: (city: string) => `departing from ${city}`,
    from: (city: string) => `from ${city}`,
  },

  activityType: {
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
  } satisfies Record<ActivityType, string>,

  practical: {
    food: 'Food',
    toilet: 'Toilet',
    shower: 'Shower',
    sleep: 'Sleep',
    recovery: 'Rest & recovery',
  } satisfies Record<PracticalField, string>,

  category: {
    flights: 'Flights',
    localTransport: 'Local transport',
    food: 'Food',
    lodging: 'Lodging',
    tours: 'Tours & activities',
    preparation: 'Preparation',
    other: 'Other',
  } satisfies Record<DerivedCategory, string>,

  bookingStatus: {
    'not-started': 'Not started',
    researching: 'Researching',
    ready: 'Ready to book',
    booked: 'Booked',
    confirmed: 'Confirmed',
  } satisfies Record<BookingStatus, string>,

  urgency: {
    now: 'Book now',
    '7-14': 'Book 7–14 days before',
    '1-3': 'Book 1–3 days before',
    arrival: 'Arrange on arrival',
    site: 'Pay on site',
    none: 'No action required',
  } satisfies Record<BookingUrgency, string>,

  sheetRole: {
    overview: 'Overview',
    itinerary: 'Itinerary',
    bookings: 'Booking options',
    sources: 'Sources',
    budget: 'Budget',
    unknown: 'Not recognized',
  } satisfies Record<SheetRole, string>,

  confidence: {
    high: 'High confidence',
    medium: 'Some guesswork',
    low: 'Uncertain',
  } satisfies Record<Confidence, string>,

  severity: {
    critical: 'Blocking',
    warning: 'Worth checking',
    info: 'For information',
  } satisfies Record<IssueSeverity, string>,

  assumption: {
    assumption: 'Assumption',
    recheck: 'Recheck',
    verified: 'Verified',
    note: 'Note',
    exchangeRate: 'Exchange rate',
  },

  scenario: {
    label: 'Cost scenario',
    base: 'Base',
    fallback: 'Fallback',
    baseLower: 'base',
    fallbackLower: 'fallback',
  },

  // ------------------------------------------------------------------ import
  import: {
    title: 'Upload your trip workbook',
    intro: 'Wayfare turns your planning spreadsheet into a day-by-day guide. Supports .xlsx and .xlsm, up to 20 MB.',
    dropHere: 'Drop your workbook here',
    dropHint: 'or tap to browse · .xlsx, .xlsm up to 20 MB',
    trySample: 'Or try the sample workbook',
    reading: 'Reading your workbook…',
    progress: 'Import progress',
    steps: ['Reading file', 'Detecting sheets', 'Extracting data', 'Ready'],
    stepDone: '— done',
    stepInProgress: '— in progress',
    complete: 'Import complete',
    readFrom: (sheets: number, file: string) => `${plural(sheets, 'sheet', 'sheets')} read from ${file}`,
    detectedSheets: 'Detected sheets',
    readAs: (role: string) => `Read as ${role}`,
    notUsed: 'Not used',
    skipped: 'Skipped',
    viewTrip: 'View trip',
    importAnother: 'Import a different workbook',
    reviewIssues: (n: number) => `Review ${plural(n, 'data issue', 'data issues')}`,
    chooseAnotherFile: 'Choose another file',
    partialTitle: 'Partial import',
    partialBody:
      'Some of the workbook could not be read. Everything Wayfare did understand is available — check Data issues for what is missing.',
    needsLook: (n: number) =>
      `${plural(n, 'thing', 'things')} ${n === 1 ? 'needs' : 'need'} a look — missing fields, unreadable values or broken links.`,
    privacyTitle: 'Your data stays here',
    privacyBody: 'Your workbook is read entirely inside your browser. Nothing is uploaded, and no part of it is sent anywhere.',
    privacyStored:
      ' The trip Wayfare builds is saved on this device so you can come back to it, and you can delete it at any time from More.',
    privacyUnavailable:
      ' This browser will not let Wayfare save anything locally, so your trip will be lost when you close the tab.',
    looksForTitle: 'What Wayfare looks for',
    looksForOverview: 'trip title, dates, travelers, exchange rates, budget totals',
    looksForItinerary: 'one row per activity, with dates, times, places and costs',
    looksForBookings: 'what to book, when, and for how much',
    looksForSources: 'the facts and assumptions behind the plan',
    aliasesNote:
      'Sheet names and column headings do not have to match exactly — Wayfare recognizes common variations and tells you what it could not place.',
  },

  errors: {
    tooLarge: {
      title: 'That file is larger than 20 MB',
      detail:
        'Wayfare reads the whole workbook in your browser, so very large files are not supported. Try removing unused sheets and exporting again.',
    },
    empty: { title: 'That file is empty', detail: 'The file has no contents. Check the export and try again.' },
    wrongFormat: {
      title: 'Wayfare reads .xlsx and .xlsm workbooks',
      detail: (file: string) =>
        `"${file}" is not a format Wayfare can read. In Excel or Google Sheets, export as .xlsx and try again.`,
    },
    unreadable: {
      title: "Wayfare couldn't read that workbook",
      detail: 'The file may be password-protected, corrupted, or saved in an older format. Try re-saving it as .xlsx.',
    },
    noSheets: { title: 'That workbook has no sheets', detail: 'Check that the file exported correctly and try again.' },
    unexpected: {
      title: "Wayfare couldn't read that workbook",
      detail: 'Something went wrong while reading the file. Try re-saving it as .xlsx and uploading again.',
    },
    boundaryTitle: 'Something went wrong showing this',
    boundaryBody: 'Your workbook data is untouched. Try again, or go back and pick another section.',
    activityBoundary: "Couldn't show this activity",
  },

  // -------------------------------------------------------------------- home
  home: {
    departsIn: (days: number) => `Departs in ${plural(days, 'day', 'days')}`,
    happeningNow: 'Happening now',
    nextUp: 'Next up',
    openNow: 'Open what’s on now',
    openNext: 'Open what’s next',
    issuesBanner: (n: number) =>
      `${plural(n, 'thing', 'things')} in your workbook ${n === 1 ? 'needs' : 'need'} a look.`,
    today: 'Today',
    nextDay: 'Next day',
    fullDay: 'Full day',
    nothingScheduled: 'Nothing scheduled for this day.',
    tripSummary: 'Trip summary',
    baseBudget: 'Base budget',
    fallbackBudget: 'Fallback budget',
    vsFallback: 'vs. fallback',
    bookingsStat: 'Bookings',
    destinationsMissing: 'Destinations not given',
    dayOfTotal: (day: number, total: number) => `Day ${day} of ${total}`,
    linkedFacts: (n: number) => plural(n, 'linked fact', 'linked facts'),
    doneSuffix: (label: string) => `${label} done`,
    now: 'Now',
  },

  // --------------------------------------------------------------- itinerary
  itinerary: {
    tripDays: 'Trip days',
    dayTabLabel: (date: string, day: number, total: number) => `${date}, day ${day} of ${total}`,
    hasIssues: 'Has data issues',
    undated: 'Undated activities',
    noDate: 'No date',
    timeNotGiven: 'Time not given',
    overnight: '+1 day',
    overnightShort: '+1',
    progressThroughDay: 'Progress through today',
    bookingNeeded: 'Booking needed',
    emptyTitle: 'No activities yet',
    emptyBody: 'Your workbook did not contain any itinerary rows Wayfare could read.',
    importWorkbook: 'Import a workbook',
    nothingScheduled: 'Nothing scheduled',
    nothingScheduledBody: 'This day has no activities in your workbook.',
    nothingForTraveler: 'Nothing for this traveler',
    nothingForTravelerBody: (n: number) =>
      `${plural(n, 'activity', 'activities')} on this day, none assigned to this filter.`,
    showAllTravelers: 'Show all travelers',
    selectActivity: 'Select an activity to see its full details here.',
    overlaps: (title: string) => `Overlaps "${title}"`,
    startsImmediatelyAfter: (title: string) => `Starts the moment "${title}" ends`,
    onlyMinutesAfter: (minutes: number, title: string) => `Only ${minutes} min after "${title}"`,
  },

  activity: {
    notFound: 'Activity not found',
    notFoundBody: 'It may have come from a workbook that has since been replaced.',
    backToItinerary: 'Back to itinerary',
    unassignedWarning:
      'Your workbook did not say which traveler this is for, so it is shown for everyone and left out of per-traveler totals.',
    durationDerived: 'Duration calculated from the start and end times.',
    goodToKnow: 'Good to know',
    practicalNeeds: 'Practical needs',
    booking: 'Booking',
    openInBookings: 'Open in booking checklist',
    cost: 'Cost',
    sharedCost: (n: number) => `Shared cost — split ${n} ways in per-traveler totals.`,
    whereFrom: 'Where this came from',
    showWhereFrom: 'Show where this came from',
    fromSheetRow: (sheet: string, row: number) => `${sheet}, row ${row}`,
    rawTypeNote: (value: string) =>
      `Segment type in your workbook: “${value}” — not a type Wayfare recognizes, so a generic icon is used.`,
    openSourceLink: 'Open source link',
    markDone: 'Mark as done',
    done: 'Done',
    markedDone: 'Marked as done',
    markedNotDone: 'Marked as not done',
    doneOnDevice: 'Marked done on this device',
    share: 'Share',
    copyDetails: 'Copy details',
    copied: 'Activity details copied',
    copyFailed: "Couldn't copy — your browser blocked it",
    navLabel: 'Activity navigation',
    startOfTrip: 'Start of trip',
    endOfTrip: 'End of trip',
    backToDay: (day: string) => `Back to ${day}`,
    noCost: 'No cost recorded for this activity.',
  },

  // ------------------------------------------------------------------ budget
  budget: {
    title: 'Budget',
    emptyTitle: 'No costs found',
    emptyBody: 'Your workbook did not have any amounts Wayfare could read, so there is nothing to total up.',
    seeWhatMissed: 'See what was missed',
    groupTotal: 'Group total',
    groupSub: (travelers: number, scenario: string) => `${plural(travelers, 'traveler', 'travelers')} · ${scenario} scenario`,
    baseVsFallback: 'Base vs. fallback',
    differenceAcrossTrip: 'Difference across the whole trip',
    noDifference: 'No difference',
    perTraveler: 'Per traveler',
    perTravelerNote:
      "Each traveler's own costs in full, plus an equal share of anything marked shared. Activities with no traveler assigned are excluded.",
    flightsVsShared: 'Flights vs. shared trip costs',
    flights: 'Flights',
    sharedCosts: 'Shared trip costs',
    byCategory: 'By category',
    byCategoryLabel: (scenario: string) => `Spending by category, ${scenario} scenario`,
    percentOfTotal: (percent: string) => `— ${percent}% of the total`,
    travelerSpecific: 'Traveler-specific expenses',
    statedTitle: 'Stated in your workbook',
    statedBudget: 'Budget',
    statedPerTraveler: 'Per traveler',
    statedGroupTotal: 'Group total',
    statedNote:
      "These are the figures written in your Overview sheet, shown exactly as given. Wayfare's own totals above are summed from the itinerary and will differ if the workbook's figures include anything not itemised.",
    exchangeRateLabel: 'Exchange rate',
    exchangeRateNote: 'Taken from your workbook and applied to every converted amount. Actual rates will differ.',
    noExchangeRateLabel: 'No exchange rate',
    noExchangeRateNote:
      'Your workbook did not give an exchange rate, so amounts in other currencies are shown as written and are not added into the totals.',
  },

  // ---------------------------------------------------------------- bookings
  bookings: {
    title: 'Booking checklist',
    progress: (done: number, total: number) =>
      `${done} of ${total} booked. Statuses you set are saved on this device only.`,
    progressLabel: (done: number, total: number) => `Booking progress: ${done} of ${total} done`,
    emptyTitle: 'No bookings yet',
    emptyBody: 'Your workbook did not have a booking sheet Wayfare could read.',
    searchLabel: 'Search bookings',
    filterAll: 'All',
    filterOutstanding: 'Outstanding',
    filterDone: 'Booked',
    filterByStatus: 'Filter by status',
    noneMatch: 'No bookings match',
    noneMatchBody: 'Try a different search term or filter.',
    changeStatus: 'Change status',
    statusFor: (item: string) => `Status for ${item}`,
    openBookingPage: 'Open booking page',
    target: 'Target',
    fallback: 'Fallback',
    noTargetPrice: 'No target price',
    statusNoteTitle: 'A note on statuses',
    statusNoteBody:
      'Wayfare reads the status column from your workbook as a starting point. Anything you change here is stored in this browser and never written back to your file.',
    statusChanged: (item: string, status: string) => `${item} — ${status}`,
  },

  // ----------------------------------------------------------------- sources
  sources: {
    title: 'Sources & assumptions',
    intro:
      'What the plan is based on, and how sure each part is. Anything without a working link is treated as an assumption, never as fact.',
    fromOverview: 'From your Overview sheet',
    emptyTitle: 'No sources found',
    emptyBody:
      'Your workbook did not have a sources sheet Wayfare could read, so there is nothing to check the plan against.',
    seeDetectedSheets: 'See detected sheets',
    searchLabel: 'Search sources',
    searchPlaceholder: 'Search topics and facts',
    filterByConfidence: 'Filter by confidence',
    filterAll: 'All',
    kindVerified: 'Verified',
    kindAssumption: 'Assumption',
    kindRecheck: 'Needs recheck',
    filterRecheck: 'Recheck',
    noneMatch: 'No sources match',
    noneMatchBody: 'Try a different search term or filter.',
    untitledTopic: 'Untitled topic',
    linkAsWritten: (value: string) => `Link as written: ${value}`,
    howClassifiedTitle: 'How these are classified',
    howVerified: 'the row has a working link to check the fact against.',
    howAssumption: 'no link, or wording like “assumed” or “around”.',
    howRecheck: 'the link does not work, or the row itself flags the fact as unconfirmed.',
    recheckCount: (n: number) =>
      `${plural(n, 'source', 'sources')} still ${n === 1 ? 'needs' : 'need'} a recheck before you rely on ${n === 1 ? 'it' : 'them'}.`,
  },

  // ------------------------------------------------------------------ issues
  issues: {
    title: 'Data issues',
    intro: (file: string) =>
      `What Wayfare could not read cleanly from ${file}. Your original file is never changed — dismissing an issue just marks it as reviewed on this device.`,
    openTab: (n: number) => `Open (${n})`,
    reviewedTab: (n: number) => `Reviewed (${n})`,
    nothingReviewed: 'Nothing reviewed yet',
    nothingReviewedBody: 'Issues you dismiss will be listed here.',
    nothingToFix: 'Nothing to fix',
    nothingToFixBody: 'Wayfare read every sheet in your workbook without trouble.',
    backToTrip: 'Back to trip',
    openActivity: 'Open activity',
    markReviewed: 'Mark as reviewed',
    markedReviewed: 'Marked as reviewed',
    moveBackToOpen: 'Move back to open',
    movedBackToOpen: 'Moved back to open',
    cannotDismissCritical: 'Blocking issues cannot be dismissed',
    sheetRow: (sheet: string, row: number) => `${sheet} · row ${row}`,
    whatToDoTitle: 'What to do about these',
    whatToDoBody: (n: number) =>
      `Fix anything that matters in your spreadsheet and import it again — ${plural(n, 'issue', 'issues')} ${n === 1 ? 'is' : 'are'} listed with the sheet and row number so you can find ${n === 1 ? 'it' : 'them'}. Your booking statuses and completed activities carry over.`,
    reimport: 'Re-import workbook',
  },

  // -------------------------------------------------------------------- more
  more: {
    title: 'More',
    appearance: 'Appearance',
    theme: 'Theme',
    themeSystem: 'Match my device',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeNote: 'Light is the default. Dark is easier on the eyes when you are checking tomorrow’s plan at night.',
    language: 'Language',
    languageNote: 'Changes Wayfare’s own wording. Your workbook’s contents are always shown exactly as you wrote them.',
    importedWorkbook: 'Imported workbook',
    file: 'File',
    size: 'Size',
    imported: 'Imported',
    sheetsRead: 'Sheets read',
    sheetsReadValue: (used: number, total: number) => `${used} of ${total}`,
    yourData: 'Your data',
    dataBody: 'Your workbook is read entirely in this browser. Nothing is uploaded and nothing is sent anywhere.',
    dataStored:
      'The trip Wayfare built, plus your booking statuses and completed activities, are saved on this device. The original file itself is not kept.',
    dataUnavailable:
      'This browser will not let Wayfare store data locally, so your trip is only held in memory and will be lost when you close the tab.',
    currentlyStored: (days: string, bookings: string, changes: string) =>
      `Currently stored: ${days}, ${bookings}, ${changes}.`,
    statusChanges: (n: number) => plural(n, 'status change', 'status changes'),
    clearData: 'Clear trip data',
    clearConfirmTitle: 'Clear trip data?',
    clearConfirmBody:
      'This removes the imported trip, your booking statuses and your completed activities from this device. Your original spreadsheet file is not affected — you can import it again at any time.',
    clearEverything: 'Clear everything',
    cleared: 'Trip data cleared',
    about: 'About',
    aboutBody:
      'Wayfare turns a trip-planning spreadsheet into a day-by-day guide you can follow on your phone. It never changes your workbook and works without a connection once loaded.',
  },

  offline: {
    offline: 'Offline',
    stale: 'Offline · showing last saved data',
  },

  notFound: {
    title: 'Page not found',
    body: 'That link does not match anything in Wayfare.',
    backToTrip: 'Back to your trip',
  },

  loading: 'Loading your trip',

  // ------------------------------------------------------------ import issues
  /**
   * One entry per `IssueMessage` id. Each returns the heading and the explanation.
   * Values quoted from the workbook are interpolated as-is.
   */
  issueMessages: {
    emptySheet: (p) => ({
      title: `"${p.sheet}" is empty`,
      detail: 'This sheet has no data, so it was skipped.',
    }),
    unmappedSheet: (p) => ({
      title: `"${p.sheet}" was not recognized`,
      detail: `Wayfare could not tell what this sheet contains (best guess: ${p.guess}). Nothing from it appears in your trip.`,
    }),
    noItinerarySheet: () => ({
      title: 'No itinerary sheet found',
      detail:
        'Wayfare could not identify a sheet with day-by-day activities. Everything else that was recognized has still been imported.',
    }),
    unconvertibleCosts: (p) => ({
      title: `${plural(p.count, 'cost', 'costs')} left out of the totals`,
      detail: `No exchange rate was given for ${p.currencies} → ${p.target}, so these amounts are shown on their own items but not added to any total: ${p.labels}.`,
    }),
    unmappedColumns: (p) => ({
      title: `${plural(p.count, 'column', 'columns')} not matched in "${p.sheet}"`,
      detail: `Wayfare did not recognize: ${p.columns}. These columns are not shown anywhere in your trip.`,
    }),
    noHeaders: (p) => ({
      title: `No column headers found in "${p.sheet}"`,
      detail: 'No header row could be identified, so nothing was imported from this sheet.',
    }),
    noActivityColumn: (p) => ({
      title: `No activity column in "${p.sheet}"`,
      detail:
        'Wayfare could not find a column describing what happens (tried: activity, description, item, title). Activities were imported using whatever other columns matched.',
    }),
    invalidDate: (p) => ({
      title: 'Date could not be read',
      detail: `"${p.value}" in ${p.sheet} row ${p.row} is not a date Wayfare recognizes. The activity was kept but placed under the previous day.`,
    }),
    invalidStartTime: (p) => ({
      title: 'Start time could not be read',
      detail: `"${p.value}" in ${p.sheet} row ${p.row} is not a time Wayfare recognizes.`,
    }),
    invalidEndTime: (p) => ({
      title: 'End time could not be read',
      detail: `"${p.value}" in ${p.sheet} row ${p.row} is not a time Wayfare recognizes.`,
    }),
    durationConflict: (p) => ({
      title: 'Duration does not match the times',
      detail: `${p.sheet} row ${p.row} runs past midnight (${p.start} → ${p.end}) but states a duration of ${p.duration}. Both values were kept as written.`,
    }),
    invalidCost: (p) => ({
      title: 'Cost could not be read',
      detail: `"${p.value}" in ${p.sheet} row ${p.row} is not an amount Wayfare recognizes, so it is not counted in the budget.`,
    }),
    unknownCurrency: (p) => ({
      title: 'Currency not recognized',
      detail: `"${p.value}" in ${p.sheet} row ${p.row} is not a currency code Wayfare recognizes. Amounts are shown without conversion.`,
    }),
    brokenUrlItinerary: (p) => ({
      title: 'Source link is not usable',
      detail: `"${p.value}" in ${p.sheet} row ${p.row} looks like a link but could not be opened. The text was kept on the activity.`,
    }),
    unknownSegmentType: (p) => ({
      title: 'Segment type not recognized',
      detail: `"${p.value}" in ${p.sheet} row ${p.row} did not match a known activity type. It is shown as written, with a generic icon.`,
    }),
    duplicateActivity: (p) => ({
      title: 'Duplicate activity',
      detail: `${p.sheet} row ${p.row} repeats "${p.title}" at the same date and time as row ${p.firstRow}. Both are shown.`,
    }),
    missingTraveler: (p) => ({
      title: 'No traveler assigned',
      detail: `"${p.title}" (${p.sheet} row ${p.row}) does not say which traveler it is for. It is shown for everyone and excluded from per-traveler totals.`,
    }),
    noActivitiesFound: (p) => ({
      title: `No activities found in "${p.sheet}"`,
      detail: 'The sheet was detected as an itinerary but every row below the header was empty.',
    }),
    unknownBookingTiming: (p) => ({
      title: 'Booking timing not recognized',
      detail: `"${p.value}" in ${p.sheet} row ${p.row} did not match a known booking window, so "${p.item}" is grouped under "No action required". The original wording is shown on the item.`,
    }),
    unknownBookingStatus: (p) => ({
      title: 'Booking status not recognized',
      detail: `"${p.value}" in ${p.sheet} row ${p.row} did not match a known status, so "${p.item}" starts as Not started.`,
    }),
    brokenUrlBooking: (p) => ({
      title: 'Booking link is not usable',
      detail: `"${p.value}" in ${p.sheet} row ${p.row} looks like a link but could not be opened.`,
    }),
    brokenUrlSource: (p) => ({
      title: 'Source link is not usable',
      detail: `"${p.value}" in ${p.sheet} row ${p.row} looks like a link but could not be opened. The source is marked "Needs recheck".`,
    }),
    fewerTravelers: (p) => ({
      title: 'Fewer travelers than stated',
      detail: `The overview says ${p.stated} travelers but only ${p.found} could be identified by name. Placeholder travelers were added.`,
    }),
    invalidTripDate: (p) => ({
      title: `Trip ${p.which} date could not be read`,
      detail: `"${p.value}" in ${p.sheet} row ${p.row} is not a date Wayfare recognizes. Dates were taken from the itinerary instead.`,
    }),
    invalidExchangeRate: (p) => ({
      title: 'Exchange rate could not be read',
      detail: `"${p.value}" in ${p.sheet} row ${p.row} is not in a form Wayfare can read (expected something like "1 USD = 15,500 IDR"). Converted amounts are not shown.`,
    }),
    invalidBudgetFigure: (p) => ({
      title: 'Budget figure could not be read',
      detail: `"${p.value}" in ${p.sheet} row ${p.row} is not an amount Wayfare recognizes. Totals were calculated from the itinerary instead.`,
    }),
  } satisfies IssueRenderers,
};

/** One renderer per issue id, receiving exactly that variant's data. */
export type IssueRenderers = {
  [K in IssueMessage['id']]: (params: Extract<IssueMessage, { id: K }>) => { title: string; detail: string };
};

export type Messages = typeof en;
