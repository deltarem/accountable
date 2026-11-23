import { card, column, drag } from './board';
import { expect, test } from './fixtures';

// SC-06, RULE-05: winning a deal makes its main contact a customer, and the
// dashboard reflects it.

test('drag a deal to Won', async ({ page, api }) => {
  await page.goto('/');
  await expect(page.getByTestId('won-this-month')).toHaveText('$86.000');

  await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Pipeline', exact: true }).click();
  await expect(page.getByTestId('deal-card')).toHaveCount(30);
  const moved = await drag(page, card(page, 'Data audit'), card(page, 'Store analytics'), 'top');
  expect((await moved)!.ok()).toBe(true);
  await expect(column(page, 'Won').getByTestId('deal-card').filter({ hasText: 'Data audit' })).toBeVisible();

  // The main contact is now a customer, with an entry in their timeline.
  const ben = await api.find('contacts', 'Ben Hartley');
  expect(ben.status).toBe('customer');
  await page.goto(`/contacts/${ben.id}`);
  await expect(page.getByRole('region', { name: 'Summary' })).toContainText('Customer');
  await expect(page.getByTestId('timeline-entry').filter({ hasText: 'Status changed from Qualified to Customer' })).toBeVisible();

  // The dashboard: won this month, the revenue chart and the funnel.
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expect(page.getByTestId('won-this-month')).toHaveText('$108.000');
  await expect(page.getByTestId('revenue-chart')).toContainText('$108k');
  await expect(page.getByTestId('funnel-won')).toContainText('$690.000');
  await expect(page.getByTestId('open-pipeline')).toHaveText('$1.108.000');
  await expect(page.getByTestId('activity-item').first()).toContainText(/Moved from New to Won|Status changed from Qualified to Customer/);
});
