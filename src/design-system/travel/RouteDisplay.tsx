import styles from './travel.module.css';
import { Icon } from '../Icon';
import type { ActivityType } from '../../domain/types';

export interface RouteDisplayProps {
  from: string;
  to?: string;
  type?: ActivityType;
}

/** A single place, or a from → to route with a directional icon. */
export function RouteDisplay({ from, to, type }: RouteDisplayProps) {
  if (!to) return <div className={styles.route}>{from}</div>;
  return (
    <div className={styles.route}>
      <span>{from}</span>
      <span className={styles.routeIcon}>
        <Icon name={type === 'flight' ? 'plane' : 'arrow-right'} size="xs" title="to" />
      </span>
      <span>{to}</span>
    </div>
  );
}
