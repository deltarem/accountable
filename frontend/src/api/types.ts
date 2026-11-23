import type { StageKey, StatusKey } from '../lib/stages';

export type ActivityType = 'note' | 'call' | 'email';

export interface Organization {
  id: number;
  name: string;
  website: string | null;
  industry: string | null;
  notes: string | null;
  contact_count: number;
  open_deal_count: number;
  open_value_cents: number;
  created_at: string;
  updated_at: string;
}

export interface OrganizationDetail extends Organization {
  contacts: { id: number; name: string; job_title: string | null; status: StatusKey }[];
  deals: { id: number; name: string; stage: StageKey; value_cents: number }[];
  timeline: TimelineEntry[];
}

export interface Contact {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  organization_id: number | null;
  organization_name: string | null;
  status: StatusKey;
  created_at: string;
  updated_at: string;
}

export interface ContactDetail extends Contact {
  deals: { id: number; name: string; stage: StageKey; value_cents: number; organization_name: string | null }[];
  timeline: TimelineEntry[];
}

export interface Deal {
  id: number;
  name: string;
  organization_id: number | null;
  organization_name: string | null;
  contact_id: number | null;
  contact_name: string | null;
  stage: StageKey;
  value_cents: number;
  probability: number;
  close_date: string | null;
  position: number;
  late: boolean;
  expected_cents: number;
  created_at: string;
  updated_at: string;
}

export interface DealDetail extends Deal {
  timeline: TimelineEntry[];
}

export interface Activity {
  id: number;
  type: ActivityType;
  contact_id: number | null;
  deal_id: number | null;
  description: string;
  occurred_at: string;
  follow_up_date: string | null;
  follow_up_done: boolean;
}

export interface RecordRef {
  kind: 'deal' | 'contact';
  id: number;
  name: string;
  organization_name?: string | null;
}

export interface TimelineEntry {
  key: string;
  kind: 'activity' | 'stage_change' | 'status_change';
  id: number;
  type: ActivityType | null;
  description: string | null;
  from_value: string | null;
  to_value: string | null;
  occurred_at: string;
  follow_up_date: string | null;
  follow_up_done: boolean;
  deal_id: number | null;
  contact_id: number | null;
  source?: RecordRef | null;
  record?: RecordRef | null;
}

export interface FollowUp extends TimelineEntry {
  group: 'overdue' | 'today' | 'week';
  record: RecordRef | null;
}

export interface MonthFigures {
  month: string;
  won_cents: number;
  won_count: number;
  lost_cents: number;
  lost_count: number;
}

export interface Dashboard {
  today: string;
  open_pipeline_cents: number;
  open_deal_count: number;
  expected_cents: number;
  won_this_month_cents: number;
  won_last_month_cents: number;
  won_change_pct: number | null;
  overdue_count: number;
  due_today_count: number;
  months: MonthFigures[];
  won_total_cents: number;
  won_count: number;
  lost_count: number;
  funnel: { stage: StageKey; value_cents: number; count: number; share_pct: number | null }[];
  pipeline_by_stage: { stage: StageKey; count: number; value_cents: number; expected_cents: number }[];
  follow_ups: FollowUp[];
  recent_activity: TimelineEntry[];
}

export interface Today {
  today: string;
  now: string;
}
