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
  const [showAllDetails, setShowAllDetails] = useState(false);

  const trip = result?.trip;
  const found = trip ? findItem(trip, itemId) : null;
  const ordered = useMemo(() => (trip ? flatItems(trip) : []), [trip]);

  if (!trip) return null;

  if (!found) {
    return (
      <EmptyState
        icon="map"
        title="Activity not found"
        description="It may have come from a workbook that has since been replaced."
        action={<Button onClick={() => navigate('/itinerary')}>Back to itinerary</Button>}
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
            {day.date ? formatFullDate(day.date) : 'No date given'} · {scopeLabel(item.scope, trip.travelers)}
          </p>
        </div>
        <TravelerAvatar
          slot={scopeSlot(item.scope, trip.travelers)}
          initials={scopeInitials(item.scope, trip.travelers)}
          label={scopeLabel(item.scope, trip.travelers)}
        />
      </header>

      {item.scope.kind === 'unassigned' ? (
        <AssumptionCallout kind="recheck">
          Your workbook did not say which traveler this is for, so it is shown for everyone and left out of per-traveler
          totals.
        </AssumptionCallout>
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
          <ActivityTypeBadge type={item.type} label={item.typeLabel} />
        </div>
        {item.durationDerived && item.durationMinutes ? (
          <p className={shell.muted} style={{ marginTop: 'var(--space-2)' }}>
            Duration calculated from the start and end times.
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
        <Card eyebrow="Good to know">
          <p style={{ lineHeight: 'var(--lh-normal)' }}>{item.notes}</p>
        </Card>
      ) : null}

      {item.practical.length > 0 ? (
        <Card eyebrow="Practical needs">
          <dl className={styles.practicalList}>
            {item.practical.map((entry) => (
              <div key={entry.label} className={styles.practicalRow}>
                <dt className={styles.practicalLabel}>{entry.label}</dt>
                <dd className={styles.practicalValue}>{entry.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : null}

      {item.bookingAction || booking ? (
        <Card eyebrow="Booking">
          {item.bookingAction ? <p>{item.bookingAction}</p> : null}
          {booking ? (
            <div className={shell.stack} style={{ marginTop: 'var(--space-3)' }}>
              <div className={shell.rowBetween}>
                <span className={shell.muted}>{booking.item}</span>
                <BookingStatusChip status={effectiveBookingStatus(booking, overrides)} />
              </div>
              <Button variant="secondary" size="sm" onClick={() => navigate('/bookings')}>
                Open in booking checklist
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}

      {item.baseCost || item.fallbackCost ? (
        <Card eyebrow="Cost">
          <div className={styles.costPair}>
            <div>
              <p className={styles.costLabel}>Base</p>
              <CostDisplay
                amount={item.baseCost}
                converted={item.convertedBase}
                scenario="base"
                showScenarioLabel
                align="start"
              />
            </div>
            <div>
              <p className={styles.costLabel}>Fallback</p>
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
              Shared cost — split {item.scope.travelerIds.length} ways in per-traveler totals.
            </p>
          ) : null}
        </Card>
      ) : null}

      {/* Progressive disclosure: the source of a row is useful, but not up front. */}
      {showAllDetails ? (
        <Card eyebrow="Where this came from">
          <p className={shell.muted}>
            {item.origin.sheet}, row {item.origin.row}
          </p>
          {item.rawType ? (
            <p className={shell.muted} style={{ marginTop: 'var(--space-2)' }}>
              Segment type in your workbook: “{item.rawType}” — not a type Wayfare recognizes, so a generic icon is used.
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
          Show where this came from
        </Button>
      )}

      {item.sourceUrl ? <ExternalLinkButton href={item.sourceUrl} label="Open source link" /> : null}

      <div className={styles.detailActions}>
        <Button
          variant={completed ? 'secondary' : 'primary'}
          icon={<Icon name={completed ? 'check-circle-2' : 'check'} size="sm" />}
          onClick={() => {
            toggleItemComplete(item.id);
            toast(completed ? 'Marked as not done' : 'Marked as done', completed ? 'neutral' : 'success');
          }}
        >
          {completed ? 'Done' : 'Mark as done'}
        </Button>

        {/* Hidden rather than shown-and-broken where the browser has no such API. */}
        {canShare() ? (
          <Button
            variant="secondary"
            icon={<Icon name="share-2" size="sm" />}
            onClick={() => void shareText(item.activity, summaryText)}
          >
            Share
          </Button>
        ) : null}
        {canWriteClipboard() ? (
          <Button
            variant="secondary"
            icon={<Icon name="copy" size="sm" />}
            onClick={async () => {
              const ok = await writeClipboard(summaryText);
              toast(ok ? 'Activity details copied' : "Couldn't copy — your browser blocked it", ok ? 'success' : 'warning');
            }}
          >
            Copy details
          </Button>
        ) : null}
      </div>

      <nav className={styles.prevNext} aria-label="Activity navigation">
        <Button
          variant="secondary"
          size="sm"
          disabled={!previous}
          icon={<Icon name="chevron-left" size="sm" />}
          onClick={() => previous && goTo(previous.id)}
        >
          <span className={styles.prevNextLabel}>{previous ? previous.activity : 'Start of trip'}</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!next}
          onClick={() => next && goTo(next.id)}
        >
          <span className={styles.prevNextLabel}>{next ? next.activity : 'End of trip'}</span>
          <Icon name="chevron-right" size="sm" />
        </Button>
      </nav>

      {!embedded ? (
        <Button variant="ghost" onClick={() => navigate(`/itinerary/${encodeURIComponent(day.id)}`)}>
          Back to {day.date ? formatFullDate(day.date) : 'the itinerary'}
        </Button>
      ) : null}

      {completed ? (
        <Badge tone="success">
          <Icon name="check" size="xs" />
          Marked done on this device
        </Badge>
      ) : null}

      <p className={shell.muted}>
        {formatMoney(item.baseCost) === '—' ? 'No cost recorded for this activity.' : null}
      </p>
    </div>
  );
}

function routeLabel(from?: string, to?: string, place?: string): string | null {
  if (from && to) return `${from} → ${to}`;
  return from ?? place ?? null;
}
