/**
 * Test harness that boots the real app against a seeded trip.
 *
 * The persistence layer is stubbed rather than the context, so tests exercise the
 * genuine hydrate -> render path including the provider and the router.
 */
import { vi } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { buildTrip } from '../import/buildTrip';
import type { ImportResult } from '../domain/types';
import type { Language } from '../i18n/locale';
import {
  ITINERARY_HEADER,
  OVERVIEW_ROWS,
  dateCell,
  makeWorkbook,
  timeCell,
  type CellInput,
} from '../import/__tests__/fixtures';

/** A two-traveler trip with an overnight activity, a booking and a data issue. */
export function sampleImport(): ImportResult {
  const rows: CellInput[][] = [
    ITINERARY_HEADER,
    [
      dateCell(2026, 8, 17), timeCell(6, 30), timeCell(9, 45), '', 'Indonesia', 'Surabaya', 'Flight',
      'Singapore (SIN) → Surabaya (SUB)', 'Flight SIN → SUB', 'Book 7-14 days before', 'USD', 74, 96,
      'https://example.com/flight', 'Both travelers on the same flight.', 'Shared',
    ],
    [
      dateCell(2026, 8, 17), timeCell(23, 40), timeCell(6, 15), '', 'Indonesia', 'Cemoro Lawang', 'Tour',
      'Cemoro Lawang → Mt. Bromo viewpoint', 'Bromo sunrise trek', 'Book jeep 3 days before', 'IDR', 250000, 320000,
      'https://example.com/bromo', 'Bring a headlamp.', 'Shared',
    ],
    [
      dateCell(2026, 8, 18), timeCell(9, 0), timeCell(11, 0), '', 'Indonesia', 'Banyuwangi', 'Prep',
      'Banyuwangi town', 'Laundry and repack', '', 'IDR', 50000, 75000, '', 'Only place open before noon.', '',
    ],
    [
      dateCell(2026, 8, 19), timeCell(9, 0), timeCell(12, 0), '', 'Singapore', 'Singapore', 'Sightseeing',
      'Gardens by the Bay', 'Gardens by the Bay', '', 'USD', 20, 28, '', '', 'A',
    ],
  ];

  return buildTrip(
    makeWorkbook({
      Overview: OVERVIEW_ROWS,
      Itinerary: rows,
      'Booking Options': [
        ['Item', 'Target price', 'Booking timing', 'Status', 'URL'],
        ['Flight SIN → SUB', 74, 'Book 7-14 days before', 'Ready to book', 'https://example.com/flight'],
        ['Bromo jeep tour', 250000, 'Book 1-3 days before', 'Not started', ''],
        ['Travel insurance', 45, 'Book now', 'Researching', ''],
      ],
      Sheet4: [
        ['Topic', 'Supported fact', 'URL', 'Notes'],
        ['Bromo entrance fee', 'Foreign visitor fee is Rp 220,000 on weekdays.', 'https://example.com/fees', 'Checked 2026'],
        ['Ijen permit price', 'Assumed Rp 100,000 — unconfirmed for 2026.', '', 'Recheck before booking.'],
      ],
    }),
    { name: 'sample-trip.xlsx', size: 4096 },
  );
}

export interface HarnessOptions {
  /** Pass null to render the app with nothing imported. */
  result?: ImportResult | null;
  route?: string;
}

/**
 * Install the persistence stub. Must be called before the module under test imports
 * `state/persistence`, so tests call it at module scope via `vi.mock`'s factory.
 */
export function persistenceStub(getResult: () => ImportResult | null, getLanguage: () => Language = () => 'en') {
  return {
    DEFAULT_OVERRIDES: { bookingStatus: {}, completedItems: [], dismissedIssues: [] },
    DEFAULT_PREFERENCES: { scenario: 'base', travelerFilter: 'all', theme: 'system', language: 'en' },
    storageStatus: () => 'ready' as const,
    loadTrip: vi.fn(async () => {
      const result = getResult();
      return result
        ? { result, overrides: { bookingStatus: {}, completedItems: [], dismissedIssues: [] }, savedAt: '' }
        : null;
    }),
    saveTrip: vi.fn(async () => true),
    clearTrip: vi.fn(async () => undefined),
    loadPreferences: () => ({
      scenario: 'base' as const,
      travelerFilter: 'all',
      theme: 'system' as const,
      language: getLanguage(),
    }),
    savePreferences: vi.fn(),
  };
}

/** Render a tree at a given hash route. */
export function renderAt(ui: ReactElement, route = '/') {
  window.location.hash = `#${route}`;
  return render(ui);
}
