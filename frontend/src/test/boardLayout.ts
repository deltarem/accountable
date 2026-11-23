import { vi } from 'vitest';

import { STAGE_KEYS, type StageKey } from '../lib/stages';

// jsdom has no layout, so every element measures 0 x 0 and dnd-kit can't tell
// one place on the board from another. This gives the board a simple fixed
// layout: six columns side by side, cards stacked in each one in DOM order.

export const COLUMN_WIDTH = 150;
export const CARD_HEIGHT = 80;
const COLUMN_GAP = 10;
const CARD_GAP = 10;
const CARDS_TOP = 100;

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  };
}

function columnLeft(stage: StageKey) {
  return STAGE_KEYS.indexOf(stage) * (COLUMN_WIDTH + COLUMN_GAP);
}

function fixedAncestor(element: Element): HTMLElement | null {
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (node instanceof HTMLElement && node.style.position === 'fixed') return node;
  }
  return null;
}

function measure(element: Element): DOMRect {
  // The drag overlay sits in a fixed wrapper that dnd-kit places over the picked-up card.
  const overlay = fixedAncestor(element);
  if (overlay) {
    const { top, left, width, height } = overlay.style;
    return rect(parseFloat(left), parseFloat(top), parseFloat(width), parseFloat(height));
  }
  const column = element.closest<HTMLElement>('section[data-stage]');
  if (!column) return rect(0, 0, 0, 0);
  const left = columnLeft(column.dataset.stage as StageKey);
  if (element.matches('[data-deal-id]')) {
    const index = Array.from(column.querySelectorAll('[data-deal-id]')).indexOf(element);
    return rect(left, CARDS_TOP + index * (CARD_HEIGHT + CARD_GAP), COLUMN_WIDTH, CARD_HEIGHT);
  }
  // The list of cards grows with its cards; an empty one is about one card tall.
  const cards = column.querySelectorAll('[data-deal-id]').length;
  return rect(left, CARDS_TOP, COLUMN_WIDTH, Math.max(1, cards) * (CARD_HEIGHT + CARD_GAP) - CARD_GAP);
}

/** Gives the board's columns and cards fixed positions until the test's mocks are restored. */
export function mockBoardLayout() {
  return vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return measure(this);
  });
}
