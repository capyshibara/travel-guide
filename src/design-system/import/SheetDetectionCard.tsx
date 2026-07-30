import styles from './import.module.css';
import { cx } from '../../lib/cx';
import { Icon } from '../Icon';
import { Badge } from '../core/Badge';
import type { Confidence, SheetRole } from '../../domain/types';
import { useT } from '../../i18n/useT';

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
  const t = useT();
  const unknown = role === 'unknown';
  return (
    <div className={styles.sheetCard}>
      <span className={cx(styles.sheetIcon, unknown && styles.sheetIconMuted)}>
        <Icon name="file-spreadsheet" size="md" />
      </span>
      <div className={styles.sheetBody}>
        <h3 className={styles.sheetName}>{name}</h3>
        <div className={styles.sheetRole}>
          {unknown ? t.import.notUsed : t.import.readAs(t.sheetRole[role])}
          {rowCount > 0 ? ` · ${t.common.rows(rowCount)}` : ''}
        </div>
      </div>
      <Badge tone={unknown ? 'neutral' : confidence === 'high' ? 'success' : 'warning'}>
        {unknown ? t.import.skipped : t.confidence[confidence]}
      </Badge>
    </div>
  );
}
