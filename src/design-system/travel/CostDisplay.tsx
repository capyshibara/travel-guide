import styles from './travel.module.css';
import { cx } from '../../lib/cx';
import { formatConverted, formatMoney } from '../../lib/format';
import type { CostScenario, Money } from '../../domain/types';
import { useT } from '../../i18n/useT';

export interface CostDisplayProps {
  amount: Money | null | undefined;
  converted?: Money | null | undefined;
  scenario?: CostScenario;
  /** Shows the scenario name under the amount. */
  showScenarioLabel?: boolean;
  align?: 'start' | 'end';
}

/**
 * Always shows the amount in its original currency. The converted figure is a
 * secondary line marked with "≈" — it never replaces what the workbook said.
 */
export function CostDisplay({
  amount,
  converted,
  scenario = 'base',
  showScenarioLabel,
  align = 'end',
}: CostDisplayProps) {
  const t = useT();
  if (!amount) return <span className={styles.costConverted}>{t.common.notPriced}</span>;
  const convertedLabel = formatConverted(converted);

  return (
    <div className={cx(styles.cost, align === 'start' && styles.costAlignStart)}>
      <span className={cx(styles.costAmount, scenario === 'fallback' && styles.costAmountFallback)}>
        {formatMoney(amount)}
      </span>
      {convertedLabel ? <span className={styles.costConverted}>{convertedLabel}</span> : null}
      {showScenarioLabel ? (
        <span className={cx(styles.costScenario, scenario === 'fallback' && styles.costScenarioFallback)}>
          {scenario === 'base' ? t.scenario.baseLower : t.scenario.fallbackLower}
        </span>
      ) : null}
    </div>
  );
}
