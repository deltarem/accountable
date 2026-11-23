import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import { giveChartsASize } from '../../test/chartSize';
import { makeMonths } from '../../test/dashboardFixtures';
import { WonLostChart } from './WonLostChart';

beforeEach(() => giveChartsASize(320, 200));

const months = makeMonths().map((m, i) =>
  i === 11 ? { ...m, won_count: 3, won_cents: 9_000_000, lost_count: 1, lost_cents: 250_000 } : m,
);

describe('WonLostChart (UI-DASH-05)', () => {
  test('shows how many deals were won and lost, with no empty line', () => {
    render(<WonLostChart months={months} wonCount={13} lostCount={3} />);
    expect(screen.getByText('13 won')).toBeTruthy();
    expect(screen.getByText('3 lost')).toBeTruthy();
    expect(screen.queryByText('No deals won or lost in the last 12 months')).toBeNull();
  });

  test('draws won bars above the line and lost bars below it', () => {
    const { container } = render(<WonLostChart months={months} wonCount={3} lostCount={1} />);
    const line = Number(container.querySelector('.recharts-reference-line line')!.getAttribute('y1'));
    const won = container.querySelector('.recharts-bar-rectangle path[name="Won"]')!;
    const lost = container.querySelector('.recharts-bar-rectangle path[name="Lost"]')!;
    const wonTop = Number(won.getAttribute('y'));
    const lostBottom = Number(lost.getAttribute('y'));
    expect(wonTop).toBeLessThan(line);
    expect(wonTop + Number(won.getAttribute('height'))).toBeCloseTo(line);
    expect(lostBottom).toBeGreaterThan(line);
    expect(won.getAttribute('fill')).not.toBe(lost.getAttribute('fill'));
  });

  test('a month shows its won and lost figures in the tooltip', () => {
    const { container } = render(<WonLostChart months={months} wonCount={3} lostCount={1} />);
    const surface = container.querySelector<SVGElement>('svg.recharts-surface')!;
    act(() => surface.focus());
    for (let i = 0; i < 11; i += 1) fireEvent.keyDown(surface, { key: 'ArrowRight' });
    const tip = container.querySelector('.recharts-tooltip-wrapper')!;
    expect(tip.textContent).toBe('Nov 20263 won ($90.000,00)1 lost ($2.500,00)');
  });

  test('screen readers get the numbers as a table', () => {
    render(<WonLostChart months={months} wonCount={3} lostCount={1} />);
    const table = screen.getByRole('table', { name: 'Deals won and lost by month' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(13);
    expect(rows[12].textContent).toBe('Nov 202631');
  });

  test('with nothing won or lost, a line says so (UI-EMPTY-02)', () => {
    render(<WonLostChart months={makeMonths()} wonCount={0} lostCount={0} />);
    expect(screen.getByText('No deals won or lost in the last 12 months')).toBeTruthy();
  });
});
