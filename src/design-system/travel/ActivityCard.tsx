import type { ReactNode } from 'react';
import styles from './travel.module.css';
import { cx } from '../../lib/cx';
import { Icon } from '../Icon';
import { ActivityTypeBadge } from './ActivityTypeBadge';
import type { TravelerSlot } from './TravelerAvatar';
import type { ActivityType } from '../../domain/types';

const SLOT_BORDER: Record<TravelerSlot, string | undefined> = {
  a: styles.travelerA,
  b: styles.travelerB,
  c: styles.travelerC,
  d: styles.travelerD,
  shared: styles.travelerShared,
  none: styles.travelerNone,
};

export interface ActivityCardProps {
  time: ReactNode;
  title: string;
  route?: string;
  type: ActivityType;
  typeLabel: string;
  slot: TravelerSlot;
  /** Accessible description of who the activity is for. */
  travelerLabel: string;
  status?: ReactNode;
  traveler?: ReactNode;
  bookingRequired?: boolean;
  emphasis?: 'now' | 'next' | null;
  /** Short warning shown at the foot of the card, e.g. a tight connection. */
  warning?: string;
  onOpen: () => void;
}

/**
 * The itinerary timeline card.
 *
 * The 4px left border is the traveler identity colour — the one place in the system
 * a coloured border accent is used, because telling whose activity this is at a glance
 * is the core job of the itinerary. The whole card is one button: on a phone, held
 * one-handed, a large target beats a small "details" link.
 */
export function ActivityCard({
  time,
  title,
  route,
  type,
  typeLabel,
  slot,
  travelerLabel,
  status,
  traveler,
  bookingRequired,
  emphasis,
  warning,
  onOpen,
}: ActivityCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cx(styles.activityCard, SLOT_BORDER[slot], emphasis === 'now' && styles.activityCardNow)}
      aria-current={emphasis === 'now' ? 'time' : undefined}
    >
      {emphasis ? (
        <span className={cx(styles.nowFlag, emphasis === 'next' && styles.nextFlag)}>
          <Icon name={emphasis === 'now' ? 'clock' : 'calendar-clock'} size="xs" />
          {emphasis === 'now' ? 'Happening now' : 'Next up'}
        </span>
      ) : null}

      <div className={styles.activityTop}>
        <span className={styles.activityTime}>{time}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {bookingRequired ? (
            <span className={styles.activityBookingIcon}>
              <Icon name="ticket" size="xs" title="Booking needed" />
            </span>
          ) : null}
          {traveler}
        </span>
      </div>

      <h2 className={styles.activityTitle}>{title}</h2>
      {route ? <p className={styles.activityRoute}>{route}</p> : null}

      <div className={styles.activityMeta}>
        <ActivityTypeBadge type={type} label={typeLabel} />
        {status}
        <span className="visually-hidden">{travelerLabel}</span>
      </div>

      {warning ? (
        <p className={styles.activityWarning}>
          <Icon name="triangle-alert" size="xs" />
          {warning}
        </p>
      ) : null}
    </button>
  );
}

/** Thin vertical rail connecting a day's cards. */
export function TimelineRail({ children }: { children: ReactNode }) {
  return (
    <ol className={styles.rail}>
      <div className={styles.railItems}>{children}</div>
    </ol>
  );
}
