import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import { formatMoneyShort } from '../../lib/format';
import { giveChartsASize } from '../../test/chartSize';
import { makeMonths } from '../../test/dashboardFixtures';
import { RevenueChart, niceTicks } from './RevenueChart';

beforeEach(() => giveChartsASize(600, 232));

/** Recharts' accessibility layer: focusing the chart picks the first month; each arrow press moves one on. */
function hoverByKeyboard(container: HTMLElement, steps: number) {
  const surface = container.querySelector<SVGElement>('svg.recharts-surface')!;
  act(() => surface.focus());
  for (let i = 0; i < steps; i += 1) fireEvent.keyDown(surface, { key: 'ArrowRight' });
}

const tooltip = (container: HTMLElement) => container.querySelector('.recharts-tooltip-wrapper')!;

describe('niceTicks', () => {
  test('four round steps from $0 that reach the largest month (UI-DASH-02)', () => {
    expect(niceTicks(8_600_000).map(formatMoneyShort)).toEqual(['$0', '$40k', '$80k', '$120k']);
    expect(niceTicks(25_000_000).map(formatMoneyShort)).toEqual(['$0', '$100k', '$200k', '$300k']);
  });

  test('an empty year still gets a small axis instead of a flat zero', () => {
    const ticks = niceTicks(0);
    expect(ticks[0]).toBe(0);
    expect(ticks[3]).toBeGreaterThan(0);
  });
});

describe('RevenueChart', () => {
  const months = makeMonths([{ won_cents: 1_000_000, won_count: 1 }]).map((m, i, all) =>
    i === all.length - 1 ? { ...m, won_cents: 8_600_000, won_count: 2 } : m,
  );

  test('the current month has a larger, filled dot and its short amount as a label (UI-DASH-02)', () => {
    const { container } = render(<RevenueChart months={months} />);
    const dots = [...container.querySelectorAll('.recharts-line-dots circle')];
    expect(dots).toHaveLength(12);
    expect(dots.slice(0, -1).every((d) => d.getAttribute('r') === '4')).toBe(true);
    expect(dots[11].getAttribute('r')).toBe('6');
    expect(dots[11].getAttribute('fill')).not.toBe(dots[0].getAttribute('fill'));
    expect(screen.getByText('$86k')).toBeTruthy();
    expect(screen.queryByText('No deals won in the last 12 months')).toBeNull();
  });

  test('a month shows its full total and deal count in the tooltip', () => {
    const { container } = render(<RevenueChart months={months} />);
    hoverByKeyboard(container, 11);
    expect(tooltip(container).textContent).toBe('Nov 2026$86.000,00 · 2 deals won');
  });

  test('a month with one deal says "1 deal"', () => {
    const { container } = render(<RevenueChart months={months} />);
    hoverByKeyboard(container, 0);
    expect(tooltip(container).textContent).toBe('Dec 2025$10.000,00 · 1 deal won');
  });

  test('with nothing won, the axes stay and a line says so, with no amount label (UI-EMPTY-02)', () => {
    const { container } = render(<RevenueChart months={makeMonths()} />);
    expect(screen.getByText('No deals won in the last 12 months')).toBeTruthy();
    expect(container.querySelectorAll('.recharts-line-dots circle')).toHaveLength(12);
    expect(container.querySelector('.recharts-cartesian-grid')).not.toBeNull();
    expect(screen.queryByText('$0', { selector: 'text[font-weight="600"]' })).toBeNull();
  });
});
