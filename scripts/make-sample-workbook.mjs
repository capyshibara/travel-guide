/**
 * Generates `public/sample-trip.xlsx`.
 *
 * The workbook is deliberately imperfect: the sources sheet is named "Sheet4", one
 * link is malformed, one row has no traveler, one segment type is nonsense, one row is
 * a duplicate, and one duration disagrees with its own times. That exercises the
 * importer's issue reporting rather than demonstrating only the happy path.
 *
 * Run with `npm run sample`. The output is committed so GitHub Pages can serve it.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from '@e965/xlsx';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, '..', 'public', 'sample-trip.xlsx');

/** Excel serial for a calendar date, 1900 date system. */
function serial(y, m, d) {
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
}
/** Fraction of a day for HH:MM. */
function timeFraction(h, m) {
  return (h * 60 + m) / 1440;
}

const DATE_FMT = 'yyyy-mm-dd';
const TIME_FMT = 'hh:mm';

const dateCell = (y, m, d) => ({ v: serial(y, m, d), t: 'n', z: DATE_FMT });
const timeCell = (h, m) => ({ v: timeFraction(h, m), t: 'n', z: TIME_FMT });

// ---------------------------------------------------------------- Overview
const overview = [
  ['Trip title', 'Vietnam, Singapore & Java 2026'],
  ['Destinations', 'Hanoi → Ho Chi Minh City → Singapore → Java'],
  ['Start date', dateCell(2026, 8, 14)],
  ['End date', dateCell(2026, 8, 26)],
  ['Traveler count', 2],
  ['Traveler A departure city', 'Hanoi (HAN)'],
  ['Traveler B departure city', 'Ho Chi Minh City (SGN)'],
  ['Base currency', 'USD'],
  ['Exchange rate', '1 USD = 15,500 IDR'],
  ['Base budget', 1840],
  ['Fallback budget', 2260],
  ['Group total', 3680],
  ['Assumption', 'Exchange rate fixed at 1 USD = 15,500 IDR (June 2026). Not re-checked after booking.'],
  ['Warning', 'Ijen permit price unconfirmed for the 2026 season — using the 2025 rate as the fallback.'],
];

// --------------------------------------------------------------- Itinerary
const ITIN_HEADER = [
  'Date', 'Day', 'Start time', 'End time', 'Duration', 'Country', 'City / Area',
  'Segment type', 'Route / Place', 'Activity', 'Food', 'Toilet', 'Shower',
  'Sleep', 'Recovery', 'Booking / Action', 'Currency', 'Base cost',
  'Fallback cost', 'Source URL', 'Notes', 'Traveler', 'Vibe check',
];

