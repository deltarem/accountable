import { expect, test } from './fixtures';
import { checkSorting, choose, expectToast } from './tables';

const STATUS_ORDER = ['Lead', 'Qualified', 'Customer'];

test.beforeEach(async ({ page }) => {
  await page.goto('/contacts');
  await expect(page.getByText('25 of 25 contacts')).toBeVisible();
});

test('add a contact', async ({ page }) => {
  await page.getByRole('button', { name: 'New contact' }).click();
  const form = page.getByRole('dialog', { name: 'New contact' });
  await form.getByLabel(/^Name/).fill('Maria Lopez');
  await form.getByLabel('Email').fill('maria@acme.example');
  await form.getByLabel('Job title').fill('Head of Ops');
  await form.getByLabel('Status').selectOption('qualified');
  await choose(page, 'Organization', 'Fernwood Retail');
  await form.getByRole('button', { name: 'Save' }).click();
  await expectToast(page, 'Contact saved');
  await page.reload();
  const row = page.getByRole('row', { name: 'Open Maria Lopez' });
  await expect(row).toContainText('Fernwood Retail');
  await expect(row).toContainText('Qualified');
  await expect(page.getByText('26 of 26 contacts')).toBeVisible();
});

test('search and sort', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('kestrel');
  await expect(page.getByText('3 of 25 contacts')).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('');
  for (const heading of ['Name', 'Organization', 'Job title', 'Email', 'Phone']) {
    await checkSorting(page, heading);
  }
  await checkSorting(page, 'Status', (a, b) => STATUS_ORDER.indexOf(a.trim()) - STATUS_ORDER.indexOf(b.trim()));
});

test('the status filter, combined with search', async ({ page }) => {
  await page.getByRole('button', { name: 'Customer 9' }).click();
  await expect(page.getByText('9 of 25 contacts')).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('northgate');
  await expect(page.getByText('2 of 25 contacts')).toBeVisible();
  await page.getByRole('button', { name: 'Lead 9' }).click();
  await expect(page.getByText('1 of 25 contacts')).toBeVisible();
  await expect(page.getByRole('row', { name: 'Open Laura Chen' })).toBeVisible();
  await page.getByRole('button', { name: 'All 25' }).click();
  await expect(page.getByText('3 of 25 contacts')).toBeVisible();
});

test('edit', async ({ page }) => {
  await page.getByRole('button', { name: 'Edit Tom Becker' }).click();
  const form = page.getByRole('dialog', { name: 'Edit contact' });
  await form.getByLabel('Phone').fill('+1 555 0199');
  await form.getByLabel('Status').selectOption('qualified');
  await form.getByRole('button', { name: 'Save' }).click();
  await expectToast(page, 'Contact saved');
  await page.reload();
  const row = page.getByRole('row', { name: 'Open Tom Becker' });
  await expect(row).toContainText('+1 555 0199');
  await expect(row).toContainText('Qualified');
});

test('deleting a contact removes their activities and leaves their deals with no main contact', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete Priya Raman' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Delete Priya Raman?' });
  await expect(confirm).toContainText(
    "1 activity logged with this contact will be deleted. 3 deals will be kept, with no main contact. This can't be undone.",
  );
  await confirm.getByRole('button', { name: 'Delete' }).click();
  await expectToast(page, 'Contact deleted');
  await page.reload();
  await expect(page.getByText('24 of 24 contacts')).toBeVisible();

  await page.goto('/deals');
  await page.getByRole('row', { name: 'Open Compliance suite' }).click();
  await expect(page.getByText('No main contact')).toBeVisible();

  await page.goto('/');
  await expect(page.getByTestId('follow-up').first()).toBeVisible();
  await expect(page.getByText('Email the case study')).toHaveCount(0);
});
