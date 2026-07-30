import type { ReactNode } from 'react';
import { CATALOGUES, type Language } from './locale';
import { I18nContext } from './useT';

export function I18nProvider({ language, children }: { language: Language; children: ReactNode }) {
  // The catalogue object is module-level and stable per language, so no memo is needed.
  return <I18nContext.Provider value={{ t: CATALOGUES[language], language }}>{children}</I18nContext.Provider>;
}
