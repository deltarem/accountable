import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { choose } from './tables';

// SC-09: with the sample data, every screen shows its data, and every save
// its result, within a second.

const LIMIT = 1_000;

async function timed(action: () => Promise<unknown>, done: Locator) {
  const started = Date.now();
  await action();
  await expect(done).toBeVisible({ timeout: 5_000 });
  return Date.now() - started;
}

function rail(page: Page, name: string) {
  return page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name, exact: true });
}

// Navigation is timed the way a person moves around: by clicking in the app.
// A full page reload on the development server also loads every source
// module one by one, which says nothing about the app's own speed.
test('each screen shows its data within a second of navigating', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('open-pipeline')).toBeVisible();
  const checks: [string, () => Promise<unknown>, Locator][] = [
    ['pipeline', () => rail(page, 'Pipeline').click(), page.getByTestId('deal-card').nth(29)],
    ['deals', () => rail(page, 'Deals').click(), page.getByText('30 of 30 deals')],
    ['contacts', () => rail(page, 'Contacts').click(), page.getByText('25 of 25 contacts')],
    ['organizations', () => rail(page, 'Organizations').click(), page.getByText('10 of 10 organizations')],
    ['dashboard', () => rail(page, 'Dashboard').click(), page.getByTestId('activity-item').nth(9)],
    ['deals again', () => rail(page, 'Deals').click(), page.getByText('30 of 30 deals')],
    [
      'deal page',
      () => page.getByRole('row', { name: 'Open Compliance suite' }).click(),
      page.getByTestId('timeline-entry').filter({ hasText: 'Agreed a two-year term' }),
    ],
    [
      'contact page',
      () => page.getByRole('link', { name: 'Priya Raman' }).first().click(),
      page.getByTestId('timeline-entry').filter({ hasText: 'Email the case study' }),
    ],
    [
      'organization page',
      () => page.getByRole('link', { name: 'Northgate Finance' }).first().click(),
      page.getByRole('region', { name: 'Contacts' }).getByRole('link', { name: 'James Whitaker' }),
    ],
  ];
  for (const [name, go, done] of checks) {
    const ms = await timed(go, done);
    expect(ms, `${name} took ${ms} ms`).toBeLessThan(LIMIT);
  }
});

test('a save shows its result within a second', async ({ page }) => {
  await page.goto('/deals');
  await expect(page.getByText('30 of 30 deals')).toBeVisible();
  await page.getByRole('button', { name: 'New deal' }).click();
  const form = page.getByRole('dialog', { name: 'New deal' });
  await form.getByLabel(/^Name/).fill('Quick deal');
  await choose(page, 'Organization', 'Larch Software');
  const ms = await timed(() => form.getByRole('button', { name: 'Save' }).click(), page.getByRole('row', { name: 'Open Quick deal' }));
  expect(ms, `saving took ${ms} ms`).toBeLessThan(LIMIT);
});
