// Dragging on the board. dnd-kit listens to pointer events, so drag with
// mouse down, several moves and mouse up, then wait for the move request.

import type { Locator, Page } from '@playwright/test';

export function card(page: Page, name: string) {
  return page.getByTestId('deal-card').filter({ hasText: name });
}

export function column(page: Page, stage: string) {
  return page.getByRole('region', { name: `${stage} column` });
}

export async function cardNames(page: Page, stage: string) {
  return column(page, stage).getByTestId('deal-card').locator('div:nth-child(2)').allInnerTexts();
}

/**
 * Drag a card onto a target. `where` picks the spot on the target: its top
 * edge (drop above), its bottom edge (drop below), or its middle.
 */
export async function drag(page: Page, source: Locator, target: Locator, where: 'top' | 'middle' | 'bottom' = 'middle', waitForMove = true) {
  await source.scrollIntoViewIfNeeded();
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error('nothing to drag');
  const startX = from.x + from.width / 2;
  const startY = from.y + from.height / 2;
  const endX = to.x + to.width / 2;
  const endY = where === 'top' ? to.y + 6 : where === 'bottom' ? to.y + to.height - 6 : to.y + to.height / 2;
  const moved = waitForMove ? page.waitForResponse((r) => r.url().includes('/move') && r.request().method() === 'POST') : null;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 4, startY + 4, { steps: 2 });
  await page.mouse.move(startX + 12, startY + 12, { steps: 3 });
  await page.mouse.move(endX, endY, { steps: 15 });
  await page.mouse.move(endX, endY + 1, { steps: 2 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  return moved;
}
