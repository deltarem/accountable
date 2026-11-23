import { expect, test } from './fixtures';
import { checkSorting, choose, expectToast } from './tables';

const STAGE_ORDER = ['New', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dateKey(text: string) {
  const m = /(\d+) (\w{3}) (\d{4})/.exec(text);
  if (!m) return '';
  return `${m[3]}-${String(MONTHS.indexOf(m[2]) + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/deals');
  await expect(page.getByText('30 of 30 deals')).toBeVisible();
});

test('add a deal', async ({ page }) => {
  await page.getByRole('button', { name: 'New deal' }).click();
  const form = page.getByRole('dialog', { name: 'New deal' });
  await form.getByLabel(/^Name/).fill('Acme renewal');
  await choose(page, 'Organization', 'Solano Foods');
  await choose(page, 'Main contact', 'Rosa Delgado');
  await form.getByLabel('Value (USD)').fill('24.000');
  await form.getByLabel('Close date').fill('2026-12-12');
  await form.getByRole('button', { name: 'Save' }).click();
  await expectToast(page, 'Deal saved');
  await page.reload();
  const row = page.getByRole('row', { name: 'Open Acme renewal' });
  await expect(row).toContainText('Solano Foods');
  await expect(row).toContainText('Rosa Delgado');
  await expect(row).toContainText('$24.000,00');
  await expect(row).toContainText('10%');
  await expect(row).toContainText('12 Dec 2026');
});

test('search and sort', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search deals' }).fill('brightline');
  await expect(page.getByText('3 of 30 deals')).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search deals' }).fill('');
  for (const heading of ['Name', 'Organization', 'Main contact', 'Value', 'Probability']) {
    await checkSorting(page, heading);
  }
  await checkSorting(page, 'Stage', (a, b) => STAGE_ORDER.indexOf(a.trim()) - STAGE_ORDER.indexOf(b.trim()));
  await checkSorting(page, 'Close date', (a, b) => dateKey(a).localeCompare(dateKey(b)));
});

test('a late deal is marked', async ({ page }) => {
  const late = page.getByRole('row', { name: 'Open Booking engine' });
  await expect(late).toContainText('Late');
  await expect(late).toContainText('10 Nov 2026');
  await expect(page.getByRole('row', { name: 'Open Compliance suite' })).not.toContainText('Late');
  await expect(page.locator('tbody tr', { hasText: 'Late' })).toHaveCount(3);
});

test('changing the stage in the form changes the probability and adds a timeline entry', async ({ page }) => {
  await page.getByRole('button', { name: 'Edit Shop-floor tablets' }).click();
  const form = page.getByRole('dialog', { name: 'Edit deal' });
  await expect(form.getByLabel('Probability')).toHaveValue('50');
  await form.getByLabel('Stage').selectOption('negotiation');
  await expect(form.getByLabel('Probability')).toHaveValue('75');
  await form.getByRole('button', { name: 'Save' }).click();
  await expectToast(page, 'Deal saved');
  const row = page.getByRole('row', { name: 'Open Shop-floor tablets' });
  await expect(row).toContainText('Negotiation');
  await expect(row).toContainText('75%');
  await row.click();
  await expect(page.getByTestId('timeline-entry').first()).toContainText('Moved from Proposal to Negotiation');
});

test('edit and delete', async ({ page }) => {
  await page.getByRole('button', { name: 'Edit Data audit' }).click();
  const form = page.getByRole('dialog', { name: 'Edit deal' });
  await form.getByLabel('Value (USD)').fill('$30.000,50');
  await form.getByRole('button', { name: 'Save' }).click();
  await expectToast(page, 'Deal saved');
  await expect(page.getByRole('row', { name: 'Open Data audit' })).toContainText('$30.000,50');

  await page.getByRole('button', { name: 'Delete Telehealth add-on' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Delete Telehealth add-on?' });
  await expect(confirm).toContainText("Its 1 activity and its stage history will be deleted. This can't be undone.");
  await confirm.getByRole('button', { name: 'Delete' }).click();
  await expectToast(page, 'Deal deleted');
  await page.reload();
  await expect(page.getByText('29 of 29 deals')).toBeVisible();
  await expect(page.getByRole('row', { name: 'Open Telehealth add-on' })).toHaveCount(0);
});
