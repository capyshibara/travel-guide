import type { ReactNode } from 'react';
import styles from './feedback.module.css';
import { cx } from '../../lib/cx';
import { Icon } from '../Icon';
import { useT } from '../../i18n/useT';


export interface DataWarningBannerProps {
  message: string;
  count?: number;
  onReview?: () => void;
  reviewLabel?: string;
}

/** Inline warning for import ambiguity, shown above the content it affects. */
export function DataWarningBanner({ message, count, onReview, reviewLabel }: DataWarningBannerProps) {
  const t = useT();
  const label = reviewLabel ?? t.common.review;
  return (
    <div className={styles.warningBanner} role="status">
      <span className={styles.warningIcon}>
        <Icon name="triangle-alert" size="sm" />
      </span>
      <span className={styles.warningText}>{message}</span>
      {onReview ? (
        <button type="button" className={styles.warningAction} onClick={onReview}>
          {count === undefined ? label : `${label} (${count})`}
        </button>
      ) : null}
    </div>
  );
}

export type AssumptionKind = 'assumption' | 'recheck' | 'verified';

const KIND_BORDER: Record<AssumptionKind, string | undefined> = {
  assumption: styles.calloutAssumption,
  recheck: styles.calloutRecheck,
  verified: styles.calloutVerified,
};

const KIND_TAG: Record<AssumptionKind, string | undefined> = {
  assumption: styles.tagAssumption,
  recheck: styles.tagRecheck,
  verified: styles.tagVerified,
};

export interface AssumptionCalloutProps {
  kind?: AssumptionKind;
  children: ReactNode;
  /** Overrides the default tag text ("Assumption" / "Recheck" / "Verified"). */
  label?: string;
}

/**
 * Separates verified fact from planning assumption from something needing a recheck.
 * The tag text carries the meaning; the colour only reinforces it.
 */
export function AssumptionCallout({ kind = 'assumption', children, label }: AssumptionCalloutProps) {
  const t = useT();
  return (
    <div className={cx(styles.callout, KIND_BORDER[kind])}>
      <div>
        <span className={cx(styles.calloutTag, KIND_TAG[kind])}>{label ?? t.assumption[kind]}</span>
        <div>{children}</div>
      </div>
    </div>
  );
}

export interface OfflineIndicatorProps {
  stale?: boolean;
}

export function OfflineIndicator({ stale }: OfflineIndicatorProps) {
  const t = useT();
  return (
    <span className={styles.offline}>
      <span className={styles.offlineDot} aria-hidden="true" />
      {stale ? t.offline.stale : t.offline.offline}
    </span>
  );
}
