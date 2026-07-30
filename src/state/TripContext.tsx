/**
 * The app's single source of truth for the imported trip and the traveler's own edits.
 *
 * The imported data is immutable; anything the traveler changes (booking status,
 * completed activities, dismissed issues) lives in `overrides` beside it. Because
 * imported record ids are content-derived, those overrides survive re-importing the
 * same workbook.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import type { BookingStatus, ImportResult } from '../domain/types';
import {
  DEFAULT_OVERRIDES,
  DEFAULT_PREFERENCES,
  clearTrip,
  loadPreferences,
  loadTrip,
  savePreferences,
  saveTrip,
  storageStatus,
  type Preferences,
  type StorageStatus,
  type UserOverrides,
} from './persistence';

interface TripState {
  /** Null until the first load attempt finishes. */
  result: ImportResult | null;
  overrides: UserOverrides;
  preferences: Preferences;
  hydrated: boolean;
  /** Set when persistence is not usable, so the UI can say the session is temporary. */
  storage: StorageStatus;
}

type TripAction =
  | { type: 'hydrated'; result: ImportResult | null; overrides: UserOverrides; preferences: Preferences; storage: StorageStatus }
  | { type: 'imported'; result: ImportResult }
  | { type: 'cleared' }
  | { type: 'bookingStatus'; id: string; status: BookingStatus }
  | { type: 'toggleComplete'; id: string }
  | { type: 'dismissIssue'; id: string }
  | { type: 'restoreIssue'; id: string }
  | { type: 'preferences'; patch: Partial<Preferences> }
  | { type: 'storage'; storage: StorageStatus };

const INITIAL: TripState = {
  result: null,
  overrides: DEFAULT_OVERRIDES,
  preferences: DEFAULT_PREFERENCES,
  hydrated: false,
  storage: 'unknown',
};

function reducer(state: TripState, action: TripAction): TripState {
  switch (action.type) {
    case 'hydrated':
      return {
        ...state,
        result: action.result,
        overrides: action.overrides,
        preferences: action.preferences,
        hydrated: true,
        storage: action.storage,
      };

    case 'imported':
      // A new import keeps existing overrides: re-importing a corrected workbook
      // should not wipe the booking statuses the traveler has been maintaining.
      return { ...state, result: action.result };

    case 'cleared':
      // Language and theme are the traveler's own choices, not trip data — clearing the
      // workbook should not silently switch the interface back to English.
      return {
        ...state,
        result: null,
        overrides: DEFAULT_OVERRIDES,
        preferences: { ...DEFAULT_PREFERENCES, language: state.preferences.language, theme: state.preferences.theme },
      };

    case 'bookingStatus':
      return {
        ...state,
        overrides: {
          ...state.overrides,
          bookingStatus: { ...state.overrides.bookingStatus, [action.id]: action.status },
        },
      };

    case 'toggleComplete': {
      const completed = state.overrides.completedItems.includes(action.id)
        ? state.overrides.completedItems.filter((id) => id !== action.id)
        : [...state.overrides.completedItems, action.id];
      return { ...state, overrides: { ...state.overrides, completedItems: completed } };
    }

    case 'dismissIssue':
      if (state.overrides.dismissedIssues.includes(action.id)) return state;
      return {
        ...state,
        overrides: { ...state.overrides, dismissedIssues: [...state.overrides.dismissedIssues, action.id] },
      };

    case 'restoreIssue':
      return {
        ...state,
        overrides: {
          ...state.overrides,
          dismissedIssues: state.overrides.dismissedIssues.filter((id) => id !== action.id),
        },
      };

    case 'preferences':
      return { ...state, preferences: { ...state.preferences, ...action.patch } };

    case 'storage':
      return { ...state, storage: action.storage };
  }
}

export interface TripContextValue extends TripState {
  setImportResult: (result: ImportResult) => void;
  clearAll: () => Promise<void>;
  setBookingStatus: (id: string, status: BookingStatus) => void;
  toggleItemComplete: (id: string) => void;
  dismissIssue: (id: string) => void;
  restoreIssue: (id: string) => void;
  setPreferences: (patch: Partial<Preferences>) => void;
}

const TripContext = createContext<TripContextValue | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  // Preferences are read synchronously so the very first render already uses the
  // stored language; the trip itself is async and arrives with the `hydrated` action.
  const [state, dispatch] = useReducer(reducer, INITIAL, (initial) => ({
    ...initial,
    preferences: loadPreferences(),
  }));

  // Hydrate once on mount.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadTrip();
      const preferences = loadPreferences();
      if (cancelled) return;
      dispatch({
        type: 'hydrated',
        result: stored?.result ?? null,
        overrides: stored?.overrides ?? DEFAULT_OVERRIDES,
        preferences,
        storage: storageStatus(),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist trip + overrides whenever either changes, after hydration.
  useEffect(() => {
    if (!state.hydrated || !state.result) return;
    let cancelled = false;
    void (async () => {
      const ok = await saveTrip({
        result: state.result!,
        overrides: state.overrides,
        savedAt: new Date().toISOString(),
      });
      if (!cancelled && !ok) dispatch({ type: 'storage', storage: 'unavailable' });
    })();
    return () => {
      cancelled = true;
    };
  }, [state.hydrated, state.result, state.overrides]);

  useEffect(() => {
    if (!state.hydrated) return;
    savePreferences(state.preferences);
  }, [state.hydrated, state.preferences]);

  const setImportResult = useCallback((result: ImportResult) => dispatch({ type: 'imported', result }), []);
  const setBookingStatus = useCallback(
    (id: string, status: BookingStatus) => dispatch({ type: 'bookingStatus', id, status }),
    [],
  );
  const toggleItemComplete = useCallback((id: string) => dispatch({ type: 'toggleComplete', id }), []);
  const dismissIssue = useCallback((id: string) => dispatch({ type: 'dismissIssue', id }), []);
  const restoreIssue = useCallback((id: string) => dispatch({ type: 'restoreIssue', id }), []);
  const setPreferences = useCallback((patch: Partial<Preferences>) => dispatch({ type: 'preferences', patch }), []);
  const clearAll = useCallback(async () => {
    await clearTrip();
    dispatch({ type: 'cleared' });
  }, []);

  const value = useMemo<TripContextValue>(
    () => ({
      ...state,
      setImportResult,
      clearAll,
      setBookingStatus,
      toggleItemComplete,
      dismissIssue,
      restoreIssue,
      setPreferences,
    }),
    [state, setImportResult, clearAll, setBookingStatus, toggleItemComplete, dismissIssue, restoreIssue, setPreferences],
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTripContext(): TripContextValue {
  const value = useContext(TripContext);
  if (!value) throw new Error('useTripContext must be used inside a TripProvider');
  return value;
}

/** The imported trip, or null when nothing has been imported yet. */
export function useTrip() {
  const { result } = useTripContext();
  return result?.trip ?? null;
}
