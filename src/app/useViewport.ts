import { useSyncExternalStore } from 'react';

export type Viewport = 'mobile' | 'tablet' | 'desktop';

const TABLET_QUERY = '(min-width: 768px)';
const DESKTOP_QUERY = '(min-width: 1200px)';

function read(): Viewport {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'mobile';
  if (window.matchMedia(DESKTOP_QUERY).matches) return 'desktop';
  if (window.matchMedia(TABLET_QUERY).matches) return 'tablet';
  return 'mobile';
}

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined;
  const queries = [window.matchMedia(TABLET_QUERY), window.matchMedia(DESKTOP_QUERY)];
  for (const query of queries) query.addEventListener('change', callback);
  return () => {
    for (const query of queries) query.removeEventListener('change', callback);
  };
}

/**
 * Current breakpoint.
 *
 * Layout that CSS can express stays in CSS; this is for the cases where the two
 * layouts are genuinely different component trees — bottom nav versus sidebar, and
 * the desktop split view that renders a detail pane the mobile layout routes to.
 */
export function useViewport(): Viewport {
  return useSyncExternalStore(subscribe, read, () => 'mobile');
}
