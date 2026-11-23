import { expect, settled, test } from './fixtures';
import { checkSorting, expectToast } from './tables';

test.beforeEach(async ({ page }) => {
  await page.goto('/organizations');
  await expect(page.getByText('10 of 10 organizations')).toBeVisible();
});

test('add an organization, with industry suggestions and https:// added', async ({ page }) => {
  await page.getByRole('button', { name: 'New organization' }).click();
  const form = page.getByRole('dialog', { name: 'New organization' });
  await form.getByLabel(/^Name/).fill('Northwind Traders');
  await form.getByLabel('Website').fill('acme.example');
  await form.getByLabel('Industry').fill('Fin');
  await expect(form.getByRole('option', { name: 'Finance' })).toBeVisible();
  await form.getByRole('option', { name: 'Finance' }).click();
  await expect(form.getByLabel('Industry')).toHaveValue('Finance');
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(form).toBeHidden();
  await expectToast(page, 'Organization saved');
  const row = page.getByRole('row', { name: 'Open Northwind Traders' });
  await expect(row).toContainText('Finance');
  await expect(row.getByRole('link', { name: 'acme.example' })).toHaveAttribute('href', 'https://acme.example');
  await page.reload();
  await expect(page.getByText('11 of 11 organizations')).toBeVisible();
  await expect(page.getByRole('row', { name: 'Open Northwind Traders' })).toBeVisible();
});

test('the website link opens in a new tab', async ({ page }) => {
  const link = page.getByRole('row', { name: 'Open Harbor Logistics' }).getByRole('link', { name: 'harbor.example' });
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('href', 'https://harbor.example');
});

test('search', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search organizations' }).fill('PINE');
  await expect(page.getByText('1 of 10 organizations')).toBeVisible();
  await expect(page.getByRole('row', { name: 'Open Pinecrest Hotels' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search organizations' }).fill('health');
  await expect(page.getByText('2 of 10 organizations')).toBeVisible();
});

test('sort by each column', async ({ page }) => {
  for (const heading of ['Name', 'Industry', 'Website', 'Contacts', 'Open deals', 'Open value']) {
    await checkSorting(page, heading);
  }
});

test('edit', async ({ page }) => {
  await page.getByRole('button', { name: 'Edit Larch Software' }).click();
  const form = page.getByRole('dialog', { name: 'Edit organization' });
  await expect(form.getByLabel(/^Name/)).toHaveValue('Larch Software');
  await form.getByLabel(/^Name/).fill('Larch Software Group');
  await form.getByLabel('Notes').fill('Renews every spring.\nTwo offices.');
  await form.getByRole('button', { name: 'Save' }).click();
  await expectToast(page, 'Organization saved');
  await page.reload();
  await expect(page.getByRole('row', { name: 'Open Larch Software Group' })).toBeVisible();
});

test('delete says what happens to linked records, and does it', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete Harbor Logistics' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Delete Harbor Logistics?' });
  await expect(confirm).toContainText(
    "Its 2 contacts and 4 deals will be kept, with no organization. This can't be undone.",
  );
  await expect(confirm.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await confirm.getByRole('button', { name: 'Delete' }).click();
  await expectToast(page, 'Organization deleted');
  await page.reload();
  await expect(page.getByText('9 of 9 organizations')).toBeVisible();
  await expect(page.getByRole('row', { name: 'Open Harbor Logistics' })).toHaveCount(0);

  await page.goto('/contacts');
  await expect(page.getByRole('row', { name: 'Open Sam Whitfield' })).toContainText('No organization');
  await page.goto('/deals');
  await expect(page.getByRole('row', { name: 'Open Fleet tracking' })).toContainText('No organization');
  await settled(page);
});
