import styles from './travel.module.css';
import { cx } from '../../lib/cx';

export interface BudgetSummaryCardProps {
  label: string;
  amount: string;
  sub?: string;
  tone?: 'default' | 'warning';
}

/** One metric tile in the Budget grid. */
export function BudgetSummaryCard({ label, amount, sub, tone = 'default' }: BudgetSummaryCardProps) {
  return (
    <div className={styles.metric}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={cx(styles.metricValue, tone === 'warning' && styles.metricValueWarning)}>{amount}</div>
      {sub ? <div className={styles.metricSub}>{sub}</div> : null}
    </div>
  );
}

export interface BreakdownCategory {
  label: string;
  value: number;
  display: string;
}

export interface CategoryBreakdownProps {
  categories: readonly BreakdownCategory[];
  /** Accessible name for the list as a whole. */
  label: string;
}

/**
 * Bar breakdown by category.
 *
 * The exact figure sits next to every bar — the bar is a reading aid, never the only
 * way to get the number. Rendered as a description list so it is legible with styles
 * off and to a screen reader.
 */
export function CategoryBreakdown({ categories, label }: CategoryBreakdownProps) {
  const total = categories.reduce((sum, category) => sum + Math.max(category.value, 0), 0);

  return (
    <dl className={styles.breakdown} aria-label={label}>
      {categories.map((category) => {
        const percent = total > 0 ? (Math.max(category.value, 0) / total) * 100 : 0;
        return (
          <div key={category.label}>
            <div className={styles.breakdownRow}>
              <dt className={styles.breakdownLabel}>{category.label}</dt>
              <dd className={styles.breakdownValue}>
                {category.display}
                <span className="visually-hidden"> — {percent.toFixed(0)}% of the total</span>
              </dd>
            </div>
            <div className={styles.breakdownTrack} aria-hidden="true">
              <div className={styles.breakdownFill} style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </dl>
  );
}
