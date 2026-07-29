import type { ReactNode } from 'react';
import styles from './core.module.css';
import { cx } from '../../lib/cx';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const TONE_CLASS: Record<BadgeTone, string | undefined> = {
  neutral: styles.neutral,
  primary: styles.badgePrimary,
  success: styles.success,
  warning: styles.warning,
  danger: styles.badgeDanger,
  info: styles.info,
};

export interface BadgeProps {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
}

/**
 * Small status pill. Tone never carries meaning on its own — the design system
 * requires a text label alongside it, which is why `children` is required.
 */
export function Badge({ tone = 'neutral', icon, children }: BadgeProps) {
  return (
    <span className={cx(styles.badge, TONE_CLASS[tone])}>
      {icon}
      {children}
    </span>
  );
}
