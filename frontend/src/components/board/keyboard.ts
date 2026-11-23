// Keyboard moves on the board (DEC-14). Left and right go to the next column,
// up and down move within the column. dnd-kit's default getter compares
// rectangles, and the tilted drag overlay makes cards in the same column look
// "to the right", so the board works the columns out itself.

import { type KeyboardCoordinateGetter, KeyboardCode } from '@dnd-kit/core';

import { STAGE_KEYS } from '../../lib/stages';

type Rect = { top: number; left: number; width: number; height: number };

const centre = (r: Rect) => r.top + r.height / 2;

export const boardKeyboardCoordinates: KeyboardCoordinateGetter = (event, { context, currentCoordinates }) => {
  const { active, collisionRect, droppableRects, droppableContainers } = context;
  const keys: string[] = [KeyboardCode.Left, KeyboardCode.Right, KeyboardCode.Up, KeyboardCode.Down];
  if (!keys.includes(event.code) || !active || !collisionRect) return undefined;
  event.preventDefault();

  const containerOf = (id: string | number) =>
    (droppableContainers.get(id)?.data.current?.sortable?.containerId as string | undefined) ?? undefined;
  const current = containerOf(active.id);
  if (!current) return currentCoordinates;

  const cardsIn = (containerId: string) =>
    droppableContainers
      .getEnabled()
      .filter((c) => c.id !== active.id && containerOf(c.id) === containerId)
      .map((c) => ({ id: c.id, rect: droppableRects.get(c.id) }))
      .filter((c): c is { id: string | number; rect: NonNullable<typeof c.rect> } => !!c.rect);

  const y = centre(collisionRect);

  if (event.code === KeyboardCode.Left || event.code === KeyboardCode.Right) {
    const index = STAGE_KEYS.indexOf(current.replace('column:', '') as (typeof STAGE_KEYS)[number]);
    const next = STAGE_KEYS[index + (event.code === KeyboardCode.Right ? 1 : -1)];
    if (!next) return currentCoordinates;
    const target = `column:${next}`;
    const cards = cardsIn(target);
    if (cards.length === 0) {
      const rect = droppableRects.get(target);
      return rect ? { x: rect.left, y: rect.top } : currentCoordinates;
    }
    const nearest = cards.reduce((a, b) => (Math.abs(centre(a.rect) - y) <= Math.abs(centre(b.rect) - y) ? a : b));
    return { x: nearest.rect.left, y: nearest.rect.top };
  }

  const cards = cardsIn(current).sort((a, b) => a.rect.top - b.rect.top);
  const down = event.code === KeyboardCode.Down;
  const candidates = cards.filter((c) => (down ? centre(c.rect) > y + 4 : centre(c.rect) < y - 4));
  if (candidates.length === 0) return currentCoordinates;
  const nearest = down ? candidates[0] : candidates[candidates.length - 1];
  return { x: nearest.rect.left, y: nearest.rect.top };
};
