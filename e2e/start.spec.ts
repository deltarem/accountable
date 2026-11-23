import { expect, settled, test } from './fixtures';

// SC-01: open the app, land on the dashboard, sample data on every screen.

test('opens on the dashboard with the icon rail', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Sections' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
  await expect(page.getByTestId('open-pipeline')).toHaveText('$1.130.000');
});

test('each of the five sections shows sample data', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('follow-up').first()).toBeVisible();
  await expect(page.getByTestId('activity-item')).toHaveCount(10);

  await page.goto('/pipeline');
  await expect(page.getByTestId('deal-card')).toHaveCount(30);

  await page.goto('/deals');
  await expect(page.getByText('30 of 30 deals')).toBeVisible();

  await page.goto('/contacts');
  await expect(page.getByText('25 of 25 contacts')).toBeVisible();

  await page.goto('/organizations');
  await expect(page.getByText('10 of 10 organizations')).toBeVisible();
  await settled(page);
});
