import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { MonthFigures } from '../../api/types';
import { formatMoney, formatMoneyShort, formatMonth, formatMonthShort, plural } from '../../lib/format';
import styles from './charts.module.css';

// This chart sits on the headline panel, which is Midnight in both modes.
const SEA = 'var(--sea)';
const PANEL = 'var(--dark-panel)';
const GRID = 'var(--dark-grid)';
const PALE = 'var(--on-dark-muted)';
const FIGURE = 'var(--on-dark-strong)';

/** Four round ticks from zero, like $0, $40k, $80k, $120k. */
export function niceTicks(maxCents: number): number[] {
  const steps = [1, 2, 2.5, 4, 5, 10];
  const raw = Math.max(maxCents, 1_000_00) / 3;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = (steps.find((s) => s * magnitude >= raw) ?? 10) * magnitude;
  return [0, step, step * 2, step * 3];
}

function RevenueTooltip({ active, payload }: { active?: boolean; payload?: { payload: MonthFigures }[] }) {
  if (!active || !payload?.length) return null;
  const m = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <strong>{formatMonth(m.month)}</strong>
      <div className="mono">
        {formatMoney(m.won_cents)} · {plural(m.won_count, 'deal')} won
      </div>
    </div>
  );
}

/** UI-DASH-02: a Sea Green line with a dot per month; the current month larger and labelled. */
export function RevenueChart({ months }: { months: MonthFigures[] }) {
  const last = months.length - 1;
  const empty = months.every((m) => m.won_cents === 0);
  const ticks = niceTicks(Math.max(...months.map((m) => m.won_cents)));
  return (
    <div className={styles.chartWrap} data-testid="revenue-chart">
      <ResponsiveContainer width="100%" height={232} initialDimension={{ width: 600, height: 232 }}>
        <LineChart data={months} margin={{ top: 24, right: 24, bottom: 0, left: 0 }} accessibilityLayer>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="month"
            tickFormatter={formatMonthShort}
            tick={{ fill: PALE, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            padding={{ left: 12, right: 12 }}
          />
          <YAxis
            tickFormatter={(v: number) => formatMoneyShort(v)}
            tick={{ fill: PALE, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
            domain={[0, ticks[ticks.length - 1]]}
            ticks={ticks}
          />
          <Tooltip content={<RevenueTooltip />} cursor={{ stroke: GRID, strokeWidth: 1 }} />
          <Line
            type="linear"
            dataKey="won_cents"
            stroke={SEA}
            strokeWidth={2.5}
            isAnimationActive={false}
            dot={(props: { cx?: number; cy?: number; index?: number }) => {
              const current = props.index === last;
              return (
                <circle
                  key={`dot-${props.index}`}
                  cx={props.cx}
                  cy={props.cy}
                  r={current ? 6 : 4}
                  fill={current ? SEA : PANEL}
                  stroke={SEA}
                  strokeWidth={2}
                />
              );
            }}
            activeDot={{ r: 6, fill: SEA, stroke: PANEL, strokeWidth: 2 }}
            label={(props: { x?: number | string; y?: number | string; index?: number; value?: unknown }) =>
              props.index === last && !empty ? (
                <text
                  key="current-label"
                  x={props.x}
                  y={Number(props.y ?? 0) - 14}
                  textAnchor="middle"
                  fill={FIGURE}
                  fontSize={12}
                  fontWeight={600}
                >
                  {formatMoneyShort(Number(props.value ?? 0))}
                </text>
              ) : (
                <g key={`label-${props.index}`} />
              )
            }
          />
        </LineChart>
      </ResponsiveContainer>
      {empty ? <p className={`${styles.emptyOverlay} ${styles.onDark}`}>No deals won in the last 12 months</p> : null}
    </div>
  );
}
