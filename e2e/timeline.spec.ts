import { expect, settled, test } from './fixtures';
import { expectToast } from './tables';

// SC-05, TL-01 to TL-04, UI-REC-05, UI-REC-06, UI-DEL-04.

test('a call logged on a deal shows first on the deal, its main contact and its organization', async ({ page, api }) => {
  const deal = await api.find('deals', 'Compliance suite');
  await page.goto(`/deals/${deal.id}`);
  const log = page.getByRole('form', { name: 'Log activity' });
  await log.getByText('Call', { exact: true }).click();
  await log.getByLabel('What happened').fill('Agreed the final price');
  await log.getByLabel('Follow-up date').fill('2026-11-30');
  await log.getByRole('button', { name: 'Log it' }).click();
  await expectToast(page, 'Activity saved');

  const first = page.getByTestId('timeline-entry').first();
  await expect(first).toContainText('Call: Agreed the final price');
  await expect(first).toContainText('Follow-up 30 Nov 2026');
  await expect(log.getByLabel('What happened')).toHaveValue('');

  // On the main contact, labelled with the deal.
  await page.getByRole('link', { name: 'Priya Raman' }).first().click();
  const onContact = page.getByTestId('timeline-entry').first();
  await expect(onContact).toContainText('Call: Agreed the final price');
  await expect(onContact).toContainText('on deal Compliance suite');

  // On the organization.
  await page.getByRole('link', { name: 'Northgate Finance' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Northgate Finance' })).toBeVisible();
  const onOrg = page.getByTestId('timeline-entry').first();
  await expect(onOrg).toContainText('Call: Agreed the final price');
  await expect(onOrg).toContainText('on deal Compliance suite');
});

test('edit an activity, then delete it', async ({ page, api }) => {
  const contact = await api.find('contacts', 'Tom Becker');
  await page.goto(`/contacts/${contact.id}`);
  const entry = page.getByTestId('timeline-entry').filter({ hasText: 'Sent our price list' });
  await entry.getByRole('button', { name: /Actions for/ }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  const form = page.getByRole('dialog', { name: 'Edit activity' });
  await form.getByLabel('What happened').fill('Sent our new price list');
  await form.getByRole('button', { name: 'Save' }).click();
  await expectToast(page, 'Activity saved');
  await expect(page.getByTestId('timeline-entry').filter({ hasText: 'Email: Sent our new price list' })).toBeVisible();

  const edited = page.getByTestId('timeline-entry').filter({ hasText: 'Sent our new price list' });
  await edited.getByRole('button', { name: /Actions for/ }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Delete this email?' });
  await expect(confirm).toContainText("This can't be undone.");
  await confirm.getByRole('button', { name: 'Delete' }).click();
  await expectToast(page, 'Activity deleted');
  await expect(page.getByText('Nothing here yet. Log a call, email or note to start the history.')).toBeVisible();
});

test('stage changes show in the timeline, newest first', async ({ page, api }) => {
  const deal = await api.find('deals', 'Shop-floor tablets');
  await page.goto(`/deals/${deal.id}`);
  // Wait for the timeline to load before reading it.
  await settled(page);
  await expect(page.getByTestId('timeline-entry').first()).toBeVisible();
  const texts = await page.getByTestId('timeline-entry').allInnerTexts();
  const moves = texts.filter((t) => t.startsWith('Moved from'));
  expect(moves.map((t) => t.split('\n')[0])).toEqual(['Moved from Qualified to Proposal', 'Moved from New to Qualified']);
});
