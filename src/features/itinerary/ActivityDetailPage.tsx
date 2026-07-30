import { useMemo, useState } from 'react';
import {
  AssumptionCallout,
  Badge,
  BookingStatusChip,
  Button,
  Card,
  CostDisplay,
  ExternalLinkButton,
  Icon,
  RouteDisplay,
  TimeDurationBlock,
  TravelerAvatar,
  ActivityTypeBadge,
  EmptyState,
  useToast,
} from '../../design-system';
import shell from '../../app/AppShell.module.css';
import styles from './itinerary.module.css';
import { useNavigate } from '../../app/router';
import { useTripContext } from '../../state/TripContext';
import { effectiveBookingStatus, findItem, flatItems } from '../../domain/selectors';
import { formatFullDate, formatMoney } from '../../lib/format';
import { scopeInitials, scopeLabel, scopeSlot } from '../../import/travelers';
import { canShare, canWriteClipboard, shareText, writeClipboard } from '../../lib/share';
import { useT } from '../../i18n/useT';

export interface ActivityDetailPageProps {
  itemId: string;
  /** On desktop the detail sits in a pane, so there is no back button. */
  embedded?: boolean;
  onNavigateItem?: (itemId: string) => void;
}

export function ActivityDetailPage({ itemId, embedded, onNavigateItem }: ActivityDetailPageProps) {
  const { result, overrides, toggleItemComplete } = useTripContext();
  const navigate = useNavigate();
  const toast = useToast();
  const t = useT();
  const [showAllDetails, setShowAllDetails] = useState(false);

  const trip = result?.trip;
  const found = trip ? findItem(trip, itemId) : null;
  const ordered = useMemo(() => (trip ? flatItems(trip) : []), [trip]);

  if (!trip) return null;

  if (!found) {
    return (
      <EmptyState
        icon="map"
        title={t.activity.notFound}
        description={t.activity.notFoundBody}
        action={<Button onClick={() => navigate('/itinerary')}>{t.activity.backToItinerary}</Button>}
      />
    );
  }

  const { item, day } = found;
  const Title = embedded ? 'h2' : 'h1';
  const index = ordered.findIndex((candidate) => candidate.id === item.id);
  const previous = index > 0 ? ordered[index - 1] : undefined;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : undefined;
  const booking = trip.bookings.find((candidate) => candidate.id === item.bookingItemId);
  const sources = trip.sources.filter((source) => source.relatedItemIds.includes(item.id));
  const completed = overrides.completedItems.includes(item.id);

  const goTo = (id: string) => {
    if (onNavigateItem) onNavigateItem(id);
    else navigate(`/activity/${encodeURIComponent(id)}`);
  };

  const summaryText = [
    item.activity,
    day.date ? formatFullDate(day.date) : null,
    item.startText || item.endText ? `${item.startText ?? ''}${item.endText ? `–${item.endText}` : ''}` : null,
    routeLabel(item.routeFrom, item.routeTo, item.place),
    item.bookingAction,
    item.sourceUrl,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div className={shell.stackLoose}>
      <header className={styles.detailHeader}>
        <div>
          {/* Standalone this is the page heading; in the desktop split pane it sits
              beside the itinerary's own h1, so it steps down a level. */}
          <Title className={styles.detailTitle}>{item.activity}</Title>
          <p className={styles.detailMeta}>
            {formatFullDate(day.date, t.itinerary.noDate)} · {scopeLabel(item.scope, trip.travelers, t.traveler)}
          </p>
        </div>
        <TravelerAvatar
          slot={scopeSlot(item.scope, trip.travelers)}
          initials={scopeInitials(item.scope, trip.travelers)}
          label={scopeLabel(item.scope, trip.travelers, t.traveler)}
        />
      </header>

      {item.scope.kind === 'unassigned' ? (
        <AssumptionCallout kind="recheck">{t.activity.unassignedWarning}</AssumptionCallout>
      ) : null}

      <Card>
        <div className={styles.detailRow}>
          <TimeDurationBlock
            start={item.start}
            end={item.end}
            {...(item.startText ? { startText: item.startText } : {})}
            {...(item.endText ? { endText: item.endText } : {})}
            durationMinutes={item.durationMinutes}
            crossesMidnight={item.crossesMidnight}
          />
          <ActivityTypeBadge type={item.type} label={item.typeLabel ?? t.activityType[item.type]} />
        </div>
        {item.durationDerived && item.durationMinutes ? (
          <p className={shell.muted} style={{ marginTop: 'var(--space-2)' }}>
            {t.activity.durationDerived}
          </p>
        ) : null}
        {routeLabel(item.routeFrom, item.routeTo, item.place) ? (
          <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
            <RouteDisplay
              from={item.routeFrom ?? item.place ?? ''}
              {...(item.routeTo ? { to: item.routeTo } : {})}
              type={item.type}
            />
            {item.city || item.country ? (
              <p className={shell.muted} style={{ marginTop: 'var(--space-1)' }}>
                {[item.city, item.country].filter(Boolean).join(', ')}
              </p>
            ) : null}
          </div>
        ) : null}
      </Card>

      {item.notes ? (
        <Card eyebrow={t.activity.goodToKnow}>
          <p style={{ lineHeight: 'var(--lh-normal)' }}>{item.notes}</p>
        </Card>
      ) : null}

      {item.practical.length > 0 ? (
        <Card eyebrow={t.activity.practicalNeeds}>
          <dl className={styles.practicalList}>
            {item.practical.map((entry) => (
              <div key={entry.field} className={styles.practicalRow}>
                <dt className={styles.practicalLabel}>{t.practical[entry.field]}</dt>
                <dd className={styles.practicalValue}>{entry.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : null}

      {item.bookingAction || booking ? (
        <Card eyebrow={t.activity.booking}>
          {item.bookingAction ? <p>{item.bookingAction}</p> : null}
          {booking ? (
            <div className={shell.stack} style={{ marginTop: 'var(--space-3)' }}>
              <div className={shell.rowBetween}>
                <span className={shell.muted}>{booking.item}</span>
                <BookingStatusChip status={effectiveBookingStatus(booking, overrides)} />
              </div>
              <Button variant="secondary" size="sm" onClick={() => navigate('/bookings')}>
                {t.activity.openInBookings}
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}

      {item.baseCost || item.fallbackCost ? (
        <Card eyebrow={t.activity.cost}>
          <div className={styles.costPair}>
            <div>
              <p className={styles.costLabel}>{t.scenario.base}</p>
              <CostDisplay
                amount={item.baseCost}
                converted={item.convertedBase}
                scenario="base"
                showScenarioLabel
                align="start"
              />
            </div>
            <div>
              <p className={styles.costLabel}>{t.scenario.fallback}</p>
              <CostDisplay
                amount={item.fallbackCost}
                converted={item.convertedFallback}
                scenario="fallback"
                showScenarioLabel
                align="start"
              />
            </div>
          </div>
          {item.scope.kind === 'shared' && item.scope.travelerIds.length > 1 ? (
            <p className={shell.muted} style={{ marginTop: 'var(--space-3)' }}>
              {t.activity.sharedCost(item.scope.travelerIds.length)}
            </p>
          ) : null}
        </Card>
      ) : null}

      {/* Progressive disclosure: the source of a row is useful, but not up front. */}
      {showAllDetails ? (
        <Card eyebrow={t.activity.whereFrom}>
          <p className={shell.muted}>{t.activity.fromSheetRow(item.origin.sheet, item.origin.row)}</p>
          {item.rawType ? (
            <p className={shell.muted} style={{ marginTop: 'var(--space-2)' }}>
              {t.activity.rawTypeNote(item.rawType)}
            </p>
          ) : null}
          {sources.length > 0 ? (
            <div className={shell.stack} style={{ marginTop: 'var(--space-3)' }}>
              {sources.map((source) => (
                <div key={source.id}>
                  <p className={shell.muted}>{source.fact}</p>
                  {source.url ? <ExternalLinkButton href={source.url} label={source.topic} /> : null}
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      ) : (
        <Button variant="ghost" onClick={() => setShowAllDetails(true)}>
          {t.activity.showWhereFrom}
        </Button>
      )}

      {item.sourceUrl ? <ExternalLinkButton href={item.sourceUrl} label={t.activity.openSourceLink} /> : null}

      <div className={styles.detailActions}>
        <Button
          variant={completed ? 'secondary' : 'primary'}
          icon={<Icon name={completed ? 'check-circle-2' : 'check'} size="sm" />}
          onClick={() => {
            toggleItemComplete(item.id);
            toast(completed ? t.activity.markedNotDone : t.activity.markedDone, completed ? 'neutral' : 'success');
          }}
        >
          {completed ? t.activity.done : t.activity.markDone}
        </Button>

        {/* Hidden rather than shown-and-broken where the browser has no such API. */}
        {canShare() ? (
          <Button
            variant="secondary"
            icon={<Icon name="share-2" size="sm" />}
            onClick={() => void shareText(item.activity, summaryText)}
          >
            {t.activity.share}
          </Button>
        ) : null}
        {canWriteClipboard() ? (
          <Button
            variant="secondary"
            icon={<Icon name="copy" size="sm" />}
            onClick={async () => {
              const ok = await writeClipboard(summaryText);
              toast(ok ? t.activity.copied : t.activity.copyFailed, ok ? 'success' : 'warning');
            }}
          >
            {t.activity.copyDetails}
          </Button>
        ) : null}
      </div>

      <nav className={styles.prevNext} aria-label={t.activity.navLabel}>
        <Button
          variant="secondary"
          size="sm"
          disabled={!previous}
          icon={<Icon name="chevron-left" size="sm" />}
          onClick={() => previous && goTo(previous.id)}
        >
          <span className={styles.prevNextLabel}>{previous ? previous.activity : t.activity.startOfTrip}</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!next}
          onClick={() => next && goTo(next.id)}
        >
          <span className={styles.prevNextLabel}>{next ? next.activity : t.activity.endOfTrip}</span>
          <Icon name="chevron-right" size="sm" />
        </Button>
      </nav>

      {!embedded ? (
        <Button variant="ghost" onClick={() => navigate(`/itinerary/${encodeURIComponent(day.id)}`)}>
          {t.activity.backToDay(formatFullDate(day.date, t.nav.itinerary))}
        </Button>
      ) : null}

      {completed ? (
        <Badge tone="success">
          <Icon name="check" size="xs" />
          {t.activity.doneOnDevice}
        </Badge>
      ) : null}

      <p className={shell.muted}>
        {formatMoney(item.baseCost) === '—' ? t.activity.noCost : null}
      </p>
    </div>
  );
}

function routeLabel(from?: string, to?: string, place?: string): string | null {
  if (from && to) return `${from} → ${to}`;
  return from ?? place ?? null;
}
