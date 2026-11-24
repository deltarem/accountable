import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { MonthFigures } from '../../api/types';
import { formatMoney, formatMonth, formatMonthShort } from '../../lib/format';
import styles from './charts.module.css';

const SEA = 'var(--sea)';
const LOST = 'var(--lost)';
const MUTED = 'var(--muted)';
const GRID = 'var(--chart-grid)';
const CURSOR = 'var(--chart-cursor)';

interface Row extends MonthFigures {
  won: number;
  lost: number;
}

function WonLostTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const m = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <strong>{formatMonth(m.month)}</strong>
      <div>
        {m.won_count} won <span className="mono">({formatMoney(m.won_cents)})</span>
      </div>
      <div>
        {m.lost_count} lost <span className="mono">({formatMoney(m.lost_cents)})</span>
      </div>
    </div>
  );
}

/** UI-DASH-05: deals won above the centre line, deals lost below it. */
export function WonLostChart({
  months,
  wonCount,
  lostCount,
}: {
  months: MonthFigures[];
  wonCount: number;
  lostCount: number;
}) {
  const rows: Row[] = months.map((m) => ({ ...m, won: m.won_count, lost: -m.lost_count }));
  const top = Math.max(1, ...months.map((m) => m.won_count));
  const bottom = Math.max(1, ...months.map((m) => m.lost_count));
  const empty = wonCount === 0 && lostCount === 0;
  return (
    <div className={styles.chartWrap} data-testid="won-lost-chart">
      <div className={styles.wlLabels} aria-hidden>
        <span className={styles.wonLabel}>{wonCount} won</span>
        <span className={styles.lostLabel}>{lostCount} lost</span>
      </div>
      <ResponsiveContainer width="100%" height={200} initialDimension={{ width: 320, height: 200 }}>
        <BarChart
          data={rows}
          stackOffset="sign"
          margin={{ top: 8, right: 4, bottom: 0, left: 52 }}
          barCategoryGap="30%"
          accessibilityLayer
        >
          <XAxis
            dataKey="month"
            tickFormatter={formatMonthShort}
            tick={{ fill: MUTED, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={1}
          />
          <YAxis hide domain={[-bottom * 1.6, top * 1.15]} />
          <ReferenceLine y={0} stroke={GRID} />
          <Tooltip content={<WonLostTooltip />} cursor={{ fill: CURSOR }} />
          <Bar
            dataKey="won"
            name="Won"
            stackId="a"
            fill={SEA}
            radius={[4, 4, 0, 0]}
            maxBarSize={14}
            isAnimationActive={false}
          />
          <Bar
            dataKey="lost"
            name="Lost"
            stackId="a"
            fill={LOST}
            radius={[4, 4, 0, 0]}
            maxBarSize={14}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
      {empty ? <p className={styles.emptyOverlay}>No deals won or lost in the last 12 months</p> : null}
      <table className="visually-hidden">
        <caption>Deals won and lost by month</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Won</th>
            <th>Lost</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.month}>
              <td>{formatMonth(m.month)}</td>
              <td>{m.won_count}</td>
              <td>{m.lost_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
