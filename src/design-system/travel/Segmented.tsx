import type { ReactNode } from 'react';
import styles from './travel.module.css';
import { cx } from '../../lib/cx';

export interface SegmentedOption {
  value: string;
  label: string;
  adornment?: ReactNode;
}

export interface SegmentedProps {
  label: string;
  options: readonly SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
}

/**
 * Pill-chip filter row, used for the traveler filter and the activity-type filter.
 * A group of toggle buttons rather than tabs, because the filtered list is not a
 * tabpanel and several filters can be meaningful at once in future.
 */
export function Segmented({ label, options, value, onChange }: SegmentedProps) {
  return (
    <div className={styles.segmented} role="group" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            className={cx(styles.segmentedItem, active && styles.segmentedItemActive)}
            onClick={() => onChange(option.value)}
          >
            {option.adornment}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export interface ScenarioToggleProps {
  value: 'base' | 'fallback';
  onChange: (value: 'base' | 'fallback') => void;
}

/** Segmented control switching every cost on the page between base and fallback. */
export function ScenarioToggle({ value, onChange }: ScenarioToggleProps) {
  return (
    <div className={styles.scenarioToggle} role="group" aria-label="Cost scenario">
      {(['base', 'fallback'] as const).map((scenario) => (
        <button
          key={scenario}
          type="button"
          aria-pressed={value === scenario}
          className={cx(styles.scenarioOption, value === scenario && styles.scenarioOptionActive)}
          onClick={() => onChange(scenario)}
        >
          {scenario === 'base' ? 'Base' : 'Fallback'}
        </button>
      ))}
    </div>
  );
}
