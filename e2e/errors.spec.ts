import { expect, test } from './fixtures';
import { choose } from './tables';

// UI-ERR-01: a failed save says what failed and keeps the form open with what was typed.
// The browser logs the failed requests themselves, which is expected here.
test.use({ allowConsole: [/Failed to load resource/] });

test('a failed save shows a message and keeps the form open', async ({ page }) => {
  await page.route('**/api/deals', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"Something went wrong"}' });
    } else {
      await route.fallback();
    }
  });
  await page.goto('/deals');
  await expect(page.getByText('30 of 30 deals')).toBeVisible();
  await page.getByRole('button', { name: 'New deal' }).click();
  const form = page.getByRole('dialog', { name: 'New deal' });
  await form.getByLabel(/^Name/).fill('Unsaved deal');
  await choose(page, 'Organization', 'Larch Software');
  await form.getByLabel('Value (USD)').fill('5.000');
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText("Couldn't save the deal. Try again.").first()).toBeVisible();
  await expect(form).toBeVisible();
  await expect(form.getByLabel(/^Name/)).toHaveValue('Unsaved deal');
  await expect(form.getByRole('combobox', { name: 'Organization' })).toHaveText('Larch Software');

  // Once the server is back, the same form saves.
  await page.unroute('**/api/deals');
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(form).toBeHidden();
  await expect(page.getByRole('row', { name: 'Open Unsaved deal' })).toBeVisible();
});

test('a list that fails to load shows a message instead of a blank page', async ({ page }) => {
  await page.route('**/api/contacts', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"Something went wrong"}' }),
  );
  await page.goto('/contacts');
  await expect(page.getByRole('alert')).toContainText("Couldn't load the contacts");
  await page.unroute('**/api/contacts');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('25 of 25 contacts')).toBeVisible();
});
