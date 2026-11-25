import { TEST_USER, expect, signInToken, test } from './fixtures';

// UI-AUTH-01, UI-AUTH-02, AUTH-01: signed out, every address shows the sign-in
// screen and the API refuses; signing in opens the address that was asked for.

test.use({ signedOut: true });

test('an address asked for signed out opens after signing in', async ({ page, api }) => {
  const [deal] = await api.get<{ id: number; name: string }[]>('/deals');
  await page.goto(`/deals/${deal.id}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in to Accountable' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Sections' })).toHaveCount(0);
  await expect(page.getByText(deal.name)).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe(`/deals/${deal.id}`);

  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1, name: deal.name })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(`/deals/${deal.id}`);
});

test('nothing is loaded and no record name shows before signing in', async ({ page, api }) => {
  const names = (await api.get<{ name: string }[]>('/organizations')).map((o) => o.name);
  const answered: string[] = [];
  page.on('response', (response) => {
    if (new URL(response.url()).pathname.startsWith('/api/')) answered.push(response.url());
  });
  await page.goto('/organizations');
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in to Accountable' })).toBeVisible();
  const text = await page.locator('body').innerText();
  for (const name of names) expect(text).not.toContain(name);
  expect(answered).toEqual([]);
});

test('the test user is filled in, in local mode', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Email')).toHaveValue(TEST_USER.email);
  await expect(page.getByLabel('Email')).toBeFocused();
  await expect(page.getByLabel('Password')).toHaveValue(TEST_USER.password);
  await expect(page.getByText("Local mode: you're signing in as the built-in test user.")).toBeVisible();
});

test('every API route refuses without a token', async ({ request }) => {
  for (const path of ['/api/dashboard', '/api/deals', '/api/organizations/1', '/api/me', '/api/today']) {
    const r = await request.get(path);
    expect(r.status(), path).toBe(401);
    expect(await r.json()).toEqual({ detail: 'Sign in to continue' });
  }
  const token = await signInToken(request);
  const r = await request.get('/api/me', { headers: { Authorization: `Bearer ${token}` } });
  expect((await r.json()).name).toBe(TEST_USER.name);
});

test.describe('refused by the server', () => {
  // The browser logs each refused request itself; these tests expect one.
  test.use({ allowConsole: [/Failed to load resource/] });

  test('a wrong password says so and stays on the sign-in screen', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Password').fill('not-the-password');
    await page.getByLabel('Password').press('Enter');
    await expect(page.getByRole('alert')).toHaveText('Email or password is wrong');
    await expect(page.getByRole('navigation', { name: 'Sections' })).toHaveCount(0);
  });

  test('a session the server no longer accepts shows the sign-in screen with a message', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('accountable-local-session', 'no-longer-valid'));
    await page.goto('/contacts');
    await expect(page.getByRole('status')).toHaveText('Your session has ended. Sign in again.');
    expect(new URL(page.url()).pathname).toBe('/contacts');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Contacts' })).toBeVisible();
  });
});

for (const mode of ['light', 'dark'] as const) {
  test(`a screenshot of the sign-in screen in ${mode} mode`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    if (mode === 'dark') await page.addInitScript(() => localStorage.setItem('accountable-theme', 'dark'));
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in to Accountable' })).toBeVisible();
    await page.screenshot({ path: `test-results/screens/sign-in-1280${mode === 'dark' ? '-dark' : ''}.png` });
  });
}
