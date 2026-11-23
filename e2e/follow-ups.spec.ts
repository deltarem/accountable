import { expect, test } from './fixtures';

// SC-05, SC-06, DEC-11, UI-DASH-06, UI-DASH-08.

test('a new follow-up due tomorrow appears on the dashboard; ticking it done removes it', async ({ page, api }) => {
  const contact = await api.find('contacts', 'Hannah Cole');
  await page.goto(`/contacts/${contact.id}`);
  const log = page.getByRole('form', { name: 'Log activity' });
  await log.getByLabel('What happened').fill('Send the fleet brochure');
  await log.getByLabel('Follow-up date').fill('2026-11-24');
  await log.getByRole('button', { name: 'Log it' }).click();
  // Wait for the saved entry itself; this test is about follow-ups, not the confirmation message.
  await expect(page.getByTestId('timeline-entry').filter({ hasText: 'Send the fleet brochure' })).toBeVisible();

  await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Dashboard', exact: true }).click();
  const week = page.getByRole('region', { name: 'Next 7 days' });
  const row = week.getByTestId('follow-up').filter({ hasText: 'Send the fleet brochure' });
  await expect(row).toBeVisible();
  await expect(row).toContainText('Tomorrow');
  await expect(row.getByRole('link', { name: 'Hannah Cole' })).toBeVisible();

  await row.getByRole('checkbox', { name: 'Mark done: Send the fleet brochure' }).check();
  await expect(page.getByTestId('follow-up').filter({ hasText: 'Send the fleet brochure' })).toHaveCount(0);
});

test('ticking an overdue follow-up drops the headline count', async ({ page }) => {
  await page.goto('/');
  const due = page.getByTestId('follow-ups-due');
  await expect(due).toContainText('4');
  const overdue = page.getByRole('region', { name: 'Overdue' });
  await expect(overdue.getByTestId('follow-up')).toHaveCount(4);
  await overdue.getByRole('checkbox', { name: 'Mark done: Send revised pricing' }).check();
  await expect(overdue.getByTestId('follow-up')).toHaveCount(3);
  await expect(due).toContainText('3');
  await page.reload();
  await expect(page.getByTestId('follow-ups-due')).toContainText('3');
});

test('a follow-up later than 7 days shows on its record page only', async ({ page, api }) => {
  await page.goto('/');
  await expect(page.getByTestId('follow-up').first()).toBeVisible();
  await expect(page.getByText('Renewal conversation')).toHaveCount(0);
  const contact = await api.find('contacts', 'Noah Stein');
  await page.goto(`/contacts/${contact.id}`);
  await expect(page.getByTestId('timeline-entry').filter({ hasText: 'Renewal conversation' })).toContainText('Follow-up');
});
