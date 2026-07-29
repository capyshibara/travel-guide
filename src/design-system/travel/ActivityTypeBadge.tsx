import styles from './travel.module.css';
import { Icon, type IconName } from '../Icon';
import type { ActivityType } from '../../domain/types';

/** Segment-type icons, exactly as the design system specifies them. */
export const ACTIVITY_ICON: Record<ActivityType, IconName> = {
  flight: 'plane',
  transport: 'bus',
  food: 'utensils',
  hotel: 'bed-double',
  sleep: 'moon',
  sightseeing: 'mountain',
  tour: 'compass',
  prep: 'backpack',
  arrival: 'map-pin',
  rest: 'coffee',
  other: 'circle',
};

export interface ActivityTypeBadgeProps {
  type: ActivityType;
  /** The workbook's own wording, when it had one. */
  label: string;
}

/**
 * Deliberately neutral-coloured: the icon and label carry the meaning. Assigning a
 * colour per category would turn the itinerary into a rainbow and dilute the colours
 * that do mean something (status, traveler identity).
 */
export function ActivityTypeBadge({ type, label }: ActivityTypeBadgeProps) {
  return (
    <span className={styles.typeBadge}>
      <Icon name={ACTIVITY_ICON[type]} size="xs" />
      {label}
    </span>
  );
}
