import styles from './travel.module.css';
import { cx } from '../../lib/cx';
import { Icon, type IconName } from '../Icon';
import type { BookingStatus } from '../../domain/types';

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  'not-started': 'Not started',
  researching: 'Researching',
  ready: 'Ready to book',
  booked: 'Booked',
  confirmed: 'Confirmed',
};

/** Each status gets its own glyph, so the chips are distinguishable without colour. */
const STATUS_ICON: Record<BookingStatus, IconName> = {
  'not-started': 'circle',
  researching: 'search',
  ready: 'ticket',
  booked: 'check',
  confirmed: 'check-circle-2',
};

const STATUS_CLASS: Record<BookingStatus, string | undefined> = {
  'not-started': styles.statusNotStarted,
  researching: styles.statusResearching,
  ready: styles.statusReady,
  booked: styles.statusBooked,
  confirmed: styles.statusConfirmed,
};

export interface BookingStatusChipProps {
  status: BookingStatus;
}

export function BookingStatusChip({ status }: BookingStatusChipProps) {
  return (
    <span className={cx(styles.statusChip, STATUS_CLASS[status])}>
      <Icon name={STATUS_ICON[status]} size="xs" />
      {BOOKING_STATUS_LABEL[status]}
    </span>
  );
}
