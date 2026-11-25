import { TEST_USER, expect, test } from './fixtures';
import { expectToast } from './tables';

// UI-WHO-01, UI-WHO-02, SEED-07: who added each record and who made each change.

test('a deal added by the test user says so on its page and in its timeline', async ({ page, api }) => {
  const org = await api.find('organizations', 'Northgate Finance');
  const deal = await api.post('/deals', { name: 'Who test deal', organization_id: org.id });
  await page.goto(`/deals/${deal.id}`);
  await expect(page.getByTestId('who')).toHaveText(`Added by ${TEST_USER.name} on 23 Nov 2026`);

  // A stage change on the board names who made it.
  await api.post(`/deals/${deal.id}/move`, { stage: 'qualified', index: 0 });
  await page.reload();
  const first = page.getByTestId('timeline-entry').first();
  await expect(first).toContainText('Moved from New to Qualified');
  await expect(first).toContainText(`23 Nov 2026, 14:00 · ${TEST_USER.name}`);
});

test('an activity logged in the browser names the test user', async ({ page, api }) => {
  const contact = await api.find('contacts', 'Tom Becker');
  await page.goto(`/contacts/${contact.id}`);
  const log = page.getByRole('form', { name: 'Log activity' });
  await log.getByLabel('What happened').fill('Checked who logged this');
  await log.getByRole('button', { name: 'Log it' }).click();
  await expectToast(page, 'Activity saved');
  const entry = page.getByTestId('timeline-entry').filter({ hasText: 'Checked who logged this' });
  await expect(entry).toContainText(`· ${TEST_USER.name}`);
});

test('sample records and their history read "Sample data"', async ({ page, api }) => {
  const org = await api.find('organizations', 'Northgate Finance');
  await page.goto(`/organizations/${org.id}`);
  await expect(page.getByTestId('who')).toHaveText(/^Added by Sample data on \d{1,2} \w{3} \d{4}$/);
  await expect(page.getByTestId('timeline-entry').first()).toContainText('· Sample data');

  await page.goto('/');
  await expect(page.getByTestId('activity-item').first()).toContainText('· Sample data');
});

test('editing a sample record names who changed it', async ({ page, api }) => {
  const org = await api.find('organizations', 'Northgate Finance');
  await api.put(`/organizations/${org.id}`, { ...org, notes: 'Edited by the test user' });
  await page.goto(`/organizations/${org.id}`);
  await expect(page.getByTestId('who')).toHaveText(
    /^Added by Sample data on .+ · Last changed by Test User on 23 Nov 2026$/,
  );
});
