import { formatMoney } from '../../lib/format';
import type { StageInfo } from '../../lib/stages';
import styles from './ColumnHeader.module.css';

/** UI-PIPE-03: a solid block in the stage colour. */
export function ColumnHeader({
  stage,
  count,
  valueCents,
  expectedCents,
}: {
  stage: StageInfo;
  count: number;
  valueCents: number;
  expectedCents: number | null;
}) {
  return (
    <header
      className={styles.header}
      style={{ background: stage.fill, color: stage.ink }}
      data-testid={`header-${stage.key}`}
    >
      <h2 className={styles.name}>
        {stage.name} <span className={styles.prob}>{stage.probability}%</span>
      </h2>
      <span className={styles.count} aria-label={`${count} deals`}>
        {count}
      </span>
      <div className={styles.value} data-testid={`value-${stage.key}`}>
        {formatMoney(valueCents)}
      </div>
      <div className={styles.expected} data-testid={`expected-${stage.key}`}>
        {expectedCents === null
          ? stage.key === 'won'
            ? 'Closed, won'
            : 'Closed, lost'
          : `exp ${formatMoney(expectedCents)}`}
      </div>
    </header>
  );
}
