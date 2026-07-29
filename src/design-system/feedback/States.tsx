import type { ReactNode } from 'react';
import styles from './feedback.module.css';
import { cx } from '../../lib/cx';
import { Button } from '../core/Button';
import { Icon, type IconName } from '../Icon';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.state}>
      <span className={styles.stateIcon}>
        <Icon name={icon} size="lg" />
      </span>
      <h3 className={styles.stateTitle}>{title}</h3>
      {description ? <p className={styles.stateBody}>{description}</p> : null}
      {action ? <div className={styles.stateAction}>{action}</div> : null}
    </div>
  );
}

export interface ErrorStateProps {
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({ title, description, onRetry, retryLabel = 'Try again' }: ErrorStateProps) {
  return (
    <div className={styles.state} role="alert">
      <span className={cx(styles.stateIcon, styles.stateIconDanger)}>
        <Icon name="triangle-alert" size="lg" />
      </span>
      <h3 className={styles.stateTitle}>{title}</h3>
      {description ? <p className={styles.stateBody}>{description}</p> : null}
      {onRetry ? (
        <div className={styles.stateAction}>
          <Button variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export interface SkeletonLoaderProps {
  width?: string | number;
  height?: string | number;
  radius?: string;
  label?: string;
}

export function SkeletonLoader({ width = '100%', height = 16, radius, label }: SkeletonLoaderProps) {
  return (
    <div
      className={styles.skeleton}
      style={{ width, height, borderRadius: radius }}
      role={label ? 'status' : undefined}
      aria-label={label}
    />
  );
}
