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
} from '../../design-system';
import shell from '../../app/AppShell.module.css';
import { useNavigate } from '../../app/router';
import { useTripContext } from '../../state/TripContext';
import { URGENCY_GROUPS, bookingProgress, effectiveBookingStatus } from '../../domain/selectors';
import { formatMoney } from '../../lib/format';
import { scopeLabel, travelerName } from '../../import/travelers';
import { useT } from '../../i18n/useT';
import type { BookingItem, BookingStatus } from '../../domain/types';
import { cx } from '../../lib/cx';

const STATUS_ORDER: readonly BookingStatus[] = ['not-started', 'researching', 'ready', 'booked', 'confirmed'];

export function BookingsPage() {
  const { result, overrides, setBookingStatus } = useTripContext();
  const navigate = useNavigate();
  const toast = useToast();
  const t = useT();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<BookingItem | null>(null);

  const trip = result?.trip;
  if (!trip) return null;

  if (trip.bookings.length === 0) {
    return (
      <EmptyState
        icon="clipboard-check"
        title={t.bookings.emptyTitle}
        description={t.bookings.emptyBody}
        action={<Button onClick={() => navigate('/import')}>{t.itinerary.importWorkbook}</Button>}
      />
    );
  }

  const progress = bookingProgress(trip, overrides);
  const needle = query.trim().toLowerCase();
  const statusFilters = [
    { value: 'all', label: t.bookings.filterAll },
    { value: 'outstanding', label: t.bookings.filterOutstanding },
    { value: 'done', label: t.bookings.filterDone },
  ];

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
        <h1 className={shell.pageTitle}>{t.bookings.title}</h1>
        <p className={shell.muted}>{t.bookings.progress(progress.done, progress.total)}</p>
        <div style={{ marginTop: 'var(--space-3)' }}>
          <ProgressBar
            value={progress.total === 0 ? 0 : (progress.done / progress.total) * 100}
            label={t.bookings.progressLabel(progress.done, progress.total)}
          />
        </div>
      </div>

      <SearchFilterSort
        query={query}
        onQuery={setQuery}
        label={t.bookings.searchLabel}
        placeholder={t.bookings.searchLabel}
        filters={statusFilters}
        activeFilter={filter}
        onFilter={setFilter}
        filterLabel={t.bookings.filterByStatus}
      />

      {visible.length === 0 ? (
        <EmptyState
          title={t.bookings.noneMatch}
          description={t.bookings.noneMatchBody}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
            >
              {t.common.clearFilters}
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
                {t.urgency[group.key]} · {rows.length}
              </h2>
              {rows.map((booking) => {
                const status = effectiveBookingStatus(booking, overrides);
                const people = trip.travelers
                  .filter((traveler) => booking.scope.travelerIds.includes(traveler.id))
                  .map((traveler) => ({
                    slot: traveler.slot,
                    initials: traveler.initials,
                    label: travelerName(traveler, t.traveler),
                  }));

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
                          label={scopeLabel(booking.scope, trip.travelers, t.traveler)}
                          size={22}
                        />
                      ) : undefined
                    }
                    actions={
                      <>
                        <Button variant="secondary" size="sm" onClick={() => setEditing(booking)}>
                          {t.bookings.changeStatus}
                        </Button>
                        {booking.url ? <ExternalLinkButton href={booking.url} label={t.bookings.openBookingPage} /> : null}
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

      <Card eyebrow={t.bookings.statusNoteTitle}>
        <p className={shell.muted}>
          {t.bookings.statusNoteBody}
        </p>
      </Card>

      <BottomSheet
        open={editing !== null}
        title={editing ? t.bookings.statusFor(editing.item) : t.bookings.changeStatus}
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
                  toast(t.bookings.statusChanged(editing.item, t.bookingStatus[status]), 'success');
                  setEditing(null);
                }}
              >
                {t.bookingStatus[status]}
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
