import { describe, expect, test } from 'vitest';

import type { Deal } from '../api/types';
import { applyMove, findColumn, moveInColumns, toColumns } from './board';

function deal(id: number, stage: Deal['stage'], position: number, extra: Partial<Deal> = {}): Deal {
  return {
    id,
    name: `Deal ${id}`,
    organization_id: 1,
    organization_name: 'Acme Ltd',
    contact_id: null,
    contact_name: null,
    stage,
    value_cents: 1_000_001,
    probability: 10,
    close_date: '2026-11-01',
    position,
    late: true,
    expected_cents: 100_000,
    created_at: '2026-11-01T10:00:00',
    updated_at: '2026-11-01T10:00:00',
    ...extra,
  };
}

const deals = [deal(1, 'new', 1), deal(2, 'new', 0), deal(3, 'proposal', 0), deal(4, 'new', 1)];

describe('toColumns', () => {
  test('every stage gets a column, ordered by position and then id (ARC-08)', () => {
    expect(toColumns(deals)).toEqual({
      new: [2, 1, 4],
      qualified: [],
      proposal: [3],
      negotiation: [],
      won: [],
      lost: [],
    });
  });
});

describe('findColumn', () => {
  test('finds the stage holding a deal', () => {
    const columns = toColumns(deals);
    expect(findColumn(columns, 3)).toBe('proposal');
    expect(findColumn(columns, 4)).toBe('new');
  });

  test('a deal that is not on the board has no column', () => {
    expect(findColumn(toColumns(deals), 99)).toBeUndefined();
  });
});

describe('moveInColumns', () => {
  test('an index past the end puts the deal last; a negative one puts it first', () => {
    const columns = toColumns(deals);
    expect(moveInColumns(columns, 3, 'new', 10).new).toEqual([2, 1, 4, 3]);
    expect(moveInColumns(columns, 3, 'new', -1).new).toEqual([3, 2, 1, 4]);
    expect(moveInColumns(columns, 3, 'new', 0).proposal).toEqual([]);
  });
});

describe('applyMove', () => {
  const today = '2026-11-23';

  test('moving to another open stage takes its probability and keeps the close date', () => {
    const moved = applyMove(deals, 2, 'negotiation', 0, today).find((d) => d.id === 2)!;
    expect(moved.stage).toBe('negotiation');
    expect(moved.probability).toBe(75);
    expect(moved.close_date).toBe('2026-11-01');
    expect(moved.late).toBe(true);
    expect(moved.expected_cents).toBe(750_001);
  });

  test('closing a deal sets today as its close date and it is no longer late (RULE-06)', () => {
    const moved = applyMove(deals, 2, 'won', 0, today).find((d) => d.id === 2)!;
    expect(moved.close_date).toBe(today);
    expect(moved.late).toBe(false);
    expect(moved.probability).toBe(100);
  });

  test('without a known today, closing keeps the old close date', () => {
    const moved = applyMove(deals, 2, 'lost', 0, '').find((d) => d.id === 2)!;
    expect(moved.close_date).toBe('2026-11-01');
    expect(moved.probability).toBe(0);
  });

  test('reordering within a column renumbers positions and changes nothing else', () => {
    const after = applyMove(deals, 4, 'new', 0, today);
    expect(after.map((d) => [d.id, d.position])).toEqual([
      [1, 2],
      [2, 1],
      [3, 0],
      [4, 0],
    ]);
    expect(after.find((d) => d.id === 4)!.probability).toBe(10);
  });

  test('moving a deal that is not in the list leaves the list as it was', () => {
    expect(applyMove(deals, 99, 'won', 0, today)).toBe(deals);
  });
});
