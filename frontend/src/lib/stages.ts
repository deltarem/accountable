// Stage names, colours and usual probabilities (DEC-05), and the two deal
// helpers the screens need (RULE-06, RULE-07). The backend has the same table.
//
// Colours are references to tokens.css (ARC-15), so they follow light and dark
// mode with no code here knowing which one is on.

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
    fill: 'var(--stage-new)',
    ink: 'var(--stage-new-ink)',
    badgeText: 'var(--cerulean-text)',
    badgeTint: 'var(--cerulean-tint)',
    onDark: 'var(--cerulean)',
  },
  {
    key: 'qualified',
    name: 'Qualified',
    probability: 25,
    open: true,
    fill: 'var(--stage-qualified)',
    ink: 'var(--stage-qualified-ink)',
    badgeText: 'var(--marigold-text)',
    badgeTint: 'var(--marigold-tint)',
    onDark: 'var(--marigold)',
  },
  {
    key: 'proposal',
    name: 'Proposal',
    probability: 50,
    open: true,
    fill: 'var(--stage-proposal)',
    ink: 'var(--stage-proposal-ink)',
    badgeText: 'var(--coral-text)',
    badgeTint: 'var(--coral-tint)',
    onDark: 'var(--coral)',
  },
  {
    key: 'negotiation',
    name: 'Negotiation',
    probability: 75,
    open: true,
    fill: 'var(--stage-negotiation)',
    ink: 'var(--stage-negotiation-ink)',
    badgeText: 'var(--ink)',
    badgeTint: 'var(--midnight-tint)',
    onDark: 'var(--mist)',
  },
  {
    key: 'won',
    name: 'Won',
    probability: 100,
    open: false,
    fill: 'var(--stage-won)',
    ink: 'var(--stage-won-ink)',
    badgeText: 'var(--sea-text)',
    badgeTint: 'var(--sea-tint)',
    onDark: 'var(--sea)',
  },
  {
    key: 'lost',
    name: 'Lost',
    probability: 0,
    open: false,
    fill: 'var(--stage-lost)',
    ink: 'var(--stage-lost-ink)',
    badgeText: 'var(--muted)',
    badgeTint: 'var(--midnight-tint)',
    onDark: 'var(--lost)',
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
  { key: 'lead', name: 'Lead', text: 'var(--cerulean-text)', tint: 'var(--cerulean-tint)' },
  { key: 'qualified', name: 'Qualified', text: 'var(--marigold-text)', tint: 'var(--marigold-tint)' },
  { key: 'customer', name: 'Customer', text: 'var(--sea-text)', tint: 'var(--sea-tint)' },
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
