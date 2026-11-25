import type { Dashboard, FollowUp, MonthFigures, TimelineEntry } from '../api/types';

/** Twelve month keys ending with Nov 2026, the fixed "today" of these tests. */
export const MONTH_KEYS = Array.from({ length: 12 }, (_, i) => {
  const index = 2025 * 12 + 11 + i;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
});

export function makeMonths(figures: Partial<MonthFigures>[] = []): MonthFigures[] {
  return MONTH_KEYS.map((month, i) => ({
    month,
    won_cents: 0,
    won_count: 0,
    lost_cents: 0,
    lost_count: 0,
    ...figures[i],
  }));
}

export function timelineEntry(overrides: Partial<TimelineEntry> = {}): TimelineEntry {
  return {
    key: `activity-${overrides.id ?? 1}`,
    kind: 'activity',
    id: 1,
    type: 'call',
    description: 'Called about the renewal',
    from_value: null,
    to_value: null,
    occurred_at: '2026-11-23T14:05:00',
    follow_up_date: null,
    follow_up_done: false,
    deal_id: null,
    contact_id: null,
    created_by_name: null,
    record: null,
    ...overrides,
  };
}

export function followUp(overrides: Partial<FollowUp> = {}): FollowUp {
  return {
    ...timelineEntry(),
    group: 'today',
    follow_up_date: '2026-11-23',
    record: null,
    ...overrides,
  };
}

export function makeDashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    today: '2026-11-23',
    open_pipeline_cents: 113_000_000,
    open_deal_count: 14,
    expected_cents: 52_950_000,
    won_this_month_cents: 8_600_000,
    won_last_month_cents: 6_300_000,
    won_change_pct: 37,
    overdue_count: 4,
    due_today_count: 2,
    months: makeMonths(MONTH_KEYS.map((_, i) => ({ won_cents: 1_000_000 * (i + 1), won_count: 1 }))),
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
    ...overrides,
  };
}
