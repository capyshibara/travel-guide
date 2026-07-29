import { useEffect, useMemo, useRef } from 'react';
import {
  ActivityCard,
  Badge,
  Button,
  DateTab,
  DaySummary,
  EmptyState,
  Segmented,
  TimelineRail,
  TravelerAvatar,
  BookingStatusChip,
} from '../../design-system';
import shell from '../../app/AppShell.module.css';
import styles from './itinerary.module.css';
import { cx } from '../../lib/cx';
import { useNavigate } from '../../app/router';
import { useTripContext } from '../../state/TripContext';
import {
  dayCost,
  dayProgressPercent,
  daysWithIssues,
  defaultDayId,
  effectiveBookingStatus,
  findConnections,
  findNowNext,
  matchesTravelerFilter,
  visibleIssues,
} from '../../domain/selectors';
import {
  formatDayLabel,
  formatDayOfMonth,
  formatFullDate,
  formatMinutes,
  formatMoney,
  formatWeekdayShort,
  pluralize,
} from '../../lib/format';
import { scopeInitials, scopeLabel, scopeSlot } from '../../import/travelers';
import type { ItineraryDay, Trip } from '../../domain/types';

export interface ItineraryPageProps {
  dayId: string | null;
  /** Set on desktop, where selecting an activity fills a side pane instead of routing. */
  selectedItemId?: string | null;
  onSelectItem?: (itemId: string) => void;
}

/**
 * Day-by-day vertical timeline.
 *
 * Explicitly not a spreadsheet or a board: one day at a time, in time order, with the
 * traveler's own activities colour-keyed down the left edge.
 */
