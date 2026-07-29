/**
 * Sheet-name and column-header alias tables.
 *
 * These are the only workbook-specific knowledge in the codebase. Nothing here is
 * imported by a component — mappers consume them and emit domain types.
 *
 * Aliases include the English terms from the brief plus the Indonesian and Vietnamese
 * equivalents, because a workbook written for a Java/Vietnam trip is often written in
 * the traveler's own language and the brief asks us to preserve the source language.
 */
import type { SheetRole } from '../domain/types';

export const SHEET_ROLE_ALIASES: Record<Exclude<SheetRole, 'unknown'>, readonly string[]> = {
  overview: ['overview', 'summary', 'trip', 'tripoverview', 'dashboard', 'info', 'tripinfo', 'general', 'ringkasan', 'tongquan', 'about', 'plan', 'tripsummary'],
  itinerary: ['itinerary', 'schedule', 'plan', 'days', 'daybyday', 'timeline', 'program', 'agenda', 'jadwal', 'lichtrinh', 'route', 'activities'],
  bookings: ['bookingoptions', 'bookings', 'booking', 'tobook', 'reservations', 'reservation', 'checklist', 'bookinglist', 'pemesanan', 'datphong', 'options'],
  sources: ['sources', 'source', 'references', 'reference', 'links', 'research', 'notes', 'citations', 'sumber', 'nguon', 'bibliography'],
  budget: ['budget', 'costs', 'cost', 'expenses', 'expense', 'money', 'spend', 'anggaran', 'chiphi', 'finance', 'pricing'],
};

export type ItineraryField =
  | 'date' | 'day' | 'start' | 'end' | 'duration' | 'country' | 'city' | 'segmentType'
  | 'route' | 'activity' | 'food' | 'toilet' | 'shower' | 'sleep' | 'recovery'
  | 'booking' | 'currency' | 'baseCost' | 'fallbackCost' | 'convertedCost'
  | 'sourceUrl' | 'notes' | 'traveler';

export const ITINERARY_ALIASES: Record<ItineraryField, readonly string[]> = {
  date: ['date', 'datetime', 'daydate', 'calendar', 'tanggal', 'ngay', 'datum', 'fecha'],
  day: ['day', 'daynumber', 'dayno', 'dayn', 'hari', 'weekday', 'dayofweek'],
  start: ['start', 'starttime', 'from', 'begin', 'begins', 'timestart', 'departure', 'departuretime', 'depart', 'time', 'jam', 'jammulai', 'giobatdau'],
  end: ['end', 'endtime', 'until', 'till', 'finish', 'timeend', 'arrival', 'arrivaltime', 'arrive', 'jamselesai', 'gioketthuc'],
  duration: ['duration', 'length', 'howlong', 'dur', 'lama', 'thoigian', 'elapsed'],
  country: ['country', 'nation', 'negara', 'quocgia'],
  city: ['city', 'area', 'cityarea', 'town', 'region', 'locationarea', 'kota', 'thanhpho'],
  segmentType: ['segmenttype', 'segment', 'type', 'activitytype', 'category', 'kind', 'mode', 'jenis', 'loai'],
  route: ['routeplace', 'route', 'place', 'location', 'fromto', 'where', 'venue', 'tempat', 'diadiem', 'placeroute'],
  activity: ['activity', 'description', 'what', 'activitydescription', 'item', 'title', 'name', 'event', 'task', 'kegiatan', 'hoatdong'],
  food: ['food', 'meal', 'meals', 'eating', 'makan', 'anuong'],
  toilet: ['toilet', 'wc', 'restroom', 'bathroom'],
  shower: ['shower', 'bath', 'washing', 'mandi'],
  sleep: ['sleep', 'sleeping', 'overnight', 'accommodation', 'tidur', 'ngu'],
  recovery: ['recovery', 'rest', 'restrecovery', 'break', 'istirahat', 'nghingoi'],
  booking: ['booking', 'bookingaction', 'action', 'requiredaction', 'bookingrequired', 'todo', 'actionrequired', 'needstobooking', 'reservation'],
  currency: ['currency', 'curr', 'ccy', 'matauang', 'tiente'],
  baseCost: ['basecost', 'base', 'costbase', 'baseprice', 'pricebase', 'cost', 'price', 'amount', 'biaya', 'chiphi', 'estimatedcost'],
  fallbackCost: ['fallbackcost', 'fallback', 'altcost', 'alternativecost', 'backupcost', 'worstcase', 'fallbackprice', 'maxcost', 'highcost'],
  convertedCost: ['convertedcost', 'converted', 'costusd', 'usd', 'convertedusd', 'incurrency', 'costconverted', 'usdcost'],
  sourceUrl: ['sourceurl', 'source', 'url', 'link', 'reference', 'ref', 'website', 'sumber', 'nguon'],
  notes: ['notes', 'note', 'remarks', 'comment', 'comments', 'detail', 'details', 'catatan', 'ghichu'],
  traveler: ['traveler', 'travellers', 'travelers', 'traveller', 'travelerassignment', 'who', 'person', 'assignedto', 'assigned', 'participant', 'pax', 'forwhom', 'peserta'],
};

