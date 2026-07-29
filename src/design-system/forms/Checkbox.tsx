import styles from './forms.module.css';
import { Icon } from '../Icon';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

/**
 * A real `<input type="checkbox">` behind a styled box, so keyboard, form and
 * assistive-technology behaviour all come for free.
 */
export function Checkbox({ checked, onChange, label }: CheckboxProps) {
  return (
    <label className={styles.checkRow}>
      <input
        type="checkbox"
        className={styles.checkInput}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.checkBox} aria-hidden="true">
        <Icon name="check" size="xs" />
      </span>
      {label}
    </label>
  );
}
