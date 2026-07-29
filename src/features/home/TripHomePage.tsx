import { useMemo } from 'react';
import {
  AssumptionCallout,
  Badge,
  Button,
  Card,
  CardButton,
  DataWarningBanner,
  Icon,
  TravelerAvatar,
} from '../../design-system';
import { ACTIVITY_ICON } from '../../design-system';
import { TripSummaryCard } from '../../design-system';
import shell from '../../app/AppShell.module.css';
import { useNavigate } from '../../app/router';
import { useTripContext } from '../../state/TripContext';
import {
  bookingProgress,
  countdownDays,
  dayCost,
  defaultDayId,
  findNowNext,
  actionableIssueCount,
} from '../../domain/selectors';
import {
  formatDateRange,
  formatDayLabel,
  formatMinutes,
  formatMoney,
  formatDelta,
  pluralize,
  todayIso,
} from '../../lib/format';
import { scopeInitials, scopeLabel, scopeSlot } from '../../import/travelers';
import type { Trip } from '../../domain/types';

export function TripHomePage() {
  const { result, overrides, preferences } = useTripContext();
  const navigate = useNavigate();
  const trip = result?.trip;

  // A single `now` for the whole render, so the hero and the schedule agree.
  const now = useMemo(() => new Date(), []);

  if (!trip || !result) return null;

  const { now: currentItem, next: nextItem } = findNowNext(trip, now);
  const progress = bookingProgress(trip, overrides);
  const countdown = countdownDays(trip, now);
  const issueCount = actionableIssueCount(result.issues, overrides);
  const today = trip.days.find((day) => day.date === todayIso(now));
  const upcoming = today ?? trip.days.find((day) => day.date !== null && day.date >= todayIso(now)) ?? trip.days[0];

  const highlight = currentItem ?? nextItem;
  const scenario = preferences.scenario;
  const groupBase = trip.totals.group.base;
  const groupFallback = trip.totals.group.fallback;

  return (
    <div className={shell.stackLoose}>
      <TripSummaryCard
        title={trip.title}
        subtitle={[
          trip.destinations.slice(0, 4).join(' → ') || 'Destinations not given',
          formatDateRange(trip.startDate, trip.endDate),
          trip.dayCount > 0 ? pluralize(trip.dayCount, 'day') : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        travelers={trip.travelers.map((traveler) => (
          <TravelerAvatar
            key={traveler.id}
            slot={traveler.slot}
            initials={traveler.initials}
            label={`${traveler.name}${traveler.departureCity ? `, departing from ${traveler.departureCity}` : ''}`}
          />
        ))}
        {...(countdown !== null ? { countdown: `Departs in ${pluralize(countdown, 'day')}` } : {})}
        {...(highlight
          ? {
              upNext: {
                label: currentItem ? 'Happening now' : 'Next up',
                value: `${highlight.start === null ? '' : `${formatMinutes(highlight.start)} · `}${highlight.activity}`,
              },
            }
          : {})}
        stats={[
          { label: `${scenario === 'base' ? 'Base' : 'Fallback'} budget`, value: formatMoney(scenario === 'base' ? groupBase : groupFallback, { compact: true }) },
          { label: 'vs. fallback', value: formatDelta(groupBase, groupFallback) },
          { label: 'Bookings', value: progress.label },
        ]}
      />

      {highlight ? (
        <Button size="lg" fullWidth onClick={() => navigate(`/activity/${encodeURIComponent(highlight.id)}`)}>
          {currentItem ? 'Open what’s on now' : 'Open what’s next'}
        </Button>
      ) : null}

      {issueCount > 0 ? (
        <DataWarningBanner
          count={issueCount}
          message={`${pluralize(issueCount, 'thing')} in your workbook ${issueCount === 1 ? 'needs' : 'need'} a look.`}
          onReview={() => navigate('/issues')}
        />
      ) : null}

      {trip.assumptions
        .filter((assumption) => assumption.kind === 'recheck')
        .slice(0, 2)
        .map((assumption) => (
          <AssumptionCallout key={assumption.id} kind="recheck">
            {assumption.detail}
          </AssumptionCallout>
        ))}

      {upcoming ? (
        <section className={shell.stack}>
          <div className={shell.rowBetween}>
            <h2 className={shell.sectionTitle}>
              {today ? 'Today' : 'Next day'} · {formatDayLabel(upcoming.date)}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate(`/itinerary/${encodeURIComponent(upcoming.id)}`)}>
              Full day
            </Button>
          </div>
          <Card flush>
            {upcoming.items.length === 0 ? (
              <p className={shell.muted} style={{ padding: 'var(--space-4)' }}>
                Nothing scheduled for this day.
              </p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {upcoming.items.slice(0, 4).map((item, index) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/activity/${encodeURIComponent(item.id)}`)}
                      style={{
                        display: 'flex',
                        gap: 'var(--space-3)',
                        alignItems: 'center',
                        width: '100%',
                        minHeight: 'var(--touch-min)',
                        padding: 'var(--space-3) var(--space-4)',
                        borderTop: index ? '1px solid var(--border-subtle)' : 'none',
                        borderLeft: 'none',
                        borderRight: 'none',
                        borderBottom: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontVariantNumeric: 'tabular-nums',
                          fontSize: 'var(--fs-body-sm)',
                          fontWeight: 'var(--fw-bold)',
                          width: 46,
                          flexShrink: 0,
                          color: item.id === currentItem?.id ? 'var(--color-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        {item.start === null ? '—' : formatMinutes(item.start)}
                      </span>
                      <Icon name={ACTIVITY_ICON[item.type]} size="xs" />
                      <span style={{ flex: 1, fontSize: 'var(--fs-body-sm)', fontWeight: 'var(--fw-semibold)' }}>
                        {item.activity}
                      </span>
                      {item.id === currentItem?.id ? <Badge tone="primary">Now</Badge> : null}
                      <TravelerAvatar
                        slot={scopeSlot(item.scope, trip.travelers)}
                        initials={scopeInitials(item.scope, trip.travelers)}
                        label={scopeLabel(item.scope, trip.travelers)}
                        size={24}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {upcoming.items.length > 0 ? (
            <p className={shell.muted}>
              {pluralize(upcoming.items.length, 'activity', 'activities')}
              {dayCost(upcoming, scenario, trip) ? ` · ${formatMoney(dayCost(upcoming, scenario, trip))}` : ''}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className={shell.grid2}>
        <SummaryTile
          label="Itinerary"
          value={itineraryLabel(trip, now)}
          onClick={() => navigate(defaultDayId(trip, now) ? `/itinerary/${encodeURIComponent(defaultDayId(trip, now)!)}` : '/itinerary')}
        />
        <SummaryTile
          label="Budget"
          value={formatMoney(scenario === 'base' ? groupBase : groupFallback, { compact: true })}
          onClick={() => navigate('/budget')}
        />
        <SummaryTile label="Bookings" value={`${progress.label} done`} onClick={() => navigate('/bookings')} />
        <SummaryTile
          label="Sources"
          value={pluralize(trip.sources.length, 'linked fact')}
          onClick={() => navigate('/sources')}
        />
      </section>
    </div>
  );
}

function SummaryTile({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <CardButton onClick={onClick}>
      <span className={shell.eyebrow}>{label}</span>
      <div style={{ fontSize: 'var(--fs-title-sm)', fontWeight: 'var(--fw-bold)', marginTop: 'var(--space-1)' }}>
        {value}
      </div>
    </CardButton>
  );
}

function itineraryLabel(trip: Trip, now: Date): string {
  const today = todayIso(now);
  const index = trip.days.findIndex((day) => day.date === today);
  const total = trip.days.filter((day) => day.date !== null).length;
  if (index >= 0 && total > 0) return `Day ${index + 1} of ${total}`;
  return pluralize(total, 'day');
}
