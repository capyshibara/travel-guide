import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './AppShell.module.css';
import { cx } from '../lib/cx';
import {
  AppHeader,
  BottomNav,
  Button,
  Icon,
  IconButton,
  OfflineIndicator,
  Sidebar,
  SkeletonLoader,
  ToastProvider,
  activeNavKey,
} from '../design-system';
import { ErrorBoundary } from './ErrorBoundary';
import { Link, useNavigate, useRoute, useRouteChangeFocus } from './router';
import { useViewport } from './useViewport';
import { useOnlineStatus } from './useOnlineStatus';
import { TripProvider, useTripContext } from '../state/TripContext';
import { ImportPage } from '../features/import/ImportPage';
import { TripHomePage } from '../features/home/TripHomePage';
import { ItineraryPage } from '../features/itinerary/ItineraryPage';
import { ActivityDetailPage } from '../features/itinerary/ActivityDetailPage';
import { BudgetPage } from '../features/budget/BudgetPage';
import { BookingsPage } from '../features/bookings/BookingsPage';
import { SourcesPage } from '../features/sources/SourcesPage';
import { DataIssuesPage } from '../features/issues/DataIssuesPage';
import { MorePage } from '../features/more/MorePage';
import { actionableIssueCount, defaultDayId, findDay, findItem } from '../domain/selectors';
import { formatDayLabel } from '../lib/format';
import type { Trip } from '../domain/types';

const ROUTES = [
  '/',
  '/import',
  '/itinerary',
  '/itinerary/:dayId',
  '/activity/:itemId',
  '/budget',
  '/bookings',
  '/sources',
  '/issues',
  '/more',
] as const;

export function App() {
  return (
    <TripProvider>
      <ToastProvider>
        <ErrorBoundary>
          <Shell />
        </ErrorBoundary>
      </ToastProvider>
    </TripProvider>
  );
}

