import { describe, expect, test } from 'vitest';

import { OPEN_STAGE_KEYS, STAGES, STAGE_KEYS, expectedRevenue, isLate, isOpen, stage, status, totals } from './stages';

test('usual probabilities', () => {
  expect(Object.fromEntries(STAGES.map((s) => [s.key, s.probability]))).toEqual({
    new: 10,
    qualified: 25,
    proposal: 50,
    negotiation: 75,
    won: 100,
    lost: 0,
  });
});

test('open or closed', () => {
  expect(STAGES.filter((s) => s.open).map((s) => s.key)).toEqual(['new', 'qualified', 'proposal', 'negotiation']);
  expect(isOpen('won')).toBe(false);
  expect(isOpen('lost')).toBe(false);
});

// The values behind these tokens, and their contrast in both modes, are checked
// in styles/tokens.test.ts.
test('each stage has its colour pair (DEC-05, DEC-06)', () => {
  expect([stage('new').fill, stage('new').ink]).toEqual(['var(--stage-new)', 'var(--stage-new-ink)']);
  expect([stage('qualified').fill, stage('qualified').ink]).toEqual([
    'var(--stage-qualified)',
    'var(--stage-qualified-ink)',
  ]);
  expect([stage('proposal').fill, stage('proposal').ink]).toEqual([
    'var(--stage-proposal)',
    'var(--stage-proposal-ink)',
  ]);
  expect([stage('negotiation').fill, stage('negotiation').ink]).toEqual([
    'var(--stage-negotiation)',
    'var(--stage-negotiation-ink)',
  ]);
  expect([stage('won').fill, stage('won').ink]).toEqual(['var(--stage-won)', 'var(--stage-won-ink)']);
  expect([stage('lost').fill, stage('lost').ink]).toEqual(['var(--stage-lost)', 'var(--stage-lost-ink)']);
  expect([stage('lost').badgeText, stage('lost').badgeTint]).toEqual(['var(--muted)', 'var(--midnight-tint)']);
});

describe('isLate', () => {
  const today = '2026-11-23';
  test('open with a past close date', () => {
    expect(isLate({ stage: 'proposal', close_date: '2026-11-22' }, today)).toBe(true);
  });
  test('today is not late', () => {
    expect(isLate({ stage: 'proposal', close_date: '2026-11-23' }, today)).toBe(false);
  });
  test('closed or dateless deals are never late', () => {
    expect(isLate({ stage: 'won', close_date: '2026-01-01' }, today)).toBe(false);
    expect(isLate({ stage: 'lost', close_date: '2026-01-01' }, today)).toBe(false);
    expect(isLate({ stage: 'new', close_date: null }, today)).toBe(false);
  });
});

describe('expected revenue', () => {
  test('rounds half up in cents', () => {
    expect(expectedRevenue(333, 50)).toBe(167);
    expect(expectedRevenue(1_200_000, 75)).toBe(900_000);
    expect(expectedRevenue(101, 50)).toBe(51);
    expect(expectedRevenue(99, 10)).toBe(10);
  });

  test('totals add up open deals only and round once at the end', () => {
    const t = totals([
      { stage: 'new', value_cents: 1_000_000, probability: 10 },
      { stage: 'proposal', value_cents: 33_333, probability: 50 },
      { stage: 'won', value_cents: 999_999, probability: 100 },
      { stage: 'lost', value_cents: 5_000, probability: 0 },
    ]);
    expect(t).toEqual({ count: 2, valueCents: 1_033_333, expectedCents: 116_667 });
  });
});

test('stage keys in board order, and the open ones', () => {
  expect(STAGE_KEYS).toEqual(['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']);
  expect(OPEN_STAGE_KEYS).toEqual(['new', 'qualified', 'proposal', 'negotiation']);
});

test('an unknown stage falls back to New rather than breaking the screen', () => {
  expect(stage('archived').key).toBe('new');
  expect(isOpen('archived')).toBe(true);
});

describe('contact statuses', () => {
  test('each status has its name and badge colours', () => {
    expect(status('lead')).toEqual({
      key: 'lead',
      name: 'Lead',
      text: 'var(--cerulean-text)',
      tint: 'var(--cerulean-tint)',
    });
    expect(status('qualified').name).toBe('Qualified');
    expect(status('customer').name).toBe('Customer');
  });

  test('an unknown status falls back to Lead', () => {
    expect(status('vip').key).toBe('lead');
  });
});
