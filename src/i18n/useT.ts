/**
 * The active message catalogue, as React state.
 *
 * Kept apart from the provider component so that neither file mixes components with
 * plain values — which is what lets Fast Refresh reload either one cleanly.
 */
import { createContext, useContext } from 'react';
import type { Messages } from './en';
import { CATALOGUES, type Language } from './locale';

export interface I18nValue {
  t: Messages;
  language: Language;
}

export const I18nContext = createContext<I18nValue>({ t: CATALOGUES.en, language: 'en' });

/**
 * Returns the whole catalogue rather than a lookup function, so every string is
 * reached by a typed property path (`t.budget.title`) and a missing or misspelled key
 * is a compile error rather than a blank space at runtime.
 */
export function useT(): Messages {
  return useContext(I18nContext).t;
}

export function useLanguage(): Language {
  return useContext(I18nContext).language;
}
