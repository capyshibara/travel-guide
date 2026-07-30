/**
 * The active language, and the BCP 47 tag the Intl formatters use.
 *
 * `src/lib/format.ts` is called from deep inside render paths, so rather than thread a
 * locale through every call site the active tag is held here and updated in the same
 * synchronous action that changes the preference. React re-renders afterwards, so the
 * formatters and the visible text never disagree.
 */
import { en } from './en';
import { vi } from './vi';
import type { Messages } from './en';

export const LANGUAGES = ['en', 'vi'] as const;
export type Language = (typeof LANGUAGES)[number];

export const CATALOGUES: Record<Language, Messages> = { en, vi };

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/**
 * Pick a language from the browser's preferences.
 *
 * Matches on the primary subtag, so `vi-VN` and `vi` both resolve to Vietnamese.
 */
export function detectLanguage(candidates: readonly string[] = navigatorLanguages()): Language {
  for (const candidate of candidates) {
    const primary = candidate.toLowerCase().split('-')[0];
    if (isLanguage(primary)) return primary;
  }
  return 'en';
}

function navigatorLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  if (navigator.languages && navigator.languages.length > 0) return navigator.languages;
  return navigator.language ? [navigator.language] : [];
}

let activeLanguage: Language = 'en';
let activeLocale: string = resolveLocale('en');

export function getLanguage(): Language {
  return activeLanguage;
}

/** The Intl tag for the active language, e.g. `vi-VN`. */
export function getLocale(): string {
  return activeLocale;
}

/** Set before React re-renders, so formatted values match the rendered copy. */
export function setLanguage(language: Language): void {
  activeLanguage = language;
  activeLocale = resolveLocale(language);
}

/**
 * The Intl tag to format with, given a chosen language.
 *
 * Regional conventions and language are separate things: someone in the US reading the
 * English interface should still get "Aug 17" and "$16.13", while the same interface in
 * Britain gets "17 Aug" and "US$16.13". So the browser's own tag is kept whenever it
 * speaks the chosen language, and only falls back to the catalogue's default when the
 * reader has picked a language their browser is not set to.
 */
function resolveLocale(language: Language): string {
  for (const candidate of navigatorLanguages()) {
    if (candidate.toLowerCase().split('-')[0] === language && isUsableTag(candidate)) return candidate;
  }
  return CATALOGUES[language].meta.locale;
}

/**
 * Whether `Intl` will accept a tag.
 *
 * Browsers can report tags that are not valid BCP 47 — a Linux box with
 * `LANG=en_US.UTF-8@posix` surfaces `en-US@posix`, which makes every `Intl` constructor
 * throw a RangeError. Formatting is not worth crashing the page over, so an unusable
 * tag simply falls through to the catalogue's own locale.
 */
function isUsableTag(tag: string): boolean {
  try {
    Intl.getCanonicalLocales(tag);
    return true;
  } catch {
    return false;
  }
}
