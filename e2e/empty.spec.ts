import { empty, expect, settled, test } from './fixtures';
import { expectToast } from './tables';

// SC-10, UI-EMPTY-01 to UI-EMPTY-04: everything still looks right with no data.

test.beforeEach(() => {
  empty();
});

test('every chart, list and the board show their empty state', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('open-pipeline')).toHaveText('$0');
  await expect(page.getByTestId('revenue-chart')).toContainText('No deals won in the last 12 months');
  await expect(page.getByText('No deals in the funnel yet')).toBeVisible();
  await expect(page.getByTestId('won-lost-chart')).toContainText('No deals won or lost in the last 12 months');
  await expect(page.getByText("No follow-ups due. You're up to date.")).toBeVisible();
  await expect(page.getByText('No activity yet')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Headline figures' })).toContainText('Nothing won in October');

  await page.goto('/pipeline');
  await expect(page.getByText('No deals', { exact: true })).toHaveCount(6);
  await expect(page.getByText('No open deals')).toBeVisible();
  await expect(page.getByTestId('total-open')).toHaveText('$0,00');

  for (const [path, noun, button] of [
    ['/deals', 'deals', 'New deal'],
    ['/contacts', 'contacts', 'New contact'],
    ['/organizations', 'organizations', 'New organization'],
  ]) {
    await page.goto(path);
    await expect(page.getByText(`No ${noun} yet`)).toBeVisible();
    await expect(page.getByRole('button', { name: button })).toHaveCount(2);
    await expect(page.getByText(`0 of 0 ${noun}`)).toBeVisible();
  }
  await settled(page);
});

test('adding the first records works', async ({ page }) => {
  await page.goto('/organizations');
  await page.getByRole('region', { name: 'Organizations' }).getByRole('button', { name: 'New organization' }).click();
  await page.getByRole('dialog').getByLabel(/^Name/).fill('First Customer Ltd');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expectToast(page, 'Organization saved');
  await expect(page.getByText('1 of 1 organization')).toBeVisible();

  await page.getByRole('row', { name: 'Open First Customer Ltd' }).click();
  await expect(page.getByText('Nothing here yet. Log a call, email or note to start the history.')).toBeVisible();
  await expect(page.getByText('No contacts yet')).toBeVisible();
  await expect(page.getByText('No deals yet')).toBeVisible();

  await page.getByRole('button', { name: 'New contact at this organization' }).click();
  await page.getByRole('dialog').getByLabel(/^Name/).fill('First Contact');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('region', { name: 'Contacts' }).getByRole('link', { name: 'First Contact' })).toBeVisible();

  await page.getByRole('button', { name: 'New deal with this organization' }).click();
  await page.getByRole('dialog').getByLabel(/^Name/).fill('First deal');
  await page.getByRole('dialog').getByLabel('Value (USD)').fill('1.000');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('region', { name: 'Deals' }).getByRole('link', { name: 'First deal' })).toBeVisible();

  await page.goto('/');
  await expect(page.getByTestId('open-pipeline')).toHaveText('$1.000');
});
