import styles from './import.module.css';
import { cx } from '../../lib/cx';
import { Icon } from '../Icon';
import { Badge } from '../core/Badge';
import type { Confidence, SheetRole } from '../../domain/types';

const ROLE_LABEL: Record<SheetRole, string> = {
  overview: 'Overview',
  itinerary: 'Itinerary',
  bookings: 'Booking options',
  sources: 'Sources',
  budget: 'Budget',
  unknown: 'Not recognized',
};

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'High confidence',
  medium: 'Some guesswork',
  low: 'Uncertain',
};

export interface SheetDetectionCardProps {
  name: string;
  role: SheetRole;
  confidence: Confidence;
  rowCount: number;
}

/**
 * One detected worksheet and the role we inferred for it. Shows the inference and how
 * sure we are — never raw parser internals.
 */
export function SheetDetectionCard({ name, role, confidence, rowCount }: SheetDetectionCardProps) {
  const unknown = role === 'unknown';
  return (
    <div className={styles.sheetCard}>
      <span className={cx(styles.sheetIcon, unknown && styles.sheetIconMuted)}>
        <Icon name="file-spreadsheet" size="md" />
      </span>
      <div className={styles.sheetBody}>
        <h3 className={styles.sheetName}>{name}</h3>
        <div className={styles.sheetRole}>
          {unknown ? 'Not used' : `Read as ${ROLE_LABEL[role]}`}
          {rowCount > 0 ? ` · ${rowCount} ${rowCount === 1 ? 'row' : 'rows'}` : ''}
        </div>
      </div>
      <Badge tone={unknown ? 'neutral' : confidence === 'high' ? 'success' : 'warning'}>
        {unknown ? 'Skipped' : CONFIDENCE_LABEL[confidence]}
      </Badge>
    </div>
  );
}
