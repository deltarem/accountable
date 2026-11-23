import { ArrowDown, ArrowUp } from 'lucide-react';
import type { ReactNode } from 'react';

import type { Dashboard } from '../../api/types';
import { formatMoneyWhole, formatMonth, plural } from '../../lib/format';
import { Skeleton } from '../Skeleton';
import styles from './HeadlinePanel.module.css';
import { RevenueChart } from './RevenueChart';

export function HeadlineFigure({
  label,
  figure,
  context,
  tone,
  testId,
}: {
  label: string;
  figure: ReactNode;
  context: ReactNode;
  tone?: 'green';
  testId?: string;
}) {
  return (
    <div className={styles.figure}>
      <div className={styles.label}>{label}</div>
      <div className={`${styles.big} ${tone === 'green' ? styles.green : ''}`} data-testid={testId}>
        {figure}
      </div>
      <div className={styles.context}>{context}</div>
    </div>
  );
}

function previousMonthName(months: Dashboard['months']) {
  const key = months[months.length - 2]?.month;
  return key ? formatMonth(key).split(' ')[0] : 'last month';
}

const MONTH_LONG: Record<string, string> = {
  Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June',
  Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December',
};

/** UI-DASH-01, UI-DASH-02: the Midnight panel with four figures and the revenue line. */
export function HeadlinePanel({ data }: { data: Dashboard | undefined }) {
  if (!data) {
    return (
      <section className={styles.panel} aria-label="Headline figures" aria-busy>
        <div className={styles.figures}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.figure}>
              <Skeleton dark width={90} height={12} />
              <div className={styles.gap10} />
              <Skeleton dark width={150} height={30} />
              <div className={styles.gap8} />
              <Skeleton dark width={100} height={12} />
            </div>
          ))}
        </div>
        <div>
          <Skeleton dark width={120} height={16} />
          <div className={styles.gap16} />
          <Skeleton dark height={220} radius={12} />
        </div>
      </section>
    );
  }
  const change = data.won_change_pct;
  const lastMonth = MONTH_LONG[previousMonthName(data.months)] ?? previousMonthName(data.months);
  return (
    <section className={styles.panel} aria-label="Headline figures">
      <div className={styles.figures}>
        <HeadlineFigure
          label="Open pipeline"
          figure={formatMoneyWhole(data.open_pipeline_cents)}
          context={plural(data.open_deal_count, 'open deal')}
          testId="open-pipeline"
        />
        <HeadlineFigure
          label="Expected revenue"
          figure={formatMoneyWhole(data.expected_cents)}
          context="Value times probability"
          testId="expected-revenue"
        />
        <HeadlineFigure
          label="Won this month"
          tone="green"
          figure={formatMoneyWhole(data.won_this_month_cents)}
          testId="won-this-month"
          context={
            change === null ? (
              <span>Nothing won in {lastMonth}</span>
            ) : (
              <>
                <span className={`${styles.chip} ${change >= 0 ? styles.up : styles.down}`}>
                  {change >= 0 ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />}
                  {Math.abs(change)}%
                </span>{' '}
                <span className="visually-hidden">{change >= 0 ? 'up' : 'down'}</span> on {lastMonth}
              </>
            )
          }
        />
        <HeadlineFigure
          label="Follow-ups due"
          testId="follow-ups-due"
          figure={
            <>
              <span className={data.overdue_count > 0 ? styles.overdue : undefined}>{data.overdue_count}</span>{' '}
              <span className={styles.word}>overdue</span>
            </>
          }
          context={`${data.due_today_count} due today`}
        />
      </div>
      <div className={styles.chartArea}>
        <div className={styles.chartHead}>
          <h2 className={styles.chartTitle}>Revenue won</h2>
          <span className={styles.note}>Last 12 months · {formatMoneyWhole(data.won_total_cents)}</span>
        </div>
        <RevenueChart months={data.months} />
      </div>
    </section>
  );
}
