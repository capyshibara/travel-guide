import styles from './travel.module.css';

export interface DaySummaryProps {
  /**
   * Heading level for the date. The itinerary passes 'h1' — the day being viewed is
   * what that page is about — while other surfaces embed it under their own heading.
   */
  as?: 'h1' | 'h2';
  dateLabel: string;
  placeLabel?: string;
  activityCount: number;
  costSubtotal?: string;
  /** 0–100. Omitted when the day is not today. */
  progress?: number;
}

/** Sits above each day's timeline: what day, where, how many activities, what it costs. */
export function DaySummary({ as: Heading = 'h2', dateLabel, placeLabel, activityCount, costSubtotal, progress }: DaySummaryProps) {
  return (
    <div className={styles.daySummary}>
      <div>
        <Heading className={styles.dayTitle}>{dateLabel}</Heading>
        <div className={styles.daySub}>
          {placeLabel ? `${placeLabel} · ` : ''}
          {activityCount === 1 ? '1 activity' : `${activityCount} activities`}
        </div>
      </div>
      <div className={styles.dayCost}>
        {costSubtotal ? <div className={styles.dayCostValue}>{costSubtotal}</div> : null}
        {progress !== undefined ? (
          <div
            className={styles.dayProgress}
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progress through today"
          >
            <div className={styles.dayProgressFill} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
