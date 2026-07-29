/**
 * Typed local persistence.
 *
 * IndexedDB holds the normalized trip (it can be megabytes and localStorage cannot);
 * localStorage holds small preferences. Every call is wrapped so a failure — private
 * browsing, a full quota, a browser with IndexedDB disabled — degrades to an in-memory
 * session rather than breaking the app.
 *
 * The original workbook file is never stored. Only the normalized trip is, and only
 * so a returning traveler does not have to re-upload it.
 */
import type { BookingStatus, ImportResult } from '../domain/types';

const DB_NAME = 'wayfare';
const DB_VERSION = 1;
const TRIP_STORE = 'trip';
const TRIP_KEY = 'current';
const PREFS_KEY = 'wayfare.preferences.v1';

export interface UserOverrides {
  /** Booking id -> status the traveler set themselves. */
  bookingStatus: Record<string, BookingStatus>;
  /** Itinerary item ids the traveler marked done. */
  completedItems: string[];
  /** Import issue ids the traveler dismissed. */
  dismissedIssues: string[];
}

export interface Preferences {
  scenario: 'base' | 'fallback';
  travelerFilter: string;
  theme: 'light' | 'dark' | 'system';
}

export const DEFAULT_OVERRIDES: UserOverrides = {
  bookingStatus: {},
  completedItems: [],
  dismissedIssues: [],
};

export const DEFAULT_PREFERENCES: Preferences = {
  scenario: 'base',
  travelerFilter: 'all',
  theme: 'system',
};

/** What we keep between visits. */
export interface StoredTrip {
  result: ImportResult;
  overrides: UserOverrides;
  savedAt: string;
}

export type StorageStatus = 'unknown' | 'ready' | 'unavailable';

let dbPromise: Promise<IDBDatabase> | null = null;
let status: StorageStatus = 'unknown';

export function storageStatus(): StorageStatus {
  return status;
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TRIP_STORE)) db.createObjectStore(TRIP_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    request.onblocked = () => reject(new Error('IndexedDB blocked'));
  });
  return dbPromise;
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(TRIP_STORE, mode);
    const request = run(transaction.objectStore(TRIP_STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

export async function saveTrip(trip: StoredTrip): Promise<boolean> {
  try {
    await withStore('readwrite', (store) => store.put(trip, TRIP_KEY));
    status = 'ready';
    return true;
  } catch {
    // Deliberately not logged: the error can carry workbook contents.
    status = 'unavailable';
    return false;
  }
}

export async function loadTrip(): Promise<StoredTrip | null> {
  try {
    const value = await withStore<StoredTrip | undefined>('readonly', (store) => store.get(TRIP_KEY));
    status = 'ready';
    return value ?? null;
  } catch {
    status = 'unavailable';
    return null;
  }
}

export async function clearTrip(): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.delete(TRIP_KEY));
  } catch {
    status = 'unavailable';
  }
  try {
    localStorage.removeItem(PREFS_KEY);
  } catch {
    // Nothing to do — the caller resets in-memory state either way.
  }
}

export function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_PREFERENCES;
    const candidate = parsed as Partial<Preferences>;
    return {
      scenario: candidate.scenario === 'fallback' ? 'fallback' : 'base',
      travelerFilter: typeof candidate.travelerFilter === 'string' ? candidate.travelerFilter : 'all',
      theme: candidate.theme === 'dark' || candidate.theme === 'light' ? candidate.theme : 'system',
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(preferences: Preferences): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
  } catch {
    // Preferences are a convenience; losing them must never break a session.
  }
}
