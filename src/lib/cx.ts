/**
 * Join class names, dropping anything falsy.
 *
 * CSS-module lookups are `string | undefined` under `noUncheckedIndexedAccess`, so
 * every component would otherwise need a non-null assertion per class. This keeps that
 * noise in one place.
 */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter((part): part is string => typeof part === 'string' && part.length > 0).join(' ');
}