export type BookingField =
  | 'item' | 'plan' | 'targetPrice' | 'fallbackPrice' | 'channel' | 'timing'
  | 'confirmation' | 'url' | 'status' | 'traveler' | 'notes' | 'currency';

export const BOOKING_ALIASES: Record<BookingField, readonly string[]> = {
  item: ['item', 'what', 'booking', 'bookingitem', 'name', 'description', 'thing', 'service', 'barang'],
  plan: ['recommendedplan', 'plan', 'recommendation', 'recommended', 'option', 'preferredoption', 'suggestion'],
  targetPrice: ['targetprice', 'target', 'targetcost', 'baseprice', 'basecost', 'price', 'cost', 'expected', 'budget'],
  fallbackPrice: ['fallbackprice', 'fallback', 'altprice', 'alternativeprice', 'maxprice', 'worstcase', 'backupprice', 'fallbackcost'],
  channel: ['bookingchannel', 'channel', 'where', 'platform', 'provider', 'via', 'vendor', 'operator', 'site', 'agent'],
  timing: ['bookingtiming', 'timing', 'when', 'bookby', 'deadline', 'leadtime', 'bookwhen', 'urgency', 'whentobook'],
  confirmation: ['confirmationdetails', 'confirmation', 'bookingref', 'reference', 'ref', 'confirmationnumber', 'pnr', 'code'],
  url: ['url', 'link', 'externalurl', 'website', 'bookinglink', 'externallink'],
  status: ['status', 'state', 'progress', 'bookingstatus', 'done'],
  traveler: ['traveler', 'travellers', 'travelers', 'traveller', 'who', 'person', 'assignedto', 'forwhom', 'pax'],
  notes: ['notes', 'note', 'remarks', 'comment', 'comments', 'catatan'],
  currency: ['currency', 'curr', 'ccy', 'matauang'],
};

export type SourceField = 'topic' | 'fact' | 'url' | 'notes' | 'kind';

export const SOURCE_ALIASES: Record<SourceField, readonly string[]> = {
  topic: ['topic', 'subject', 'area', 'category', 'about', 'title', 'what', 'topik', 'chude'],
  fact: ['supportedfact', 'fact', 'supports', 'assumption', 'claim', 'finding', 'detail', 'information', 'says', 'supportedfactorassumption', 'factassumption'],
  url: ['url', 'link', 'source', 'sourceurl', 'website', 'reference', 'href', 'lien'],
  notes: ['notes', 'note', 'remarks', 'comment', 'comments', 'catatan', 'ghichu'],
  kind: ['kind', 'type', 'confidence', 'status', 'verified', 'reliability'],
};

export type BudgetField = 'label' | 'category' | 'base' | 'fallback' | 'traveler' | 'currency' | 'notes';

export const BUDGET_ALIASES: Record<BudgetField, readonly string[]> = {
  label: ['item', 'label', 'description', 'expense', 'what', 'name', 'line', 'lineitem'],
  category: ['category', 'type', 'group', 'kind', 'bucket', 'kategori'],
  base: ['base', 'basecost', 'baseprice', 'amount', 'cost', 'price', 'planned', 'estimate'],
  fallback: ['fallback', 'fallbackcost', 'fallbackprice', 'worstcase', 'maxcost', 'alternative'],
  traveler: ['traveler', 'travellers', 'travelers', 'traveller', 'who', 'person', 'assignedto', 'pax'],
  currency: ['currency', 'curr', 'ccy'],
  notes: ['notes', 'note', 'remarks', 'comment', 'comments'],
};

/**
 * Overview sheets are usually label/value pairs rather than a table, so these match
 * the label cell in column A.
 */
export type OverviewField =
  | 'title' | 'destinations' | 'startDate' | 'endDate' | 'dates' | 'travelerCount'
  | 'travelers' | 'departureCities' | 'exchangeRate' | 'baseCurrency' | 'displayCurrency'
  | 'baseBudget' | 'fallbackBudget' | 'perTravelerTotal' | 'groupTotal' | 'assumption'
  | 'warning' | 'duration';

