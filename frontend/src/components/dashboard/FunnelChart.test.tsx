import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { makeDashboard } from '../../test/dashboardFixtures';
import { FunnelChart } from './FunnelChart';

describe('FunnelChart (UI-DASH-03)', () => {
  test('one column per stage, with its share, name and value, getting shorter', () => {
    render(<FunnelChart funnel={makeDashboard().funnel} />);
    const qualified = screen.getByTestId('funnel-qualified');
    expect(qualified.textContent).toBe('94%Qualified$1.828.000');
    expect(qualified.getAttribute('title')).toBe('Qualified: $1.828.000,00 from 26 deals');
    const heights = ['new', 'qualified', 'proposal', 'negotiation', 'won'].map((s) =>
      parseFloat((screen.getByTestId(`funnel-${s}`).children[1] as HTMLElement).style.height),
    );
    expect(heights[0]).toBe(120);
    expect([...heights].sort((a, b) => b - a)).toEqual(heights);
  });

  test('a tiny stage still gets a visible column', () => {
    render(
      <FunnelChart
        funnel={[
          { stage: 'new', value_cents: 100_000_000, count: 10, share_pct: 100 },
          { stage: 'won', value_cents: 1, count: 1, share_pct: 0 },
        ]}
      />,
    );
    const won = screen.getByTestId('funnel-won');
    expect((won.children[1] as HTMLElement).style.height).toBe('4px');
    expect(won.getAttribute('title')).toBe('Won: $0,01 from 1 deal');
  });

  test('with nothing in New, a line says so instead (UI-EMPTY-02)', () => {
    render(<FunnelChart funnel={[{ stage: 'new', value_cents: 0, count: 0, share_pct: null }]} />);
    expect(screen.getByText('No deals in the funnel yet')).toBeTruthy();
    expect(screen.queryByTestId('funnel')).toBeNull();
  });

  test('an empty funnel list is treated the same way', () => {
    render(<FunnelChart funnel={[]} />);
    expect(screen.getByText('No deals in the funnel yet')).toBeTruthy();
  });
});
