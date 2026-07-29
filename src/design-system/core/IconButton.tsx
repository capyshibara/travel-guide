import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './core.module.css';
import { cx } from '../../lib/cx';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'aria-label'> {
  icon: ReactNode;
  /** Required: the icon carries no accessible name on its own. */
  label: string;
  active?: boolean;
}

export function IconButton({ icon, label, active, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cx(styles.iconButton, active && styles.iconButtonActive)}
      {...rest}
    >
      {icon}
    </button>
  );
}
