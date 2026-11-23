import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import type { Dashboard } from '../api/types';
import { mockFetch, renderWithProviders } from '../test/utils';
import { DashboardPage } from './DashboardPage';

const months = Array.from({ length: 12 }, (_, i) => {
  const index = 2025 * 12 + 11 + i;
  const key = `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
  return { month: key, won_cents: 1_000_000 * (i + 1), won_count: 1, lost_cents: 0, lost_count: 0 };
});

const dashboard: Dashboard = {
  today: '2026-11-23',
  open_pipeline_cents: 113_000_000,
  open_deal_count: 14,
  expected_cents: 52_950_000,
  won_this_month_cents: 8_600_000,
  won_last_month_cents: 6_300_000,
  won_change_pct: 37,
  overdue_count: 4,
  due_today_count: 2,
  months,
  won_total_cents: 66_800_000,
  won_count: 13,
  lost_count: 3,
  funnel: [
    { stage: 'new', value_cents: 194_800_000, count: 30, share_pct: 100 },
    { stage: 'qualified', value_cents: 182_800_000, count: 26, share_pct: 94 },
    { stage: 'proposal', value_cents: 148_300_000, count: 21, share_pct: 76 },
    { stage: 'negotiation', value_cents: 108_300_000, count: 17, share_pct: 56 },
    { stage: 'won', value_cents: 66_800_000, count: 13, share_pct: 34 },
  ],
  pipeline_by_stage: [
    { stage: 'new', count: 4, value_cents: 12_000_000, expected_cents: 1_200_000 },
    { stage: 'qualified', count: 4, value_cents: 31_000_000, expected_cents: 7_750_000 },
    { stage: 'proposal', count: 3, value_cents: 34_000_000, expected_cents: 17_000_000 },
    { stage: 'negotiation', count: 3, value_cents: 36_000_000, expected_cents: 27_000_000 },
  ],
  follow_ups: [],
  recent_activity: [],
};

test('while loading, every panel shows its placeholder in the same layout', async () => {
  mockFetch({ '/api/dashboard': new Promise(() => {}) });
  renderWithProviders(<DashboardPage />);
  for (const name of ['Sales funnel', 'Pipeline by stage', 'Won and lost', 'Follow-ups', 'Recent activity']) {
    const panel = screen.getByText(name).closest('section')!;
    expect(panel.querySelectorAll('[data-testid="skeleton"]').length, name).toBeGreaterThan(0);
  }
  const headline = screen.getByRole('region', { name: 'Headline figures' });
  expect(headline.querySelectorAll('[data-testid="skeleton"]').length).toBeGreaterThan(4);
});

test('when the data arrives, the placeholders are replaced', async () => {
  mockFetch({ '/api/dashboard': dashboard });
  renderWithProviders(<DashboardPage />);
  expect((await screen.findByTestId('open-pipeline')).textContent).toBe('$1.130.000');
  expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
  expect(screen.getByTestId('expected-revenue').textContent).toBe('$529.500');
  expect(screen.getByTestId('won-this-month').textContent).toBe('$86.000');
  expect(screen.getByText('Monday, 23 Nov 2026')).toBeTruthy();
  expect(screen.getByText("No follow-ups due. You're up to date.")).toBeTruthy();
  expect(screen.getByText('No activity yet')).toBeTruthy();
});
