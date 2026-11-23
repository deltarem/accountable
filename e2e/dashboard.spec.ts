import { expect, test } from './fixtures';

// SC-06, UI-DASH-01 to UI-DASH-07: the seeded figures, tooltips and links.

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('open-pipeline')).toBeVisible();
});

test('the headline figures', async ({ page }) => {
  await expect(page.getByTestId('today')).toHaveText('Monday, 23 Nov 2026');
  await expect(page.getByTestId('open-pipeline')).toHaveText('$1.130.000');
  await expect(page.getByText('14 open deals')).toBeVisible();
  await expect(page.getByTestId('expected-revenue')).toHaveText('$529.500');
  await expect(page.getByTestId('won-this-month')).toHaveText('$86.000');
  await expect(page.getByRole('region', { name: 'Headline figures' })).toContainText('37%');
  await expect(page.getByRole('region', { name: 'Headline figures' })).toContainText('on October');
  await expect(page.getByTestId('follow-ups-due')).toHaveText('4 overdue');
  await expect(page.getByText('2 due today')).toBeVisible();
  await expect(page.getByText('Last 12 months · $668.000')).toBeVisible();
});

test('the revenue chart tooltip shows the full figures', async ({ page }) => {
  const chart = page.getByTestId('revenue-chart');
  await expect(chart).toContainText('$86k');
  const dots = chart.locator('svg circle');
  await dots.nth(4).hover();
  const tip = chart.locator('.recharts-tooltip-wrapper');
  await expect(tip).toContainText('Apr 2026');
  await expect(tip).toContainText('$71.000,00 · 2 deals won');
});

test('the funnel, the stage rows, and the won and lost bars', async ({ page }) => {
  const funnel = page.getByTestId('funnel');
  await expect(page.getByTestId('funnel-new')).toContainText('100%');
  await expect(page.getByTestId('funnel-new')).toContainText('$1.948.000');
  await expect(page.getByTestId('funnel-qualified')).toContainText('94%');
  await expect(page.getByTestId('funnel-proposal')).toContainText('$1.483.000');
  await expect(page.getByTestId('funnel-negotiation')).toContainText('56%');
  await expect(page.getByTestId('funnel-won')).toContainText('34%');
  await expect(funnel).toContainText('$668.000');

  await expect(page.getByTestId('stage-row-new')).toContainText('$120.000');
  await expect(page.getByTestId('stage-row-new')).toContainText('4 deals');
  await expect(page.getByTestId('stage-row-new')).toContainText('exp $12.000');
  await expect(page.getByTestId('stage-row-negotiation')).toContainText('exp $270.000');

  const wonLost = page.getByTestId('won-lost-chart');
  await expect(wonLost).toContainText('13 won');
  await expect(wonLost).toContainText('3 lost');
  await wonLost.locator('.recharts-bar-rectangle').first().hover();
  await expect(wonLost.locator('.recharts-tooltip-wrapper')).toContainText('won');

  await page.getByTestId('stage-row-proposal').click();
  await expect(page).toHaveURL('/pipeline');
});

test('follow-ups are grouped, and their links open the record', async ({ page }) => {
  await expect(page.getByRole('region', { name: 'Overdue' }).getByTestId('follow-up')).toHaveCount(4);
  await expect(page.getByRole('region', { name: 'Today' }).getByTestId('follow-up')).toHaveCount(2);
  await expect(page.getByRole('region', { name: 'Next 7 days' }).getByTestId('follow-up')).toHaveCount(4);
  const first = page.getByRole('region', { name: 'Overdue' }).getByTestId('follow-up').first();
  await expect(first).toContainText('Call back about contract terms');
  await expect(first).toContainText('5 days overdue');
  await first.getByRole('link', { name: 'Pinecrest Hotels · Booking engine' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Booking engine' })).toBeVisible();
});

test('recent activity links open the record', async ({ page }) => {
  const items = page.getByTestId('activity-item');
  await expect(items).toHaveCount(10);
  await expect(items.first()).toContainText('Moved from Proposal to Negotiation');
  await items.first().getByRole('link', { name: 'Brightline Health · Telehealth add-on' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Telehealth add-on' })).toBeVisible();
  await page.goBack();
  const status = page.getByTestId('activity-item').filter({ hasText: 'Status changed from Qualified to Customer' });
  await status.getByRole('link', { name: 'Elena Fischer' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Elena Fischer' })).toBeVisible();
});
