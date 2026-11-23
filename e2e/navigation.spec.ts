import { expect, test } from './fixtures';

// UI-LAY-01, UI-LAY-04: the rail's buttons have names and tooltips, open their address,
// and the current one is marked.

const SECTIONS = [
  ['Dashboard', '/'],
  ['Pipeline', '/pipeline'],
  ['Deals', '/deals'],
  ['Contacts', '/contacts'],
  ['Organizations', '/organizations'],
] as const;

test('each rail button has a name, a tooltip on hover, and opens its address', async ({ page }) => {
  await page.goto('/');
  const rail = page.getByRole('navigation', { name: 'Sections' });
  for (const [name, path] of SECTIONS) {
    const link = rail.getByRole('link', { name, exact: true });
    await link.hover();
    await expect(page.getByRole('tooltip', { name })).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(path);
    await expect(link).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
    await page.mouse.move(700, 600);
  }
});

test('tooltips show on keyboard focus too', async ({ page }) => {
  await page.goto('/contacts');
  await expect(page.getByText('25 of 25 contacts')).toBeVisible();
  const rail = page.getByRole('navigation', { name: 'Sections' });
  await rail.getByRole('link', { name: /go to the dashboard/ }).focus();
  await page.keyboard.press('Tab');
  await expect(rail.getByRole('link', { name: 'Dashboard', exact: true })).toBeFocused();
  await expect(page.getByRole('tooltip', { name: 'Dashboard' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('tooltip', { name: 'Pipeline' })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/pipeline');
});

test('the current page is marked and the back button works', async ({ page }) => {
  await page.goto('/deals');
  const rail = page.getByRole('navigation', { name: 'Sections' });
  await expect(rail.getByRole('link', { name: 'Deals', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('row', { name: 'Open Compliance suite' }).click();
  await expect(page).toHaveURL(/\/deals\/\d+$/);
  await expect(rail.getByRole('link', { name: 'Deals', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.goBack();
  await expect(page).toHaveURL('/deals');
});
