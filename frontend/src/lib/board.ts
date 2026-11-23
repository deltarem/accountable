// The board's state is a plain map from stage to ordered deal ids. These
// helpers build it and apply a move the way the server will (ARC-08), so the
// board can update before the server answers.

import type { Deal } from '../api/types';
import { STAGE_KEYS, type StageKey, isLate, stage as stageInfo } from './stages';

export type Columns = Record<StageKey, number[]>;

export function toColumns(deals: Deal[]): Columns {
  const columns = Object.fromEntries(STAGE_KEYS.map((k) => [k, [] as Deal[]])) as Record<StageKey, Deal[]>;
  for (const deal of deals) columns[deal.stage]?.push(deal);
  return Object.fromEntries(
    STAGE_KEYS.map((k) => [k, columns[k].sort((a, b) => a.position - b.position || a.id - b.id).map((d) => d.id)]),
  ) as Columns;
}

export function findColumn(columns: Columns, id: number): StageKey | undefined {
  return STAGE_KEYS.find((k) => columns[k].includes(id));
}

/** Move one deal in the map; the index is its place in the target column. */
export function moveInColumns(columns: Columns, id: number, stage: StageKey, index: number): Columns {
  const next = Object.fromEntries(STAGE_KEYS.map((k) => [k, columns[k].filter((x) => x !== id)])) as Columns;
  const target = next[stage];
  target.splice(Math.max(0, Math.min(index, target.length)), 0, id);
  return next;
}

/** The deals list after a move: new stage, its probability, today's date when
 * closing, and every column renumbered. */
export function applyMove(deals: Deal[], id: number, stage: string, index: number, today: string): Deal[] {
  const moving = deals.find((d) => d.id === id);
  if (!moving) return deals;
  const columns = moveInColumns(toColumns(deals), id, stage as StageKey, index);
  const positions = new Map<number, number>();
  for (const k of STAGE_KEYS) columns[k].forEach((dealId, i) => positions.set(dealId, i));
  return deals.map((d) => {
    let next: Deal = { ...d, position: positions.get(d.id) ?? d.position };
    if (d.id === id && d.stage !== stage) {
      const info = stageInfo(stage);
      next = {
        ...next,
        stage: info.key,
        probability: info.probability,
        close_date: info.open ? d.close_date : today || d.close_date,
      };
      next.late = isLate(next, today);
      next.expected_cents = Math.floor((next.value_cents * next.probability * 2 + 100) / 200);
    }
    return next;
  });
}
