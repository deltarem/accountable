import * as Tooltip from '@radix-ui/react-tooltip';
import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import type { Deal } from '../../api/types';
import { applyMove } from '../../lib/board';
import { Board } from './Board';
import { BoardTotals } from './BoardTotals';

let nextId = 1;
function deal(stage: Deal['stage'], value: number, probability: number, extra: Partial<Deal> = {}): Deal {
  const id = nextId++;
  return {
    id,
    name: `Deal ${id}`,
    organization_id: 1,
    organization_name: 'Acme Ltd',
    contact_id: null,
    contact_name: null,
    stage,
    value_cents: value,
    probability,
    close_date: '2026-12-01',
    position: id,
    late: false,
    expected_cents: 0,
    created_at: '2026-11-01T10:00:00',
    updated_at: '2026-11-01T10:00:00',
    created_by_name: null,
    updated_by_name: null,
    ...extra,
  };
}

const deals = [
  deal('new', 100_000, 10),
  deal('new', 50_000, 10),
  deal('proposal', 33_333, 50),
  deal('negotiation', 200_000, 80),
  deal('won', 999_900, 100),
  deal('lost', 12_300, 0),
];

function renderBoard(list: Deal[]) {
  render(
    <Tooltip.Provider>
      <BoardTotals deals={list} />
      <Board deals={list} today="2026-11-23" onMove={() => {}} onAdd={() => {}} onOpen={() => {}} />
    </Tooltip.Provider>,
  );
}

test('totals add up open deals only', () => {
  renderBoard(deals);
  // 1.000 + 500 + 333,33 + 2.000 = $3.833,33 open
  expect(screen.getByTestId('total-open').textContent).toBe('$3.833,33');
  // 100 + 50 + 166,665 + 1.600 = 1.916,665 -> rounded half up once, at the end
  expect(screen.getByTestId('total-expected').textContent).toBe('$1.916,67');
  expect(screen.getByTestId('total-count').textContent).toBe('4');
});

test('column figures add up their own deals', () => {
  renderBoard(deals);
  expect(screen.getByTestId('value-new').textContent).toBe('$1.500,00');
  expect(screen.getByTestId('expected-new').textContent).toBe('exp $150,00');
  expect(screen.getByTestId('expected-proposal').textContent).toBe('exp $166,67');
  expect(screen.getByTestId('expected-negotiation').textContent).toBe('exp $1.600,00');
  expect(screen.getByLabelText('2 deals')).toBeTruthy();
});

test('Won and Lost show no expected revenue', () => {
  renderBoard(deals);
  expect(screen.getByTestId('value-won').textContent).toBe('$9.999,00');
  expect(screen.getByTestId('expected-won').textContent).toBe('Closed, won');
  expect(screen.getByTestId('expected-lost').textContent).toBe('Closed, lost');
});

test('an empty column says so and stays a drop target', () => {
  renderBoard(deals.filter((d) => d.stage !== 'qualified'));
  const qualified = screen.getByRole('region', { name: 'Qualified column' });
  expect(qualified.textContent).toContain('No deals');
});

test('a move updates stage, probability, close date and positions at once', () => {
  const moved = applyMove(deals, deals[0].id, 'won', 0, '2026-11-23');
  const card = moved.find((d) => d.id === deals[0].id)!;
  expect(card).toMatchObject({ stage: 'won', probability: 100, close_date: '2026-11-23', position: 0 });
  expect(moved.find((d) => d.id === deals[4].id)!.position).toBe(1);
  expect(moved.find((d) => d.id === deals[1].id)!.position).toBe(0);
});
