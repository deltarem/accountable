import type { Dashboard } from '../../api/types';
import { formatMoney, formatMoneyWhole, formatPercent, plural } from '../../lib/format';
import { stage as stageInfo } from '../../lib/stages';
import { EmptyState } from '../EmptyState';
import styles from './FunnelChart.module.css';

/**
 * UI-DASH-03: one column per stage from New to Won, getting shorter. Above
 * each, the share of New's value it keeps; below, the stage and its value
 * (DEC-10). Stage names sit beside every coloured mark.
 */
export function FunnelChart({ funnel }: { funnel: Dashboard['funnel'] }) {
  const top = funnel[0]?.value_cents ?? 0;
  if (top === 0) {
    return (
      <div className={styles.emptyWrap}>
        <EmptyState compact message="No deals in the funnel yet" />
      </div>
    );
  }
  return (
    <div className={styles.steps} data-testid="funnel">
      {funnel.map((f) => {
        const s = stageInfo(f.stage);
        const height = Math.max(4, Math.round((f.value_cents / top) * 120));
        return (
          <div
            key={f.stage}
            className={styles.step}
            title={`${s.name}: ${formatMoney(f.value_cents)} from ${plural(f.count, 'deal')}`}
            data-testid={`funnel-${f.stage}`}
          >
            <div className={styles.share}>{formatPercent(f.share_pct)}</div>
            <div className={styles.block} style={{ height, background: s.fill }} />
            <div className={styles.name}>{s.name}</div>
            <div className={styles.value}>{formatMoneyWhole(f.value_cents)}</div>
          </div>
        );
      })}
    </div>
  );
}
