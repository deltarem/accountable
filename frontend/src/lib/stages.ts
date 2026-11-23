// Stage names, colours and usual probabilities (DEC-05), and the two deal
// helpers the screens need (RULE-06, RULE-07). The backend has the same table.

export type StageKey = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type StatusKey = 'lead' | 'qualified' | 'customer';

export interface StageInfo {
  key: StageKey;
  name: string;
  probability: number;
  open: boolean;
  /** Solid fill for headers, rows and chart marks */
  fill: string;
  /** Text on the solid fill */
  ink: string;
  /** Badge: text on tint */
  badgeText: string;
  badgeTint: string;
  /** A mark that must show on the Midnight panels */
  onDark: string;
}

export const STAGES: StageInfo[] = [
  {
    key: 'new',
    name: 'New',
    probability: 10,
    open: true,
    fill: '#0D6E8F',
    ink: '#FFFFFF',
    badgeText: '#0D6E8F',
    badgeTint: '#E7F3F7',
    onDark: '#118AB2',
  },
  {
    key: 'qualified',
    name: 'Qualified',
    probability: 25,
    open: true,
    fill: '#FFC145',
    ink: '#073B4C',
    badgeText: '#8A5A00',
    badgeTint: '#FFF6E3',
    onDark: '#FFC145',
  },
  {
    key: 'proposal',
    name: 'Proposal',
    probability: 50,
    open: true,
    fill: '#F78C6B',
    ink: '#073B4C',
    badgeText: '#B4472A',
    badgeTint: '#FEEEE9',
    onDark: '#F78C6B',
  },
  {
    key: 'negotiation',
    name: 'Negotiation',
    probability: 75,
    open: true,
    fill: '#073B4C',
    ink: '#FFFFFF',
    badgeText: '#073B4C',
    badgeTint: '#E8EEF0',
    onDark: '#CDD8DB',
  },
  {
    key: 'won',
    name: 'Won',
    probability: 100,
    open: false,
    fill: '#06D6A0',
    ink: '#073B4C',
    badgeText: '#067A5C',
    badgeTint: '#E6FBF5',
    onDark: '#06D6A0',
  },
  {
    key: 'lost',
    name: 'Lost',
    probability: 0,
    open: false,
    fill: '#8FA3AA',
    ink: '#073B4C',
    badgeText: '#4D6973',
    badgeTint: '#E8EEF0',
    onDark: '#8FA3AA',
  },
];

export const STAGE_KEYS = STAGES.map((s) => s.key);
export const OPEN_STAGE_KEYS = STAGES.filter((s) => s.open).map((s) => s.key);

const BY_KEY = Object.fromEntries(STAGES.map((s) => [s.key, s])) as Record<StageKey, StageInfo>;

export function stage(key: StageKey | string): StageInfo {
  return BY_KEY[key as StageKey] ?? BY_KEY.new;
}

export function isOpen(key: StageKey | string): boolean {
  return stage(key).open;
}

export const STATUSES: { key: StatusKey; name: string; text: string; tint: string }[] = [
  { key: 'lead', name: 'Lead', text: '#0D6E8F', tint: '#E7F3F7' },
  { key: 'qualified', name: 'Qualified', text: '#8A5A00', tint: '#FFF6E3' },
  { key: 'customer', name: 'Customer', text: '#067A5C', tint: '#E6FBF5' },
];

export function status(key: StatusKey | string) {
  return STATUSES.find((s) => s.key === key) ?? STATUSES[0];
}

/** RULE-06: open, with a close date before today. */
export function isLate(deal: { stage: string; close_date: string | null }, todayIso: string): boolean {
  return isOpen(deal.stage) && !!deal.close_date && deal.close_date < todayIso;
}

/** Value times probability in cents, rounded half up. */
export function expectedRevenue(valueCents: number, probability: number): number {
  return Math.floor((valueCents * probability * 2 + 100) / 200);
}

/** RULE-07: open deals only; summed in cents and rounded once at the end. */
export function totals(deals: { stage: string; value_cents: number; probability: number }[]) {
  const open = deals.filter((d) => isOpen(d.stage));
  const value = open.reduce((sum, d) => sum + d.value_cents, 0);
  const raw = open.reduce((sum, d) => sum + d.value_cents * d.probability, 0);
  return { count: open.length, valueCents: value, expectedCents: Math.floor((raw * 2 + 100) / 200) };
}
