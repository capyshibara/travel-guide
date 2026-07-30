import { useId, type ReactNode } from 'react';
import styles from './feedback.module.css';
import { cx } from '../../lib/cx';
import { IconButton } from '../core/IconButton';
import { Icon } from '../Icon';
import { useDialogLayer } from './useDialogLayer';
import { useT } from '../../i18n/useT';


export interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
}

export function Modal({ open, title, children, onClose, actions }: ModalProps) {
  const t = useT();
  const ref = useDialogLayer(open, onClose);
  const titleId = useId();
  if (!open) return null;

  return (
    <div
      className={cx(styles.scrim, styles.scrimCenter)}
      // Clicking the scrim dismisses; clicks inside the dialog must not bubble to it.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
        <div className={styles.modalHead}>
          <h2 className={styles.modalTitle} id={titleId}>
            {title}
          </h2>
          <IconButton icon={<Icon name="x" size="sm" />} label={t.common.close} onClick={onClose} />
        </div>
        <div className={styles.modalBody}>{children}</div>
        {actions ? <div className={styles.modalActions}>{actions}</div> : null}
      </div>
    </div>
  );
}
