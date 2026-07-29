import styles from './import.module.css';
import { cx } from '../../lib/cx';
import { Icon } from '../Icon';

export interface ImportProgressStepperProps {
  steps: readonly string[];
  /** Index of the step in progress. Steps before it are done. */
  current: number;
}

export function ImportProgressStepper({ steps, current }: ImportProgressStepperProps) {
  return (
    <ol className={styles.stepper} aria-label="Import progress">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step} className={styles.step} aria-current={active ? 'step' : undefined}>
            <div className={styles.stepMarkers} aria-hidden="true">
              <span className={cx(styles.stepDot, done && styles.stepDotDone, active && styles.stepDotCurrent)}>
                {done ? <Icon name="check" size="xs" /> : index + 1}
              </span>
              {index < steps.length - 1 ? (
                <span className={cx(styles.stepConnector, done && styles.stepConnectorDone)} />
              ) : null}
            </div>
            <span className={cx(styles.stepLabel, done && styles.stepLabelDone, active && styles.stepLabelActive)}>
              {step}
              {done ? <span className="visually-hidden"> — done</span> : null}
              {active ? <span className="visually-hidden"> — in progress</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div
      className={styles.progressTrack}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={styles.progressFill} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