function Shell() {
  const { result, overrides, preferences, hydrated } = useTripContext();
  const route = useRoute(ROUTES);
  const navigate = useNavigate();
  const viewport = useViewport();
  const online = useOnlineStatus();
  const mainRef = useRef<HTMLElement>(null);
  useRouteChangeFocus(mainRef);

  // Desktop shows the itinerary and one activity side by side; mobile routes to it.
  const [panedItemId, setPanedItemId] = useState<string | null>(null);

  const trip = result?.trip ?? null;
  const isWide = viewport !== 'mobile';
  const navKey = activeNavKey(route.path);
  const issueCount = result ? actionableIssueCount(result.issues, overrides) : 0;

  // Apply the theme preference to the document, honouring "match my device".
  useEffect(() => {
    const root = document.documentElement;
    if (preferences.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', preferences.theme);
  }, [preferences.theme]);

  // Anything but /import needs a trip; send people to import until there is one.
  useEffect(() => {
    if (!hydrated) return;
    if (!trip && route.path !== '/import') navigate('/import', { replace: true });
  }, [hydrated, trip, route.path, navigate]);

  // A bare /itinerary resolves to a concrete day so the URL is shareable.
  useEffect(() => {
    if (!trip || route.pattern !== '/itinerary') return;
    const fallback = defaultDayId(trip);
    if (fallback) navigate(`/itinerary/${encodeURIComponent(fallback)}`, { replace: true });
  }, [trip, route.pattern, navigate]);

  const header = useMemo(() => headerFor(route.pattern, route.params, trip), [route.pattern, route.params, trip]);

  const content = (() => {
    if (!hydrated) {
      return (
        <div className={styles.stack} aria-busy="true">
          <SkeletonLoader height={120} radius="var(--radius-xl)" label="Loading your trip" />
          <SkeletonLoader height={72} radius="var(--radius-lg)" />
          <SkeletonLoader height={72} radius="var(--radius-lg)" />
        </div>
      );
    }

    switch (route.pattern) {
      case '/import':
        return <ImportPage />;
      case '/':
        return <TripHomePage />;
      case '/itinerary':
      case '/itinerary/:dayId': {
        const dayId = route.params.dayId ?? null;
        if (!isWide) return <ItineraryPage dayId={dayId} />;
        return (
          <div className={cx(styles.split, styles.splitWide)}>
            <ItineraryPage dayId={dayId} selectedItemId={panedItemId} onSelectItem={setPanedItemId} />
            <div className={styles.stickyPane}>
              <ErrorBoundary title="Couldn't show this activity">
                {panedItemId ? (
                  <ActivityDetailPage
                    itemId={panedItemId}
                    embedded
                    onNavigateItem={(id) => setPanedItemId(id)}
                  />
                ) : (
                  <p className={styles.muted}>Select an activity to see its full details here.</p>
                )}
              </ErrorBoundary>
            </div>
          </div>
        );
      }
      case '/activity/:itemId':
        return <ActivityDetailPage itemId={route.params.itemId ?? ''} />;
      case '/budget':
        return <BudgetPage />;
      case '/bookings':
        return <BookingsPage />;
      case '/sources':
        return <SourcesPage />;
      case '/issues':
        return <DataIssuesPage />;
      case '/more':
        return <MorePage />;
      default:
        return <NotFound />;
    }
  })();

  return (
    <div className={styles.root}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      {isWide && trip ? (
        <Sidebar
          activeKey={navKey}
          tripTitle={trip.title}
          issueCount={issueCount}
          footer={
            <Button variant="ghost" size="sm" onClick={() => navigate('/more')}>
              Settings &amp; data
            </Button>
          }
        />
      ) : null}

      <div className={styles.column}>
        <AppHeader
          title={header.title}
          {...(header.subtitle ? { subtitle: header.subtitle } : {})}
          {...(header.backTo && !isWide ? { onBack: () => navigate(header.backTo!) } : {})}
          right={
            <>
              {!online ? <OfflineIndicator stale /> : null}
              {trip && route.pattern !== '/import' ? (
                <IconButton
                  icon={<Icon name="file-spreadsheet" size="sm" />}
                  label="Import details"
                  onClick={() => navigate('/import')}
                />
              ) : null}
            </>
          }
        />

        <main className={styles.main} id="main" ref={mainRef} tabIndex={-1}>
          <div className={styles.mainInner}>
            <ErrorBoundary>{content}</ErrorBoundary>
          </div>
        </main>

        {!isWide && trip ? <BottomNav activeKey={navKey} moreBadge={issueCount > 0} /> : null}
      </div>
    </div>
  );
}

interface HeaderSpec {
  title: string;
  subtitle?: string | undefined;
  backTo?: string | undefined;
}

function headerFor(pattern: string | null, params: Record<string, string>, trip: Trip | null): HeaderSpec {
  if (!trip) return { title: 'Wayfare', subtitle: 'Your trip, day by day' };

  switch (pattern) {
    case '/import':
      return { title: 'Import', subtitle: 'Read your workbook' };
    case '/':
      return { title: trip.title, subtitle: trip.destinations.slice(0, 3).join(' → ') || undefined };
    case '/itinerary':
    case '/itinerary/:dayId': {
      const day = params.dayId ? findDay(trip, params.dayId) : null;
      const index = day ? trip.days.indexOf(day) + 1 : 0;
      const total = trip.days.filter((candidate) => candidate.date !== null).length;
      return {
        title: 'Itinerary',
        subtitle: day && index > 0 && total > 0 ? `Day ${index} of ${total}` : undefined,
      };
    }
    case '/activity/:itemId': {
      const found = params.itemId ? findItem(trip, params.itemId) : null;
      return {
        title: 'Activity',
        subtitle: found?.day.date ? formatDayLabel(found.day.date) : undefined,
        backTo: found ? `/itinerary/${encodeURIComponent(found.day.id)}` : '/itinerary',
      };
    }
    case '/budget':
      return { title: 'Budget', subtitle: 'Base and fallback' };
    case '/bookings':
      return { title: 'Bookings', subtitle: 'What to book, and when' };
    case '/sources':
      return { title: 'Sources', subtitle: 'What the plan is based on', backTo: '/more' };
    case '/issues':
      return { title: 'Data issues', subtitle: 'From your import', backTo: '/more' };
    case '/more':
      return { title: 'More' };
    default:
      return { title: 'Wayfare' };
  }
}

function NotFound() {
  return (
    <div className={styles.stack}>
      <h1 className={styles.pageTitle}>Page not found</h1>
      <p className={styles.muted}>That link does not match anything in Wayfare.</p>
      <Link to="/">Back to your trip</Link>
    </div>
  );
}
