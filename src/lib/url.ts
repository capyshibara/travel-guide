/**
 * URL safety at the render boundary.
 *
 * The importer already rejects anything that is not http(s), but every URL here came
 * from a user-supplied file and ends up in an `href`, so it is re-checked at the point
 * of use rather than trusted to have stayed clean in between.
 */
export function isSafeExternalUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** "traveloka.com" — the host, for showing where a link goes. */
export function displayHost(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value;
  }
}
