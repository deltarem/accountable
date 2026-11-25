import { TEST_USER, expect, settled, test } from './fixtures';

// UI-MENU-01, UI-AUTH-02, AUTH-01: the menu under your initials, and signing out.

test('the menu opens from the keyboard and shows who is signed in', async ({ page }) => {
  await page.goto('/deals');
  await settled(page);
  const initials = page.getByRole('button', { name: `Account menu for ${TEST_USER.name}` });
  await expect(initials).toHaveText('TU');

  await initials.focus();
  await page.keyboard.press('ArrowDown');
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect(menu).toContainText(TEST_USER.name);
  await expect(menu).toContainText(TEST_USER.email);
  await expect(menu.getByRole('menuitemradio')).toHaveText(['Light', 'Dark', 'System']);

  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(initials).toBeFocused();
});

test.describe('signing out', () => {
  // After signing out, the app's own calls go without a token and are refused.
  test.use({ allowConsole: [/Failed to load resource/] });

  test('returns to the sign-in screen at /, forgets the session, and the API refuses', async ({ page, api }) => {
    const deal = await api.find('deals', 'Compliance suite');
    await page.goto(`/deals/${deal.id}`);
    await settled(page);

    await page.getByRole('button', { name: `Account menu for ${TEST_USER.name}` }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in to Accountable' })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/');
    await expect(page.getByText('Compliance suite')).toHaveCount(0);

    const refused = await page.evaluate(async () => (await fetch('/api/deals')).status);
    expect(refused).toBe(401);

    // Still signed out after a reload: nothing of the session was kept.
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in to Accountable' })).toBeVisible();

    // Signing in again starts at the dashboard.
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
  });
});