export const OVERVIEW_ALIASES: Record<OverviewField, readonly string[]> = {
  title: ['triptitle', 'title', 'tripname', 'name', 'trip', 'journey', 'namatrip'],
  destinations: ['destinations', 'destination', 'countries', 'places', 'route', 'where', 'cities', 'tujuan'],
  startDate: ['startdate', 'start', 'departuredate', 'from', 'begins', 'tanggalmulai'],
  endDate: ['enddate', 'end', 'returndate', 'to', 'until', 'ends', 'tanggalselesai'],
  dates: ['traveldates', 'dates', 'daterange', 'tripdates', 'period', 'when'],
  duration: ['duration', 'triplength', 'days', 'numberofdays', 'daycount', 'totaldays'],
  travelerCount: ['travelercount', 'travellercount', 'numberoftravelers', 'numberoftravellers', 'travelers', 'travellers', 'pax', 'groupsize', 'people'],
  travelers: ['travelernames', 'travellernames', 'names', 'who', 'participants', 'travelerlist'],
  departureCities: ['departurecities', 'departurecity', 'departingfrom', 'origin', 'origins', 'from', 'homecity', 'kotaasal'],
  exchangeRate: ['exchangerate', 'exchangerates', 'fx', 'fxrate', 'fxassumption', 'rate', 'conversionrate', 'kurs'],
  baseCurrency: ['basecurrency', 'currency', 'localcurrency', 'sourcecurrency'],
  displayCurrency: ['displaycurrency', 'reportingcurrency', 'convertto', 'targetcurrency', 'showin'],
  baseBudget: ['basebudget', 'base', 'baseline', 'baselinebudget', 'plannedbudget', 'budgetbase'],
  fallbackBudget: ['fallbackbudget', 'fallback', 'worstcasebudget', 'maxbudget', 'budgetfallback'],
  perTravelerTotal: ['pertraveler', 'pertravellertotal', 'pertravelertotal', 'totalpertraveler', 'perperson', 'perpersontotal'],
  groupTotal: ['grouptotal', 'total', 'totalcost', 'grandtotal', 'combinedtotal', 'totalgroup'],
  assumption: ['assumption', 'assumptions', 'assumed', 'basisofestimate', 'asumsi'],
  warning: ['warning', 'warnings', 'caution', 'risk', 'risks', 'watchout', 'uncertain', 'peringatan'],
};

/** Segment-type text -> the design system's activity types (and their Lucide icons). */
export const ACTIVITY_TYPE_ALIASES: Record<string, readonly string[]> = {
  flight: ['flight', 'fly', 'plane', 'air', 'airline', 'flights', 'penerbangan', 'chuyenbay'],
  transport: ['transport', 'transfer', 'bus', 'train', 'taxi', 'drive', 'car', 'ferry', 'boat', 'mrt', 'metro', 'grab', 'shuttle', 'jeep', 'ride', 'transit', 'transportasi'],
  food: ['food', 'meal', 'lunch', 'dinner', 'breakfast', 'eat', 'restaurant', 'cafe', 'snack', 'makan'],
  hotel: ['hotel', 'lodging', 'accommodation', 'checkin', 'checkout', 'hostel', 'guesthouse', 'homestay', 'stay', 'penginapan'],
  sleep: ['sleep', 'overnight', 'night', 'nap', 'tidur'],
  sightseeing: ['sightseeing', 'sight', 'visit', 'attraction', 'museum', 'temple', 'viewpoint', 'trek', 'hike', 'walk', 'explore', 'wisata'],
  tour: ['tour', 'guided', 'excursion', 'activity', 'experience', 'trip'],
  prep: ['prep', 'preparation', 'pack', 'packing', 'admin', 'visa', 'buy', 'shopping', 'errand', 'persiapan'],
  arrival: ['arrival', 'arrive', 'landing', 'immigration', 'customs', 'border', 'departure', 'depart', 'kedatangan'],
  rest: ['rest', 'recovery', 'break', 'relax', 'downtime', 'buffer', 'wait', 'waiting', 'istirahat'],
};

/** Booking-status text -> the design system's five statuses. */
export const BOOKING_STATUS_ALIASES: Record<string, readonly string[]> = {
  'not-started': ['notstarted', 'not started', 'todo', 'pending', 'open', 'none', 'new', 'belum'],
  researching: ['researching', 'research', 'looking', 'comparing', 'inprogress', 'investigating', 'wip'],
  ready: ['readytobook', 'ready', 'readyto', 'decided', 'chosen', 'selected', 'approved', 'siap'],
  booked: ['booked', 'reserved', 'purchased', 'bought', 'paid', 'ordered', 'sudah'],
  confirmed: ['confirmed', 'confirm', 'ticketed', 'complete', 'completed', 'done', 'final'],
};

/** Booking-timing text -> the checklist's urgency groups. */
export const BOOKING_URGENCY_ALIASES: Record<string, readonly string[]> = {
  now: ['now', 'booknow', 'asap', 'immediately', 'urgent', 'today', 'straightaway'],
  '7-14': ['714daysbefore', '7to14days', '1to2weeks', 'twoweeksbefore', 'aweekbefore', '7days', '14days', '10days', 'oneweekbefore'],
  '1-3': ['13daysbefore', '1to3days', 'afewdaysbefore', '3days', '2days', '1day', 'daybefore', 'nightbefore'],
  arrival: ['arrangeonarrival', 'onarrival', 'atarrival', 'whenyouarrive', 'onthedaythere', 'atdestination'],
  site: ['payonsite', 'onsite', 'atthedoor', 'atvenue', 'paythere', 'cashonsite', 'walkin', 'attheentrance'],
  none: ['noaction', 'noactionrequired', 'nobooking', 'nobookingneeded', 'none', 'na', 'notrequired', 'free'],
};
