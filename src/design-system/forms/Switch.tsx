import styles from './forms.module.css';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

/** Toggle for a binary setting. A checkbox input under the hood, for the same reasons. */
export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <label className={styles.switchRow}>
      <input
        type="checkbox"
        role="switch"
        className={styles.switchInput}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.switchTrack} aria-hidden="true">
        <span className={styles.switchThumb} />
      </span>
      {label}
    </label>
  );
}
