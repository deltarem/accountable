import { card, cardNames, column } from './board';
import { expect, test } from './fixtures';

// DEC-14: Space picks a card up, the arrow keys move it, Space drops it.

test('move a card to another column with the keyboard', async ({ page }) => {
  await page.goto('/pipeline');
  await expect(page.getByTestId('deal-card')).toHaveCount(30);
  const intake = card(page, 'Intake forms');
  await intake.focus();
  await expect(intake).toBeFocused();
  const moved = page.waitForResponse((r) => r.url().includes('/move') && r.request().method() === 'POST');
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(250);
  await page.keyboard.press('Space');
  expect((await moved).ok()).toBe(true);
  await expect(page.getByTestId('total-expected')).toHaveText('$540.750,00');

  await page.reload();
  await expect(column(page, 'Proposal').getByTestId('deal-card')).toHaveCount(4);
  expect(await cardNames(page, 'Proposal')).toContain('Intake forms');
  expect(await cardNames(page, 'Qualified')).not.toContain('Intake forms');
});

test('Escape cancels a keyboard move, and Enter opens the deal', async ({ page }) => {
  await page.goto('/pipeline');
  await expect(page.getByTestId('deal-card')).toHaveCount(30);
  let requests = 0;
  page.on('request', (r) => {
    if (r.url().includes('/move')) requests++;
  });
  const fleet = card(page, 'Fleet tracking');
  await fleet.focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(250);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  expect(requests).toBe(0);
  expect(await cardNames(page, 'New')).toContain('Fleet tracking');

  await fleet.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Fleet tracking' })).toBeVisible();
});
