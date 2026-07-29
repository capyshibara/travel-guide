/**
 * A small hash router.
 *
 * Hash routing is what makes this work on GitHub Pages: the server only ever sees
 * `/<repo>/index.html`, so a refresh or a shared deep link cannot 404, and no SPA
 * fallback or 404.html trick is needed.
 *
 * This is ~100 lines instead of a routing library because the app has nine routes and
 * no data loaders, and because the one library candidate carries an open advisory with
 * no fixed release on its current major.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type AnchorHTMLAttributes,
  type ReactNode,
} from 'react';

export interface RouteMatch {
  /** Path with no leading `#`, always starting with `/`. */
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
}

function readHash(): string {
  const raw = window.location.hash.replace(/^#/, '');
  if (raw === '' || raw === '/') return '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

/** The current hash location, kept in sync via the browser's own event. */
export function useHashLocation(): string {
  return useSyncExternalStore(subscribe, readHash, () => '/');
}

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  const target = `#${to.startsWith('/') ? to : `/${to}`}`;
  if (options.replace) {
    window.history.replaceState(null, '', target);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = target;
  }
}

const NavigateContext = createContext<(to: string, options?: { replace?: boolean }) => void>(navigate);

export function useNavigate() {
  return useContext(NavigateContext);
}

/**
 * Match a location against `/pattern/:param` templates.
 * Returns the first pattern that matches, with its params extracted.
 */
export function matchRoute(location: string, patterns: readonly string[]): { pattern: string; params: Record<string, string> } | null {
  const [pathPart = '/'] = location.split('?');
  const segments = pathPart.split('/').filter(Boolean);

  for (const pattern of patterns) {
    const patternSegments = pattern.split('/').filter(Boolean);
    if (patternSegments.length !== segments.length) continue;

    const params: Record<string, string> = {};
    let matched = true;
    for (let i = 0; i < patternSegments.length; i += 1) {
      const patternSegment = patternSegments[i]!;
      const segment = segments[i]!;
      if (patternSegment.startsWith(':')) {
        params[patternSegment.slice(1)] = decodeURIComponent(segment);
      } else if (patternSegment !== segment) {
        matched = false;
        break;
      }
    }
    if (matched) return { pattern, params };
  }
  return null;
}

export function useRoute(patterns: readonly string[]): RouteMatch & { pattern: string | null } {
  const location = useHashLocation();
  return useMemo(() => {
    const [pathPart = '/', queryPart = ''] = location.split('?');
    const match = matchRoute(location, patterns);
    return {
      path: pathPart,
      pattern: match?.pattern ?? null,
      params: match?.params ?? {},
      query: new URLSearchParams(queryPart),
    };
  }, [location, patterns]);
}

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  children: ReactNode;
}

/**
 * An anchor with a real `href`, so middle-click, "open in new tab" and the browser's
 * own status bar all work — the hash means the destination is a genuine URL.
 */
export function Link({ to, children, onClick, ...rest }: LinkProps) {
  const go = useNavigate();
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      // Let the browser handle modified clicks.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      go(to);
    },
    [go, onClick, to],
  );

  return (
    <a href={`#${to}`} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}

/**
 * Move focus and scroll to the top of the main region on navigation.
 *
 * Without this a hash-routed app leaves keyboard focus wherever it was and the new
 * page silently starts mid-scroll.
 */
export function useRouteChangeFocus(mainRef: React.RefObject<HTMLElement | null>): void {
  const location = useHashLocation();
  useEffect(() => {
    const node = mainRef.current;
    if (!node) return;
    // `Element.scrollTo` is not universal (older Safari, and jsdom under test).
    if (typeof node.scrollTo === 'function') node.scrollTo({ top: 0 });
    else node.scrollTop = 0;
    // The region carries tabIndex -1, so it is focusable without joining the tab order.
    node.focus({ preventScroll: true });
  }, [location, mainRef]);
}
