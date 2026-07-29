import { useState } from 'react';
import {
  Badge,
  BookingChecklistRow,
  BookingStatusChip,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  ExternalLinkButton,
  Icon,
  ProgressBar,
  SearchFilterSort,
  TravelerAvatarStack,
  useToast,
  BOOKING_STATUS_LABEL,
} from '../../design-system';
import shell from '../../app/AppShell.module.css';
import { useNavigate } from '../../app/router';
import { useTripContext } from '../../state/TripContext';
import { URGENCY_GROUPS, bookingProgress, effectiveBookingStatus } from '../../domain/selectors';
import { formatMoney } from '../../lib/format';
import { scopeLabel } from '../../import/travelers';
import type { BookingItem, BookingStatus } from '../../domain/types';
import { cx } from '../../lib/cx';

const STATUS_ORDER: readonly BookingStatus[] = ['not-started', 'researching', 'ready', 'booked', 'confirmed'];

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'outstanding', label: 'Outstanding' },
  { value: 'done', label: 'Booked' },
];

export function BookingsPage() {
  const { result, overrides, setBookingStatus } = useTripContext();
  const navigate = useNavigate();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<BookingItem | null>(null);

  const trip = result?.trip;
  if (!trip) return null;

  if (trip.bookings.length === 0) {
    return (
      <EmptyState
        icon="clipboard-check"
        title="No bookings yet"
        description="Your workbook did not have a booking sheet Wayfare could read."
        action={<Button onClick={() => navigate('/import')}>Import a workbook</Button>}
      />
    );
  }

  const progress = bookingProgress(trip, overrides);
  const needle = query.trim().toLowerCase();

  const visible = trip.bookings.filter((booking) => {
    const status = effectiveBookingStatus(booking, overrides);
    if (filter === 'outstanding' && (status === 'booked' || status === 'confirmed')) return false;
    if (filter === 'done' && status !== 'booked' && status !== 'confirmed') return false;
    if (!needle) return true;
    return [booking.item, booking.channel, booking.recommendedPlan, booking.timingText]
      .filter((value): value is string => typeof value === 'string')
      .some((value) => value.toLowerCase().includes(needle));
  });

  return (
    <div className={shell.stackLoose}>
      <div>
        <h1 className={shell.pageTitle}>Booking checklist</h1>
        <p className={shell.muted}>
          {progress.done} of {progress.total} booked. Statuses you set are saved on this device only.
        </p>
        <div style={{ marginTop: 'var(--space-3)' }}>
          <ProgressBar
            value={progress.total === 0 ? 0 : (progress.done / progress.total) * 100}
            label={`Booking progress: ${progress.done} of ${progress.total} done`}
          />
        </div>
      </div>

      <SearchFilterSort
        query={query}
        onQuery={setQuery}
        label="Search bookings"
        placeholder="Search bookings"
        filters={STATUS_FILTERS}
        activeFilter={filter}
        onFilter={setFilter}
        filterLabel="Filter by status"
      />

      {visible.length === 0 ? (
        <EmptyState
          title="No bookings match"
          description="Try a different search term or filter."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        URGENCY_GROUPS.map((group) => {
          const rows = visible.filter((booking) => booking.urgency === group.key);
          if (rows.length === 0) return null;

          return (
            <section key={group.key} className={shell.stack}>
              <h2 className={cx(shell.eyebrow, group.tone === 'danger' && shell.eyebrowUrgent)}>
                {group.label} · {rows.length}
              </h2>
              {rows.map((booking) => {
                const status = effectiveBookingStatus(booking, overrides);
                const people = trip.travelers
                  .filter((traveler) => booking.scope.travelerIds.includes(traveler.id))
                  .map((traveler) => ({ slot: traveler.slot, initials: traveler.initials, label: traveler.name }));

                return (
                  <BookingChecklistRow
                    key={booking.id}
                    item={booking.item}
                    {...(bookingMeta(booking) ? { meta: bookingMeta(booking)! } : {})}
                    {...(booking.recommendedPlan ? { plan: booking.recommendedPlan } : {})}
                    {...(booking.targetPrice ? { targetPrice: formatMoney(booking.targetPrice) } : {})}
                    {...(booking.fallbackPrice ? { fallbackPrice: formatMoney(booking.fallbackPrice) } : {})}
                    status={<BookingStatusChip status={status} />}
                    traveler={
                      people.length > 0 ? (
                        <TravelerAvatarStack
                          people={people}
                          label={scopeLabel(booking.scope, trip.travelers)}
                          size={22}
                        />
                      ) : undefined
                    }
                    actions={
                      <>
                        <Button variant="secondary" size="sm" onClick={() => setEditing(booking)}>
                          Change status
                        </Button>
                        {booking.url ? <ExternalLinkButton href={booking.url} label="Open booking page" /> : null}
                        {booking.confirmation ? (
                          <Badge tone="success">
                            <Icon name="check" size="xs" />
                            {booking.confirmation}
                          </Badge>
                        ) : null}
                      </>
                    }
                  />
                );
              })}
            </section>
          );
        })
      )}

      <Card eyebrow="A note on statuses">
        <p className={shell.muted}>
          Wayfare reads the status column from your workbook as a starting point. Anything you change here is stored in
          this browser and never written back to your file.
        </p>
      </Card>

      <BottomSheet
        open={editing !== null}
        title={editing ? `Status for ${editing.item}` : 'Status'}
        onClose={() => setEditing(null)}
      >
        <div className={shell.stackTight}>
          {STATUS_ORDER.map((status) => {
            const current = editing ? effectiveBookingStatus(editing, overrides) === status : false;
            return (
              <Button
                key={status}
                variant={current ? 'primary' : 'secondary'}
                fullWidth
                onClick={() => {
                  if (!editing) return;
                  setBookingStatus(editing.id, status);
                  toast(`${editing.item} — ${BOOKING_STATUS_LABEL[status]}`, 'success');
                  setEditing(null);
                }}
              >
                {BOOKING_STATUS_LABEL[status]}
              </Button>
            );
          })}
        </div>
      </BottomSheet>
    </div>
  );
}

function bookingMeta(booking: BookingItem): string | null {
  const parts = [booking.channel, booking.timingText].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}
