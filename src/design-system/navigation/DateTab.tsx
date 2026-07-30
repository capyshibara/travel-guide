import styles from './navigation.module.css';
import { cx } from '../../lib/cx';
import { useT } from '../../i18n/useT';

export interface DateTabProps {
  /** Short weekday, e.g. "Mon". */
  day: string;
  /** Day of month, e.g. "6". */
  date: string;
  /** Full accessible label, e.g. "Monday 6 July, day 4 of 13". */
  label: string;
  active: boolean;
  hasWarning?: boolean;
  onSelect: () => void;
}

export function DateTab({ day, date, label, active, hasWarning, onSelect }: DateTabProps) {
  const t = useT();
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-label={label}
      className={cx(styles.dateTab, active && styles.dateTabActive)}
      onClick={onSelect}
    >
      <span className={styles.dateTabDay}>{day}</span>
      <span className={styles.dateTabDate}>{date}</span>
      {hasWarning ? (
        <span className={styles.dateTabWarning}>
          <span className="visually-hidden">{t.itinerary.hasIssues}</span>
        </span>
      ) : null}
    </button>
  );
}
