import type { ReactNode } from 'react';
import styles from './core.module.css';
import { cx } from '../../lib/cx';

export interface CardProps {
  children: ReactNode;
  /** Removes the default 16px padding for cards that manage their own layout. */
  flush?: boolean;
  className?: string;
  /** Renders an eyebrow label above the content, in the design system's caption style. */
  eyebrow?: string;
  id?: string;
}

export function Card({ children, flush, className, eyebrow, id }: CardProps) {
  return (
    <div id={id} className={cx(styles.card, flush && styles.cardFlush, className)}>
      {eyebrow ? <p className={styles.cardEyebrow}>{eyebrow}</p> : null}
      {children}
    </div>
  );
}

export interface CardButtonProps {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}

/** A card the whole surface of which is one action. Rendered as a real button. */
export function CardButton({ children, onClick, className }: CardButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(styles.card, styles.cardInteractive, className)}
    >
      {children}
    </button>
  );
}
