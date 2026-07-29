import { useId, type ReactNode } from 'react';
import styles from './feedback.module.css';
import { cx } from '../../lib/cx';
import { Button } from '../core/Button';
import { useDialogLayer } from './useDialogLayer';

export interface BottomSheetProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  /** Label for the closing action. Defaults to "Close". */
  closeLabel?: string;
}

/** Mobile-first slide-up panel. Same dialog semantics as Modal, different geometry. */
export function BottomSheet({ open, title, children, onClose, closeLabel = 'Close' }: BottomSheetProps) {
  const ref = useDialogLayer(open, onClose);
  const titleId = useId();
  if (!open) return null;

  return (
    <div
      className={cx(styles.scrim, styles.scrimBottom)}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
        <div className={styles.sheetHandle} aria-hidden="true" />
        <h2 className={styles.sheetTitle} id={titleId}>
          {title}
        </h2>
        {children}
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button variant="secondary" fullWidth onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
