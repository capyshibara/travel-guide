/**
 * Capability checks for the optional browser APIs.
 *
 * Actions that depend on these are hidden when the API is missing, rather than shown
 * as buttons that silently do nothing.
 */

export function canShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export function canWriteClipboard(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.clipboard?.writeText === 'function' &&
    // The Clipboard API is only available in a secure context.
    (typeof window === 'undefined' || window.isSecureContext)
  );
}

export async function shareText(title: string, text: string): Promise<boolean> {
  if (!canShare()) return false;
  try {
    await navigator.share({ title, text });
    return true;
  } catch {
    // A cancelled share rejects; that is not an error worth surfacing.
    return false;
  }
}

export async function writeClipboard(text: string): Promise<boolean> {
  if (!canWriteClipboard()) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
