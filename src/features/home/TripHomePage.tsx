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
import { formatDateRange, formatDayLabel, formatMinutes, formatMoney, formatDelta, todayIso } from '../../lib/format';
import { scopeInitials, scopeLabel, scopeSlot, travelerName } from '../../import/travelers';
import { useT } from '../../i18n/useT';
import type { Messages } from '../../i18n/en';
import type { Trip } from '../../domain/types';

export function TripHomePage() {
  const { result, overrides, preferences } = useTripContext();
  const navigate = useNavigate();
  const t = useT();
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
          trip.destinations.slice(0, 4).join(' → ') || t.home.destinationsMissing,
          formatDateRange(trip.startDate, trip.endDate),
          trip.dayCount > 0 ? t.common.days(trip.dayCount) : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        travelers={trip.travelers.map((traveler) => (
          <TravelerAvatar
            key={traveler.id}
            slot={traveler.slot}
            initials={traveler.initials}
            label={`${travelerName(traveler, t.traveler)}${
              traveler.departureCity ? `, ${t.traveler.departingFrom(traveler.departureCity)}` : ''
            }`}
          />
        ))}
        {...(countdown !== null ? { countdown: t.home.departsIn(countdown) } : {})}
        {...(highlight
          ? {
              upNext: {
                label: currentItem ? t.home.happeningNow : t.home.nextUp,
                value: `${highlight.start === null ? '' : `${formatMinutes(highlight.start)} · `}${highlight.activity}`,
              },
            }
          : {})}
        stats={[
          {
            label: scenario === 'base' ? t.home.baseBudget : t.home.fallbackBudget,
            value: formatMoney(scenario === 'base' ? groupBase : groupFallback, { compact: true }),
          },
          { label: t.home.vsFallback, value: formatDelta(groupBase, groupFallback) },
          { label: t.home.bookingsStat, value: progress.label },
        ]}
      />

      {highlight ? (
        <Button size="lg" fullWidth onClick={() => navigate(`/activity/${encodeURIComponent(highlight.id)}`)}>
          {currentItem ? t.home.openNow : t.home.openNext}
        </Button>
      ) : null}

      {issueCount > 0 ? (
        <DataWarningBanner
          count={issueCount}
          message={t.home.issuesBanner(issueCount)}
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
              {today ? t.home.today : t.home.nextDay} · {formatDayLabel(upcoming.date)}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate(`/itinerary/${encodeURIComponent(upcoming.id)}`)}>
              {t.home.fullDay}
            </Button>
          </div>
          <Card flush>
            {upcoming.items.length === 0 ? (
              <p className={shell.muted} style={{ padding: 'var(--space-4)' }}>
                {t.home.nothingScheduled}
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
                      {item.id === currentItem?.id ? <Badge tone="primary">{t.home.now}</Badge> : null}
                      <TravelerAvatar
                        slot={scopeSlot(item.scope, trip.travelers)}
                        initials={scopeInitials(item.scope, trip.travelers)}
                        label={scopeLabel(item.scope, trip.travelers, t.traveler)}
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
              {t.common.activities(upcoming.items.length)}
              {dayCost(upcoming, scenario, trip) ? ` · ${formatMoney(dayCost(upcoming, scenario, trip))}` : ''}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className={shell.grid2}>
        <SummaryTile
          label={t.nav.itinerary}
          value={itineraryLabel(t, trip, now)}
          onClick={() => navigate(defaultDayId(trip, now) ? `/itinerary/${encodeURIComponent(defaultDayId(trip, now)!)}` : '/itinerary')}
        />
        <SummaryTile
          label={t.nav.budget}
          value={formatMoney(scenario === 'base' ? groupBase : groupFallback, { compact: true })}
          onClick={() => navigate('/budget')}
        />
        <SummaryTile
          label={t.home.bookingsStat}
          value={t.home.doneSuffix(progress.label)}
          onClick={() => navigate('/bookings')}
        />
        <SummaryTile
          label={t.sheetRole.sources}
          value={t.home.linkedFacts(trip.sources.length)}
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

function itineraryLabel(t: Messages, trip: Trip, now: Date): string {
  const today = todayIso(now);
  const index = trip.days.findIndex((day) => day.date === today);
  const total = trip.days.filter((day) => day.date !== null).length;
  if (index >= 0 && total > 0) return t.home.dayOfTotal(index + 1, total);
  return t.common.days(total);
}
