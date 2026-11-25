import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import type { Deal } from '../../api/types';
import { BoardTotals } from './BoardTotals';

function deal(id: number, stage: Deal['stage'], value: number, probability: number): Deal {
  return {
    id,
    name: `Deal ${id}`,
    organization_id: null,
    organization_name: null,
    contact_id: null,
    contact_name: null,
    stage,
    value_cents: value,
    probability,
    close_date: null,
    position: id,
    late: false,
    expected_cents: 0,
    created_at: '2026-11-01T10:00:00',
    updated_at: '2026-11-01T10:00:00',
    created_by_name: null,
    updated_by_name: null,
  };
}

describe('BoardTotals (UI-PIPE-01)', () => {
  test('open deals make up the totals and the stacked bar, one segment per stage with value', () => {
    render(
      <BoardTotals
        deals={[deal(1, 'new', 1_000_000, 10), deal(2, 'proposal', 500_000, 50), deal(3, 'won', 9_999_900, 100)]}
      />,
    );
    expect(screen.getByTestId('total-open').textContent).toBe('$15.000,00');
    expect(screen.getByTestId('total-expected').textContent).toBe('$3.500,00');
    expect(screen.getByTestId('total-count').textContent).toBe('2');
    const bar = screen.getByRole('img', { name: 'Open value by stage' });
    expect([...bar.children].map((c) => c.getAttribute('title'))).toEqual(['New: $10.000', 'Proposal: $5.000']);
    expect(screen.queryByText('No open deals')).toBeNull();
  });

  test('with only closed deals, the bar says there are no open deals (UI-EMPTY-02)', () => {
    render(<BoardTotals deals={[deal(1, 'won', 1_000_000, 100), deal(2, 'lost', 50_000, 0)]} />);
    expect(screen.getByText('No open deals')).toBeTruthy();
    expect(screen.getByTestId('total-open').textContent).toBe('$0,00');
    expect(screen.getByTestId('total-count').textContent).toBe('0');
    expect(screen.queryByRole('img', { name: 'Open value by stage' })).toBeNull();
  });

  test('while the deals load, the figures are placeholders, not zeros (UI-EMPTY-05)', () => {
    render(<BoardTotals deals={undefined} />);
    expect(screen.getAllByTestId('skeleton')).toHaveLength(3);
    expect(screen.getByTestId('total-open').textContent).toBe('');
    expect(screen.queryByText('No open deals')).toBeNull();
  });

  test('the legend names every open stage', () => {
    render(<BoardTotals deals={[]} />);
    for (const name of ['New', 'Qualified', 'Proposal', 'Negotiation']) expect(screen.getByText(name)).toBeTruthy();
    expect(screen.queryByText('Won')).toBeNull();
  });
});