const itinerary = [
  ITIN_HEADER,
  [
    dateCell(2026, 8, 14), 'Fri', timeCell(14, 20), timeCell(18, 5), '3h 45m', 'Vietnam', 'Hanoi',
    'Flight', 'Hanoi (HAN) → Singapore (SIN)', 'Flight HAN → SIN', '', '', '',
    '', '', 'Confirmed · Vietjet VJ826', 'USD', 142,
    168, 'https://www.vietjetair.com/', 'Carry-on only, 7 kg limit.', 'A', 'ok',
  ],
  [
    dateCell(2026, 8, 14), 'Fri', timeCell(19, 30), timeCell(21, 0), '1h 30m', 'Singapore', 'Singapore',
    'Transport', 'Changi Airport → Bugis', 'MRT to hostel', '', 'At Changi T3', '',
    '', '', 'Buy EZ-Link card on arrival', 'SGD', 3,
    5, 'https://www.lta.gov.sg/', 'Airport MRT closes 23:18 — no rush.', 'A', '',
  ],
  [
    dateCell(2026, 8, 15), 'Sat', timeCell(16, 45), timeCell(20, 10), '3h 25m', 'Vietnam', 'Ho Chi Minh City',
    'Flight', 'Ho Chi Minh City (SGN) → Singapore (SIN)', 'Flight SGN → SIN', '', '', '',
    '', '', 'Confirmed · Scoot TR867', 'USD', 98,
    120, 'https://www.flyscoot.com/', '', 'B', '',
  ],
  [
    dateCell(2026, 8, 15), 'Sat', timeCell(9, 0), timeCell(12, 0), '3h', 'Singapore', 'Singapore',
    'Sightseeing', 'Bugis → Gardens by the Bay', 'Gardens by the Bay', 'Hawker lunch after', 'Yes', '',
    '', '', 'Free outdoor gardens; Cloud Forest ticket optional', 'USD', 20,
    28, 'https://www.gardensbythebay.com.sg/', 'Skip Cloud Forest if raining — outdoor gardens are free.', 'A', '',
  ],
  [
    dateCell(2026, 8, 16), 'Sun', timeCell(10, 0), timeCell(13, 0), '3h', 'Singapore', 'Singapore',
    'Sightseeing', 'Marina Bay', 'Traveler A & B meet up · Marina Bay walk', '', '', '',
    '', '', 'No booking needed', 'USD', 0,
    0, 'https://www.visitsingapore.com/', 'First shared day.', 'Shared', '',
  ],
  [
    dateCell(2026, 8, 16), 'Sun', timeCell(21, 0), timeCell(22, 0), '1h', 'Singapore', 'Chinatown',
    'Food', 'Maxwell Hawker Centre', 'Dinner at Maxwell Hawker Centre', 'Dinner', 'Yes', '',
    '', '', 'No booking needed — cash preferred', 'USD', 8,
    12, 'https//singaporehawkerguide.com/maxwell', 'Cash only at most stalls.', 'B', '',
  ],
  [
    dateCell(2026, 8, 17), 'Mon', timeCell(6, 30), timeCell(9, 45), '3h 15m', 'Indonesia', 'Surabaya',
    'Flight', 'Singapore (SIN) → Surabaya (SUB)', 'Flight SIN → SUB', '', '', '',
    '', '', 'Book 7-14 days before on Traveloka', 'USD', 74,
    96, 'https://www.traveloka.com/', 'Both travelers on the same flight.', 'Shared', '',
  ],
  [
    dateCell(2026, 8, 17), 'Mon', timeCell(12, 0), timeCell(16, 30), '4h 30m', 'Indonesia', 'Probolinggo',
    'Transport', 'Surabaya → Cemoro Lawang', 'Private car to Bromo basecamp', 'Roadside lunch stop', 'At rest stop', '',
    '', 'Nap in car', 'Arrange with homestay, pay driver in cash', 'IDR', 850000,
    1100000, 'https://www.google.com/maps', 'Split between both travelers.', 'Shared', '',
  ],
  [
    dateCell(2026, 8, 17), 'Mon', timeCell(17, 0), timeCell(22, 0), '5h', 'Indonesia', 'Cemoro Lawang',
    'Hotel', 'Cemoro Indah Homestay', 'Check in + early night', '', 'Shared bathroom', 'Hot water 18:00–21:00',
    'Sleep 22:00', 'Rest before 03:00 start', 'Pay on site, cash', 'IDR', 350000,
    450000, 'https://www.booking.com/', 'Bring a headlamp — power cuts are common.', 'Shared', '',
  ],
  // Overnight activity: end time is before start time, crossing midnight.
  [
    dateCell(2026, 8, 17), 'Mon', timeCell(23, 40), timeCell(6, 15), '6h 35m', 'Indonesia', 'Cemoro Lawang',
    'Tour', 'Cemoro Lawang → Mt. Bromo viewpoint', 'Bromo sunrise trek', 'Breakfast after, at homestay', 'None on route', '',
    '', 'Back at homestay by 07:00', 'Book jeep 3 days before via homestay WhatsApp', 'IDR', 250000,
    320000, 'https://bromotenggersemeru.org/', "You'll need a headlamp and a warm layer — it is 5 °C at the viewpoint.", 'Shared', '',
  ],
  [
    dateCell(2026, 8, 18), 'Tue', timeCell(10, 0), timeCell(14, 0), '4h', 'Indonesia', 'Bondowoso',
    'Transport', 'Cemoro Lawang → Bondowoso', 'Transfer to Ijen side', 'Lunch en route', 'Yes', '',
    '', '', 'Arrange on arrival with homestay', 'IDR', 600000,
    800000, 'https://www.google.com/maps', '', 'Shared', '',
  ],
  // Duration deliberately disagrees with the stated times.
  [
    dateCell(2026, 8, 19), 'Wed', timeCell(1, 0), timeCell(8, 0), '2h', 'Indonesia', 'Banyuwangi',
    'Tour', 'Paltuding → Kawah Ijen', 'Ijen blue fire hike', '', 'At Paltuding post', '',
    '', 'Sleep in the afternoon', 'Book guide 1-3 days before', 'IDR', 400000,
    600000, 'https://www.eastjava.com/', 'Gas mask included with the guide.', 'Shared', '',
  ],
  // No traveler assignment.
  [
    dateCell(2026, 8, 20), 'Thu', timeCell(9, 0), timeCell(11, 0), '2h', 'Indonesia', 'Banyuwangi',
    'Faff', 'Banyuwangi town', 'Laundry and repack', '', '', 'At guesthouse',
    '', 'Slow morning', '', 'IDR', 50000,
    75000, '', 'Only laundry place open before noon.', '', '',
  ],
  // Duplicate of the row above.
  [
    dateCell(2026, 8, 20), 'Thu', timeCell(9, 0), timeCell(11, 0), '2h', 'Indonesia', 'Banyuwangi',
    'Faff', 'Banyuwangi town', 'Laundry and repack', '', '', 'At guesthouse',
    '', 'Slow morning', '', 'IDR', 50000,
    75000, '', 'Duplicate row, left in on purpose.', '', '',
  ],
  [
    dateCell(2026, 8, 21), 'Fri', timeCell(13, 15), timeCell(15, 40), '2h 25m', 'Indonesia', 'Surabaya',
    'Transport', 'Banyuwangi → Surabaya', 'Train to Surabaya', 'Snacks on board', 'On board', '',
    '', 'Long sit-down', 'Book 7-14 days before on KAI Access', 'IDR', 180000,
    240000, 'https://booking.kai.id/', 'Executive class is worth it for 6 hours.', 'Shared', '',
  ],
  [
    dateCell(2026, 8, 26), 'Wed', timeCell(11, 30), timeCell(15, 5), '3h 35m', 'Indonesia', 'Surabaya',
    'Flight', 'Surabaya (SUB) → Ho Chi Minh City (SGN)', 'Flight SUB → SGN', '', '', '',
    '', '', 'Book now — fares rising', 'USD', 130,
    175, 'https://www.vietnamairlines.com/', '', 'B', '',
  ],
  [
    dateCell(2026, 8, 26), 'Wed', timeCell(11, 30), timeCell(16, 20), '4h 50m', 'Indonesia', 'Surabaya',
    'Flight', 'Surabaya (SUB) → Hanoi (HAN)', 'Flight SUB → HAN', '', '', '',
    '', '', 'Book now — fares rising', 'USD', 155,
    198, 'https://www.vietnamairlines.com/', '', 'A', '',
  ],
];

