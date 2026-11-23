import type { KeyboardCoordinateGetter } from '@dnd-kit/core';
import { describe, expect, test } from 'vitest';

import { boardKeyboardCoordinates } from './keyboard';

type Args = Parameters<KeyboardCoordinateGetter>[1];
type Box = { top: number; left: number; width: number; height: number };

// A board of four cards: 1 and 2 in New, 4 and 3 (lower down) in Qualified.
// Proposal is empty and measured; Negotiation is empty and not measured.
const CARDS: Record<number, { column: string; rect: Box }> = {
  1: { column: 'column:new', rect: { left: 0, top: 100, width: 150, height: 80 } },
  2: { column: 'column:new', rect: { left: 0, top: 190, width: 150, height: 80 } },
  3: { column: 'column:qualified', rect: { left: 160, top: 300, width: 150, height: 80 } },
  4: { column: 'column:qualified', rect: { left: 160, top: 100, width: 150, height: 80 } },
};
const COLUMNS: Record<string, Box | undefined> = {
  'column:new': { left: 0, top: 100, width: 150, height: 170 },
  'column:qualified': { left: 160, top: 100, width: 150, height: 260 },
  'column:proposal': { left: 320, top: 100, width: 150, height: 80 },
  'column:negotiation': undefined,
  'column:won': { left: 640, top: 100, width: 150, height: 80 },
  'column:lost': { left: 800, top: 100, width: 150, height: 80 },
};

function container(id: string | number) {
  const card = typeof id === 'number' ? CARDS[id] : undefined;
  return { id, data: { current: card ? { sortable: { containerId: card.column } } : {} } };
}

function args(activeId: string | number, cards: Record<number, { column: string; rect: Box }> = CARDS): Args {
  const ids = [...Object.keys(cards).map(Number), ...Object.keys(COLUMNS)];
  const rects = new Map<string | number, Box>();
  for (const [id, card] of Object.entries(cards)) rects.set(Number(id), card.rect);
  for (const [id, rect] of Object.entries(COLUMNS)) if (rect) rects.set(id, rect);
  const activeRect = typeof activeId === 'number' ? cards[activeId]?.rect : undefined;
  const context = {
    active: { id: activeId },
    collisionRect: activeRect ?? { left: 0, top: 0, width: 150, height: 80 },
    droppableRects: rects,
    droppableContainers: {
      get: (id: string | number) => (ids.includes(id) ? container(id) : undefined),
      getEnabled: () => ids.map(container),
    },
  };
  return {
    active: activeId,
    currentCoordinates: { x: -1, y: -1 },
    context: context as unknown as Args['context'],
  };
}

function press(code: string, a: Args) {
  const event = new KeyboardEvent('keydown', { code, cancelable: true });
  return { result: boardKeyboardCoordinates(event, a), prevented: event.defaultPrevented };
}

describe('board keyboard moves (DEC-14)', () => {
  test('Right goes to the nearest card, by height, in the next column', () => {
    const { result, prevented } = press('ArrowRight', args(1));
    expect(result).toEqual({ x: 160, y: 100 });
    expect(prevented).toBe(true);
    expect(press('ArrowRight', args(2)).result).toEqual({ x: 160, y: 100 });
  });

  test('Left goes back to the previous column', () => {
    expect(press('ArrowLeft', args(3)).result).toEqual({ x: 0, y: 190 });
  });

  test('an empty column takes the card at its top', () => {
    expect(press('ArrowRight', args(3)).result).toEqual({ x: 320, y: 100 });
  });

  test('a column that is not measured yet leaves the card where it is', () => {
    const onlyProposal = { 5: { column: 'column:proposal', rect: { left: 320, top: 100, width: 150, height: 80 } } };
    const a = args(5, { ...CARDS, ...onlyProposal });
    expect(press('ArrowRight', a).result).toEqual({ x: -1, y: -1 });
  });

  test('there is no column before New or after Lost', () => {
    expect(press('ArrowLeft', args(1)).result).toEqual({ x: -1, y: -1 });
    const lost = { 6: { column: 'column:lost', rect: { left: 800, top: 100, width: 150, height: 80 } } };
    expect(press('ArrowRight', args(6, { ...CARDS, ...lost })).result).toEqual({ x: -1, y: -1 });
  });

  test('Down and Up go to the next card in the same column', () => {
    expect(press('ArrowDown', args(1)).result).toEqual({ x: 0, y: 190 });
    expect(press('ArrowUp', args(2)).result).toEqual({ x: 0, y: 100 });
    expect(press('ArrowUp', args(3)).result).toEqual({ x: 160, y: 100 });
  });

  test('Down at the bottom and Up at the top stay put', () => {
    expect(press('ArrowDown', args(2)).result).toEqual({ x: -1, y: -1 });
    expect(press('ArrowUp', args(1)).result).toEqual({ x: -1, y: -1 });
  });

  test('other keys are left alone', () => {
    const { result, prevented } = press('KeyA', args(1));
    expect(result).toBeUndefined();
    expect(prevented).toBe(false);
  });

  test('nothing happens without a card being dragged', () => {
    const a = args(1);
    const noRect = { ...a, context: { ...a.context, collisionRect: null } };
    expect(press('ArrowRight', noRect).result).toBeUndefined();
    const noActive = { ...a, context: { ...a.context, active: null } };
    expect(press('ArrowRight', noActive).result).toBeUndefined();
  });

  test('a dragged item that is not in a column stays put', () => {
    expect(press('ArrowRight', args('column:new')).result).toEqual({ x: -1, y: -1 });
  });
});
