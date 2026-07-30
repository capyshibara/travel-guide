import styles from './travel.module.css';
import { formatDuration, formatMinutes } from '../../lib/format';
import { useT } from '../../i18n/useT';

export interface TimeDurationBlockProps {
  start: number | null;
  end: number | null;
  /** Original cell text, shown verbatim when the workbook wrote something unusual. */
  startText?: string;
  endText?: string;
  durationMinutes: number | null;
  crossesMidnight?: boolean;
}

/**
 * Monospace time range with tabular figures, so times line up down a timeline.
 * An overnight activity is marked with a "+1 day" tag, not just an odd-looking range.
 */
export function TimeDurationBlock({
  start,
  end,
  startText,
  endText,
  durationMinutes,
  crossesMidnight,
}: TimeDurationBlockProps) {
  const t = useT();
  const startLabel = start === null ? (startText ?? '—') : formatMinutes(start);
  const endLabel = end === null ? endText : formatMinutes(end);

  return (
    <div className={styles.timeBlock}>
      <span className={styles.timeRange}>
        {startLabel}
        {endLabel ? `–${endLabel}` : ''}
      </span>
      {crossesMidnight ? <span className={styles.overnightTag}>{t.itinerary.overnight}</span> : null}
      {durationMinutes ? <span className={styles.timeDuration}>{formatDuration(durationMinutes)}</span> : null}
    </div>
  );
}