// --------------------------------------------------------- Booking Options
const bookings = [
  ['Item', 'Recommended plan', 'Target price', 'Fallback price', 'Booking channel', 'Booking timing', 'Confirmation', 'URL', 'Status', 'Traveler'],
  ['Flight HAN → SIN', 'Vietjet direct, carry-on only', 142, 168, 'Vietjet website', 'Booked', 'VJ826 · ref 7QKL2M', 'https://www.vietjetair.com/', 'Confirmed', 'A'],
  ['Flight SGN → SIN', 'Scoot direct', 98, 120, 'Scoot website', 'Booked', 'TR867 · ref 4PPX9A', 'https://www.flyscoot.com/', 'Confirmed', 'B'],
  ['Flight SIN → SUB', 'Scoot or Jetstar, morning departure', 74, 96, 'Traveloka', 'Book 7-14 days before', '', 'https://www.traveloka.com/', 'Ready to book', 'Shared'],
  ['Bromo jeep tour', 'Shared jeep, 03:00 pickup', 250000, 320000, 'Homestay WhatsApp', 'Book 1-3 days before', '', '', 'Researching', 'Shared'],
  ['Ijen guide + gas mask', 'Licensed guide, blue fire slot', 400000, 600000, 'Local operator', 'Book 1-3 days before', '', 'https://www.eastjava.com/', 'Not started', 'Shared'],
  ['Cemoro Indah Homestay', 'Twin room, 1 night', 350000, 450000, 'Pay on site', 'Pay on site', '', 'https://www.booking.com/', 'Booked', 'Shared'],
  ['Surabaya → Banyuwangi train', 'Executive class, daytime', 180000, 240000, 'KAI Access', 'Book 7-14 days before', '', 'https://booking.kai.id/', 'Ready to book', 'Shared'],
  ['Airport transfer Surabaya', 'Grab from terminal', 120000, 180000, 'Grab app', 'Arrange on arrival', '', '', 'Not started', 'Shared'],
  ['Return flight SUB → HAN', 'Vietnam Airlines via SGN', 155, 198, 'Vietnam Airlines', 'Book now', '', 'https://www.vietnamairlines.com/', 'Not started', 'A'],
  ['Return flight SUB → SGN', 'Vietnam Airlines direct', 130, 175, 'Vietnam Airlines', 'Book now', '', 'https://www.vietnamairlines.com/', 'Not started', 'B'],
  ['Travel insurance', 'Annual multi-trip, covers hiking to 3000 m', 45, 68, 'Insurer website', 'Book now', '', 'https://www.worldnomads.com/', 'Researching', 'Shared'],
  ['Indonesia e-VOA', 'Apply online before departure', 35, 35, 'Immigration portal', 'Book 7-14 days before', '', 'https://evisa.imigrasi.go.id/', 'Not started', 'Shared'],
];

