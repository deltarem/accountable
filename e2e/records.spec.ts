import { expect, test } from './fixtures';
import { expectToast } from './tables';

// UI-REC-01 to UI-REC-07, UI-DEL-03, UI-LAY-04.

test('the organization page lists its contacts and deals, with no Log activity', async ({ page, api }) => {
  const org = await api.find('organizations', 'Northgate Finance');
  await page.goto(`/organizations/${org.id}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Northgate Finance' })).toBeVisible();
  const contacts = page.getByRole('region', { name: 'Contacts' });
  await expect(contacts.getByRole('link')).toHaveText(['James Whitaker', 'Laura Chen', 'Priya Raman']);
  const deals = page.getByRole('region', { name: 'Deals' });
  await expect(deals.getByRole('link')).toHaveText(['Group reporting', 'Compliance suite', 'Audit reporting', 'Risk dashboard']);
  await expect(page.getByRole('form', { name: 'Log activity' })).toHaveCount(0);
  await expect(page.getByTestId('timeline-entry').first()).toBeVisible();

  await deals.getByRole('link', { name: 'Compliance suite' }).click();
  await expect(page).toHaveURL(/\/deals\/\d+$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Compliance suite' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: 'Northgate Finance' })).toBeVisible();
});

test('New contact and New deal start with the organization filled in', async ({ page, api }) => {
  const org = await api.find('organizations', 'Corvus Analytics');
  await page.goto(`/organizations/${org.id}`);
  await page.getByRole('button', { name: 'New contact at this organization' }).click();
  let form = page.getByRole('dialog', { name: 'New contact' });
  await expect(form.getByRole('combobox', { name: 'Organization' })).toHaveText('Corvus Analytics');
  await form.getByLabel(/^Name/).fill('Lena Moss');
  await form.getByRole('button', { name: 'Save' }).click();
  await expectToast(page, 'Contact saved');
  await expect(page.getByRole('region', { name: 'Contacts' }).getByRole('link', { name: 'Lena Moss' })).toBeVisible();

  await page.getByRole('button', { name: 'New deal with this organization' }).click();
  form = page.getByRole('dialog', { name: 'New deal' });
  await expect(form.getByRole('combobox', { name: 'Organization' })).toHaveText('Corvus Analytics');
  await form.getByLabel(/^Name/).fill('Data platform');
  await form.getByRole('button', { name: 'Save' }).click();
  await expectToast(page, 'Deal saved');
  await expect(page.getByRole('region', { name: 'Deals' }).getByRole('link', { name: 'Data platform' })).toBeVisible();
});

test('the contact page shows the organization and the deals as main contact', async ({ page, api }) => {
  const contact = await api.find('contacts', 'Sam Whitfield');
  await page.goto(`/contacts/${contact.id}`);
  await expect(page.getByRole('link', { name: 'Harbor Logistics' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'sam.whitfield@harbor.example' })).toHaveAttribute(
    'href',
    'mailto:sam.whitfield@harbor.example',
  );
  const deals = page.getByRole('region', { name: 'Deals as main contact' });
  await expect(deals.getByRole('link')).toHaveText(['Fleet tracking', 'Warehouse sensors', 'Depot scanners', 'Route planning']);
  await expect(page.getByRole('form', { name: 'Log activity' })).toBeVisible();
});

test('the deal page shows its facts', async ({ page, api }) => {
  const deal = await api.find('deals', 'Booking engine');
  await page.goto(`/deals/${deal.id}`);
  const summary = page.getByRole('region', { name: 'Summary' });
  await expect(summary).toContainText('Negotiation');
  await expect(summary).toContainText('$95.000,00');
  await expect(summary).toContainText('75%');
  await expect(summary).toContainText('$71.250,00');
  await expect(summary).toContainText('10 Nov 2026');
  await expect(summary).toContainText('Late');
  await expect(page.getByRole('link', { name: 'Pinecrest Hotels' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Lucia Moreno' })).toBeVisible();
});

test('deleting from a record page goes back to its list', async ({ page, api }) => {
  const deal = await api.find('deals', 'Guest portal');
  await page.goto('/deals');
  await page.goto(`/deals/${deal.id}`);
  await page.getByRole('region', { name: 'Summary' }).getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('alertdialog', { name: 'Delete Guest portal?' }).getByRole('button', { name: 'Delete' }).click();
  await expect(page).toHaveURL('/deals');
  await expect(page.getByText('29 of 29 deals')).toBeVisible();

  const org = await api.find('organizations', 'Meridian Clinics');
  await page.goto(`/organizations/${org.id}`);
  await page.getByRole('region', { name: 'Summary' }).getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page).toHaveURL('/organizations');
  await expect(page.getByText('9 of 9 organizations')).toBeVisible();
});

test('the browser back button returns to the previous page', async ({ page }) => {
  await page.goto('/contacts');
  // The middle of the row is the email link, so click the name.
  await page.getByRole('row', { name: 'Open Grace Liu' }).getByRole('cell').first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Grace Liu' })).toBeVisible();
  await page.getByRole('link', { name: 'Meridian Clinics' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Meridian Clinics' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: 'Grace Liu' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL('/contacts');
  await page.goForward();
  await expect(page.getByRole('heading', { level: 1, name: 'Grace Liu' })).toBeVisible();
});
