import { useId } from 'react';
import styles from './forms.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  /** Hides the label visually while keeping it for screen readers. */
  hideLabel?: boolean;
}

/** Native select, styled to match Input. Native is the right call for a short list. */
export function Select({ label, value, options, onChange, hideLabel }: SelectProps) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label className={hideLabel ? 'visually-hidden' : styles.label} htmlFor={id}>
        {label}
      </label>
      <select id={id} className={styles.control} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
