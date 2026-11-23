import { card, cardNames, column, drag } from './board';
import { empty, expect, test } from './fixtures';
import { choose, expectToast } from './tables';

// SC-04, UI-PIPE-01 to UI-PIPE-08.

test.beforeEach(async ({ page }) => {
  await page.goto('/pipeline');
  await expect(page.getByTestId('deal-card')).toHaveCount(30);
});

test('drag a card to another column; totals change at once and it all survives a reload', async ({ page }) => {
  await expect(page.getByTestId('total-open')).toHaveText('$1.130.000,00');
  await expect(page.getByTestId('total-expected')).toHaveText('$529.500,00');
  const moved = await drag(page, card(page, 'Intake forms'), card(page, 'Warehouse sensors'));
  // Before the server answers or the page reloads: 45.000 at 25% becomes 50%.
  await expect(page.getByTestId('total-expected')).toHaveText('$540.750,00');
  await expect(page.getByTestId('value-proposal')).toHaveText('$385.000,00');
  await expect(page.getByTestId('value-qualified')).toHaveText('$265.000,00');
  expect((await moved)!.ok()).toBe(true);

  await page.reload();
  await expect(column(page, 'Proposal').getByTestId('deal-card')).toHaveCount(4);
  const names = await cardNames(page, 'Proposal');
  expect(names).toContain('Intake forms');
  const position = names.indexOf('Intake forms');
  expect(position).toBeGreaterThanOrEqual(1);
  expect(position).toBeLessThanOrEqual(2);

  await page.goto('/deals');
  const row = page.getByRole('row', { name: 'Open Intake forms' });
  await expect(row).toContainText('Proposal');
  await expect(row).toContainText('50%');
});

test('drag within a column, higher and lower, and reload', async ({ page }) => {
  expect(await cardNames(page, 'Proposal')).toEqual(['Shop-floor tablets', 'Warehouse sensors', 'Support renewal']);
  let moved = await drag(page, card(page, 'Support renewal'), card(page, 'Shop-floor tablets'), 'top');
  expect((await moved)!.ok()).toBe(true);
  await page.reload();
  await expect(column(page, 'Proposal').getByTestId('deal-card')).toHaveCount(3);
  expect(await cardNames(page, 'Proposal')).toEqual(['Support renewal', 'Shop-floor tablets', 'Warehouse sensors']);

  moved = await drag(page, card(page, 'Support renewal'), card(page, 'Warehouse sensors'), 'bottom');
  expect((await moved)!.ok()).toBe(true);
  await page.reload();
  await expect(column(page, 'Proposal').getByTestId('deal-card')).toHaveCount(3);
  expect(await cardNames(page, 'Proposal')).toEqual(['Shop-floor tablets', 'Warehouse sensors', 'Support renewal']);
});

test('add a deal in a column and it starts at that stage', async ({ page }) => {
  await page.getByRole('button', { name: 'Add deal in Negotiation' }).click();
  const form = page.getByRole('dialog', { name: 'New deal' });
  await expect(form.getByLabel('Stage')).toHaveValue('negotiation');
  await expect(form.getByLabel('Probability')).toHaveValue('75');
  await form.getByLabel(/^Name/).fill('Board deal');
  await choose(page, 'Organization', 'Fernwood Retail');
  await form.getByLabel('Value (USD)').fill('10.000');
  await form.getByRole('button', { name: 'Save' }).click();
  await expectToast(page, 'Deal saved');
  await expect(column(page, 'Negotiation').getByTestId('deal-card').filter({ hasText: 'Board deal' })).toBeVisible();
  await expect(page.getByTestId('total-count')).toHaveText('15');
});

test('late cards are marked, and clicking a card opens the deal', async ({ page }) => {
  await expect(card(page, 'Booking engine')).toContainText('Late · 10 Nov 2026');
  await expect(card(page, 'Intake forms')).toContainText('Late · 20 Nov 2026');
  await expect(card(page, 'Compliance suite')).not.toContainText('Late');
  await expect(card(page, 'Fleet tracking').getByRole('img', { name: 'Sam Whitfield' })).toBeVisible();
  await expect(card(page, 'POS rollout').getByRole('img', { name: 'No main contact' })).toBeVisible();
  await card(page, 'Compliance suite').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Compliance suite' })).toBeVisible();
});

test.describe('when the server refuses', () => {
  // The browser logs the failed request itself, which is expected here.
  test.use({ allowConsole: [/Failed to load resource/] });

  test('a failed move puts the card back and says why', async ({ page }) => {
  await page.route('**/api/deals/*/move', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"Something went wrong"}' }),
  );
  const moved = await drag(page, card(page, 'Data audit'), card(page, 'Loyalty app'));
  expect((await moved)!.status()).toBe(500);
  await expect(page.getByText(/Couldn't move Data audit/).first()).toBeVisible();
  await expect(column(page, 'New').getByTestId('deal-card').filter({ hasText: 'Data audit' })).toBeVisible();
  await expect(page.getByTestId('total-expected')).toHaveText('$529.500,00');
  });
});

test('from an empty database, drag the only deal into an empty column', async ({ page, api }) => {
  empty();
  const org = await api.post('/organizations', { name: 'Solo Ltd' });
  await api.post('/deals', { name: 'Only deal', organization_id: org.id, value_cents: 100_000 });
  await page.reload();
  await expect(page.getByTestId('deal-card')).toHaveCount(1);
  await expect(column(page, 'Won')).toContainText('No deals');
  const moved = await drag(page, card(page, 'Only deal'), column(page, 'Won').getByText('No deals'));
  expect((await moved)!.ok()).toBe(true);
  await page.reload();
  await expect(column(page, 'Won').getByTestId('deal-card')).toHaveCount(1);
  await expect(column(page, 'New')).toContainText('No deals');
  await expect(page.getByTestId('expected-won')).toHaveText('Closed, won');
});