// ------------------------------------------------- Sources (named "Sheet4")
const sources = [
  ['Topic', 'Supported fact or assumption', 'URL', 'Notes'],
  ['Bromo entrance fee', 'Foreign visitor fee is Rp 220,000 on weekdays and Rp 320,000 at weekends.', 'https://bromotenggersemeru.org/', 'Checked June 2026. Fees changed in 2024, may change again.'],
  ['Ijen permit price', 'Assumed Rp 100,000 on weekdays — 2026 season price is unconfirmed.', '', 'Using the 2025 rate. Recheck before booking the guide.'],
  ['Bromo sunrise timing', 'Sunrise at Penanjakan is around 05:20 in July; jeeps leave Cemoro Lawang at 03:00.', 'https://www.timeanddate.com/sun/indonesia/surabaya', 'Verified against two operator itineraries.'],
  ['Singapore MRT from Changi', 'Last train from Changi Airport towards the city departs 23:18.', 'https://www.lta.gov.sg/', 'Verified on the operator site.'],
  ['Hawker centre payment', 'Most Maxwell stalls are cash-only; a few take PayNow.', 'https//singaporehawkerguide.com/maxwell', 'Link was copied wrong in the original plan — needs rechecking.'],
  ['Exchange rate', 'Assumed 1 USD = 15,500 IDR for the whole trip.', 'https://www.xe.com/', 'Fixed in June 2026 for planning. Actual rate will differ.'],
  ['KAI train booking window', 'Tickets open 45 days ahead; executive class sells out on weekends.', 'https://booking.kai.id/', 'Verified.'],
  ['Indonesia e-VOA', 'Visa on arrival costs IDR 500,000 and can be paid online in advance.', 'https://evisa.imigrasi.go.id/', 'Official portal. Price verified June 2026.'],
  ['Ijen gas masks', 'Proper respirators are supplied by licensed guides; cloth masks are not enough.', 'https://www.eastjava.com/', 'Two operators confirm this.'],
];

/** Build a worksheet from rows that may contain `{v,t,z}` cell descriptors. */
function toSheet(rows) {
  const sheet = XLSX.utils.aoa_to_sheet(
    rows.map((row) => row.map((cell) => (cell !== null && typeof cell === 'object' ? null : cell))),
  );
  rows.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell === null || typeof cell !== 'object') return;
      sheet[XLSX.utils.encode_cell({ r, c })] = { ...cell };
    });
  });
  return sheet;
}

const book = XLSX.utils.book_new();

const overviewSheet = toSheet(overview);
overviewSheet['!cols'] = [{ wch: 28 }, { wch: 64 }];
XLSX.utils.book_append_sheet(book, overviewSheet, 'Overview');

const itinerarySheet = toSheet(itinerary);
itinerarySheet['!cols'] = ITIN_HEADER.map((h) => ({ wch: Math.max(12, Math.min(h.length + 4, 30)) }));
XLSX.utils.book_append_sheet(book, itinerarySheet, 'Itinerary');

const bookingSheet = toSheet(bookings);
bookingSheet['!cols'] = bookings[0].map(() => ({ wch: 22 }));
XLSX.utils.book_append_sheet(book, bookingSheet, 'Booking Options');

const sourcesSheet = toSheet(sources);
sourcesSheet['!cols'] = [{ wch: 26 }, { wch: 70 }, { wch: 40 }, { wch: 50 }];
// Deliberately unhelpful name: role detection has to fall back to the header fingerprint.
XLSX.utils.book_append_sheet(book, sourcesSheet, 'Sheet4');

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, XLSX.write(book, { bookType: 'xlsx', type: 'buffer' }));
console.log(`Wrote ${outPath}`);
