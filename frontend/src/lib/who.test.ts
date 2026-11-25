import { describe, expect, test } from 'vitest';

import { whoLine, whoName } from './who';

const ADDED = { created_at: '2026-03-02T09:00:00', created_by_name: 'Priya Shah' };

describe('whoLine (UI-WHO-01)', () => {
  test('added and changed by different people', () => {
    expect(whoLine({ ...ADDED, updated_at: '2026-11-20T16:40:00', updated_by_name: 'Sam Lee' })).toBe(
      'Added by Priya Shah on 2 Mar 2026 · Last changed by Sam Lee on 20 Nov 2026',
    );
  });

  test('nobody has changed it since: only the first half', () => {
    expect(whoLine({ ...ADDED, updated_at: ADDED.created_at, updated_by_name: 'Priya Shah' })).toBe(
      'Added by Priya Shah on 2 Mar 2026',
    );
  });

  test('changed later by the person who added it', () => {
    expect(whoLine({ ...ADDED, updated_at: '2026-03-05T10:00:00', updated_by_name: 'Priya Shah' })).toBe(
      'Added by Priya Shah on 2 Mar 2026 · Last changed by Priya Shah on 5 Mar 2026',
    );
  });

  test('sample data nobody has edited', () => {
    expect(
      whoLine({
        created_at: '2026-03-02T09:00:00',
        updated_at: '2026-06-01T09:00:00',
        created_by_name: null,
        updated_by_name: null,
      }),
    ).toBe('Added by Sample data on 2 Mar 2026');
  });

  test('sample data someone has since edited', () => {
    expect(
      whoLine({
        created_at: '2026-03-02T09:00:00',
        updated_at: '2026-11-20T09:00:00',
        created_by_name: null,
        updated_by_name: 'Sam Lee',
      }),
    ).toBe('Added by Sample data on 2 Mar 2026 · Last changed by Sam Lee on 20 Nov 2026');
  });
});

test('whoName (UI-WHO-02)', () => {
  expect(whoName('Priya Shah')).toBe('Priya Shah');
  expect(whoName(null)).toBe('Sample data');
});
