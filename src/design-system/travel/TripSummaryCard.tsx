import type { ReactNode } from 'react';
import styles from './travel.module.css';

export interface TripSummaryStat {
  label: string;
  value: string;
}

export interface TripSummaryCardProps {
  title: string;
  subtitle: string;
  travelers?: ReactNode;
  countdown?: string;
  /** The current or next activity, with its time. */
  upNext?: { label: string; value: string; href?: string };
  stats: readonly TripSummaryStat[];
}

/**
 * The Trip Home hero — the five-second answer to "what is happening and what does it
 * cost". This is the only place the system uses a gradient, deliberately, so the
 * dashboard moment reads as distinct from the flat surfaces everywhere else.
 *
 * The trip title is the Trip Home page's `h1`; this card is only used there.
 */
export function TripSummaryCard({ title, subtitle, travelers, countdown, upNext, stats }: TripSummaryCardProps) {
  return (
    <section className={styles.hero} aria-label="Trip summary">
      <div>
        <h1 className={styles.heroTitle}>{title}</h1>
        <div className={styles.heroSub}>{subtitle}</div>
      </div>

      {travelers ? <div style={{ display: 'flex', gap: 'var(--space-2)' }}>{travelers}</div> : null}

      {countdown ? (
        <div className={styles.heroPanel}>
          <div className={styles.heroPanelValue}>{countdown}</div>
        </div>
      ) : null}

      {upNext ? (
        <div className={styles.heroPanel}>
          <div className={styles.heroPanelLabel}>{upNext.label}</div>
          <div className={styles.heroPanelValue}>{upNext.value}</div>
        </div>
      ) : null}

      <div className={styles.heroStats}>
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className={styles.heroStatLabel}>{stat.label}</div>
            <div className={styles.heroStatValue}>{stat.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
