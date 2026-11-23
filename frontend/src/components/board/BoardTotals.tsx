import type { Deal } from '../../api/types';
import { formatMoney, formatMoneyWhole } from '../../lib/format';
import { STAGES, totals } from '../../lib/stages';
import { Skeleton } from '../Skeleton';
import styles from './BoardTotals.module.css';

/** UI-PIPE-01: the Midnight strip with the open totals and a stacked bar by stage. */
export function BoardTotals({ deals }: { deals: Deal[] | undefined }) {
  const all = deals ?? [];
  const t = totals(all);
  const open = STAGES.filter((s) => s.open).map((s) => ({
    stage: s,
    value: all.filter((d) => d.stage === s.key).reduce((sum, d) => sum + d.value_cents, 0),
  }));
  return (
    <section className={styles.strip} aria-label="Pipeline totals">
      <div>
        <div className={styles.label}>Open pipeline</div>
        <div className={styles.fig} data-testid="total-open">
          {deals ? formatMoney(t.valueCents) : <Skeleton dark width={180} height={26} />}
        </div>
      </div>
      <div>
        <div className={styles.label}>Expected revenue</div>
        <div className={`${styles.fig} ${styles.green}`} data-testid="total-expected">
          {deals ? formatMoney(t.expectedCents) : <Skeleton dark width={150} height={26} />}
        </div>
      </div>
      <div>
        <div className={styles.label}>Open deals</div>
        <div className={styles.fig} data-testid="total-count">
          {deals ? t.count : <Skeleton dark width={40} height={26} />}
        </div>
      </div>
      <div className={styles.stackWrap}>
        <div className={styles.label}>
          <span>Open value by stage</span>
          <span className={styles.legend}>
            {open.map((o) => (
              <span key={o.stage.key}>
                <i style={{ background: o.stage.onDark }} aria-hidden />
                {o.stage.name}
              </span>
            ))}
          </span>
        </div>
        {deals && t.valueCents === 0 ? (
          <div className={styles.emptyBar}>No open deals</div>
        ) : (
          <div className={styles.stack} role="img" aria-label="Open value by stage">
            {open
              .filter((o) => o.value > 0)
              .map((o) => (
                <div
                  key={o.stage.key}
                  title={`${o.stage.name}: ${formatMoneyWhole(o.value)}`}
                  style={{ flex: o.value, background: o.stage.onDark }}
                />
              ))}
          </div>
        )}
      </div>
    </section>
  );
}
