import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { I18nProvider } from '../i18n/I18nContext';
import { useT } from '../i18n/useT';
import { setLanguage, type Language } from '../i18n/locale';
import type { Messages } from '../i18n/en';
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
      <Localized>
        <ToastProvider>
          <ErrorBoundary>
            <Shell />
          </ErrorBoundary>
        </ToastProvider>
      </Localized>
    </TripProvider>
  );
}

/**
 * Publishes the language preference to both React and the Intl formatters.
 *
 * `setLanguage` is called during render rather than in an effect on purpose: the
 * formatters in `lib/format` read the module-level value while this same tree renders,
 * so deferring it to an effect would show one frame of dates in the previous locale.
 * The call is an idempotent assignment, so re-running it under Strict Mode is harmless.
 */
function Localized({ children }: { children: ReactNode }) {
  const { preferences } = useTripContext();
  const language: Language = preferences.language;
  setLanguage(language);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return <I18nProvider language={language}>{children}</I18nProvider>;
}

function Shell() {
  const { result, overrides, preferences, hydrated } = useTripContext();
  const route = useRoute(ROUTES);
  const navigate = useNavigate();
  const viewport = useViewport();
  const t = useT();
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

  const header = useMemo(() => headerFor(t, route.pattern, route.params, trip), [t, route.pattern, route.params, trip]);

  const content = (() => {
    if (!hydrated) {
      return (
        <div className={styles.stack} aria-busy="true">
          <SkeletonLoader height={120} radius="var(--radius-xl)" label={t.loading} />
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
              <ErrorBoundary title={t.errors.activityBoundary}>
                {panedItemId ? (
                  <ActivityDetailPage
                    itemId={panedItemId}
                    embedded
                    onNavigateItem={(id) => setPanedItemId(id)}
                  />
                ) : (
                  <p className={styles.muted}>{t.itinerary.selectActivity}</p>
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
        {t.app.skipToContent}
      </a>

      {isWide && trip ? (
        <Sidebar
          activeKey={navKey}
          tripTitle={trip.title}
          issueCount={issueCount}
          footer={
            <Button variant="ghost" size="sm" onClick={() => navigate('/more')}>
              {t.nav.settingsAndData}
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
                  label={t.nav.importDetails}
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

function headerFor(
  t: Messages,
  pattern: string | null,
  params: Record<string, string>,
  trip: Trip | null,
): HeaderSpec {
  if (!trip) return { title: t.app.name, subtitle: t.app.tagline };

  switch (pattern) {
    case '/import':
      return { title: t.header.import.title, subtitle: t.header.import.subtitle };
    case '/':
      return { title: trip.title, subtitle: trip.destinations.slice(0, 3).join(' → ') || undefined };
    case '/itinerary':
    case '/itinerary/:dayId': {
      const day = params.dayId ? findDay(trip, params.dayId) : null;
      const index = day ? trip.days.indexOf(day) + 1 : 0;
      const total = trip.days.filter((candidate) => candidate.date !== null).length;
      return {
        title: t.header.itinerary,
        subtitle: day && index > 0 && total > 0 ? t.header.dayOf(index, total) : undefined,
      };
    }
    case '/activity/:itemId': {
      const found = params.itemId ? findItem(trip, params.itemId) : null;
      return {
        title: t.header.activity,
        subtitle: found?.day.date ? formatDayLabel(found.day.date) : undefined,
        backTo: found ? `/itinerary/${encodeURIComponent(found.day.id)}` : '/itinerary',
      };
    }
    case '/budget':
      return { title: t.header.budget.title, subtitle: t.header.budget.subtitle };
    case '/bookings':
      return { title: t.header.bookings.title, subtitle: t.header.bookings.subtitle };
    case '/sources':
      return { title: t.header.sources.title, subtitle: t.header.sources.subtitle, backTo: '/more' };
    case '/issues':
      return { title: t.header.issues.title, subtitle: t.header.issues.subtitle, backTo: '/more' };
    case '/more':
      return { title: t.header.more };
    default:
      return { title: t.app.name };
  }
}

function NotFound() {
  const t = useT();
  return (
    <div className={styles.stack}>
      <h1 className={styles.pageTitle}>{t.notFound.title}</h1>
      <p className={styles.muted}>{t.notFound.body}</p>
      <Link to="/">{t.notFound.backToTrip}</Link>
    </div>
  );
}