export function ItineraryPage({ dayId, selectedItemId, onSelectItem }: ItineraryPageProps) {
  const { result, overrides, preferences, setPreferences } = useTripContext();
  const navigate = useNavigate();
  const trip = result?.trip;
  const now = useMemo(() => new Date(), []);
  const tabsRef = useRef<HTMLDivElement>(null);

  const activeDayId = dayId ?? (trip ? defaultDayId(trip, now) : null);
  const day = trip?.days.find((candidate) => candidate.id === activeDayId) ?? trip?.days[0] ?? null;

  // Keep the selected day tab in view when the day changes.
  useEffect(() => {
    const container = tabsRef.current;
    if (!container) return;
    const selected = container.querySelector<HTMLElement>('[aria-selected="true"]');
    // Guarded: `scrollIntoView` is missing in some engines, and keeping the tab
    // off-screen is a far smaller problem than a crashed page.
    if (selected && typeof selected.scrollIntoView === 'function') {
      selected.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  }, [activeDayId]);

  if (!trip || !result) return null;

  if (trip.days.length === 0) {
    return (
      <EmptyState
        icon="map"
        title="No activities yet"
        description="Your workbook did not contain any itinerary rows Wayfare could read."
        action={<Button onClick={() => navigate('/import')}>Import a workbook</Button>}
      />
    );
  }

  if (!day) return null;

  const issues = visibleIssues(result.issues, overrides);
  const flaggedDays = daysWithIssues(trip, issues);
  const filter = preferences.travelerFilter;
  const items = day.items.filter((item) => matchesTravelerFilter(item.scope, filter));
  const { now: currentItem, next: nextItem } = findNowNext(trip, now);
  const connections = new Map(findConnections(day, trip.travelers).map((c) => [c.itemId, c]));
  const subtotal = dayCost(day, preferences.scenario, trip);
  const progress = dayProgressPercent(day, now);

  const travelerOptions = [
    { value: 'all', label: 'All' },
    ...trip.travelers.map((traveler) => ({
      value: traveler.id,
      label: traveler.name,
      adornment: (
        <TravelerAvatar slot={traveler.slot} initials={traveler.initials} label={traveler.name} size={20} decorative />
      ),
    })),
    ...(trip.travelers.length > 1 ? [{ value: 'shared', label: 'Shared' }] : []),
  ];

  const openItem = (itemId: string) => {
    if (onSelectItem) onSelectItem(itemId);
    else navigate(`/activity/${encodeURIComponent(itemId)}`);
  };

  return (
    <div>
      <div className={cx(shell.stickyBar, styles.dayBar)}>
        <div className={styles.dayTabs} role="tablist" aria-label="Trip days" ref={tabsRef}>
          {trip.days.map((candidate, index) => (
            <DateTab
              key={candidate.id}
              day={candidate.date ? formatWeekdayShort(candidate.date) : '—'}
              date={candidate.date ? formatDayOfMonth(candidate.date) : '?'}
              label={dayTabLabel(candidate, index, trip)}
              active={candidate.id === day.id}
              hasWarning={flaggedDays.has(candidate.id)}
              onSelect={() => navigate(`/itinerary/${encodeURIComponent(candidate.id)}`)}
            />
          ))}
        </div>
        {travelerOptions.length > 2 ? (
          <Segmented
            label="Filter by traveler"
            options={travelerOptions}
            value={filter}
            onChange={(value) => setPreferences({ travelerFilter: value })}
          />
        ) : null}
      </div>

      <div className={styles.dayBody}>
        <DaySummary
          as="h1"
          dateLabel={day.date ? formatDayLabel(day.date) : 'Undated activities'}
          {...(day.cities.length > 0 ? { placeLabel: day.cities.join(' · ') } : {})}
          activityCount={items.length}
          {...(subtotal ? { costSubtotal: formatMoney(subtotal) } : {})}
          {...(progress !== undefined ? { progress } : {})}
        />

        {items.length === 0 ? (
          <EmptyState
            icon="inbox"
            title={day.items.length === 0 ? 'Nothing scheduled' : 'Nothing for this traveler'}
            description={
              day.items.length === 0
                ? 'This day has no activities in your workbook.'
                : `${pluralize(day.items.length, 'activity', 'activities')} on this day, none assigned to this filter.`
            }
            {...(day.items.length > 0
              ? {
                  action: (
                    <Button variant="secondary" onClick={() => setPreferences({ travelerFilter: 'all' })}>
                      Show all travelers
                    </Button>
                  ),
                }
              : {})}
          />
        ) : (
          <TimelineRail>
            {items.map((item) => {
              const connection = connections.get(item.id);
              const booking = trip.bookings.find((candidate) => candidate.id === item.bookingItemId);
              const emphasis = item.id === currentItem?.id ? 'now' : item.id === nextItem?.id ? 'next' : null;

              return (
                <li key={item.id} className={cx(selectedItemId === item.id && styles.selectedItem)}>
                  <ActivityCard
                    time={
                      <>
                        {item.start === null ? (item.startText ?? 'Time not given') : formatMinutes(item.start)}
                        {item.durationMinutes ? (
                          <span className={styles.timeMuted}> · {formatDurationShort(item.durationMinutes)}</span>
                        ) : null}
                        {item.crossesMidnight ? <span className={styles.overnight}> +1</span> : null}
                      </>
                    }
                    title={item.activity}
                    {...(routeText(item.routeFrom, item.routeTo, item.place)
                      ? { route: routeText(item.routeFrom, item.routeTo, item.place)! }
                      : {})}
                    type={item.type}
                    typeLabel={item.typeLabel}
                    slot={scopeSlot(item.scope, trip.travelers)}
                    travelerLabel={scopeLabel(item.scope, trip.travelers)}
                    bookingRequired={item.bookingRequired}
                    emphasis={emphasis}
                    {...(connection ? { warning: connection.message } : {})}
                    status={
                      booking ? (
                        <BookingStatusChip status={effectiveBookingStatus(booking, overrides)} />
                      ) : overrides.completedItems.includes(item.id) ? (
                        <Badge tone="success">Done</Badge>
                      ) : undefined
                    }
                    traveler={
                      <TravelerAvatar
                        slot={scopeSlot(item.scope, trip.travelers)}
                        initials={scopeInitials(item.scope, trip.travelers)}
                        label={scopeLabel(item.scope, trip.travelers)}
                        size={26}
                        decorative
                      />
                    }
                    onOpen={() => openItem(item.id)}
                  />
                </li>
              );
            })}
          </TimelineRail>
        )}
      </div>
    </div>
  );
}

function dayTabLabel(day: ItineraryDay, index: number, trip: Trip): string {
  if (!day.date) return 'Undated activities';
  const total = trip.days.filter((candidate) => candidate.date !== null).length;
  return `${formatFullDate(day.date)}, day ${index + 1} of ${total}`;
}

function routeText(from?: string, to?: string, place?: string): string | null {
  if (from && to) return `${from} → ${to}`;
  return from ?? place ?? null;
}

/** Compact duration for the card's time line: "6h 35m" is too long beside a clock time. */
function formatDurationShort(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}
