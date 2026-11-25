import { type Locator, type Page } from '@playwright/test';

import { expect, settled, test } from './fixtures';

// UI-THEME-01, success criterion 13: Light, Dark and System in the menu under your
// initials switch everything, the choice lasts through a reload, System follows
// the device while the app is open, and a page in dark mode never shows light first.

const LIGHT_PAGE = 'rgb(240, 244, 245)';
const DARK_PAGE = 'rgb(4, 35, 46)';
const BLACK = 'rgb(0, 0, 0)';
const SEA_MIST = 'rgb(205, 216, 219)';
// Dialogs and menus sit a step above the black panels, since shadows don't show on black.
const RAISED = 'rgb(15, 32, 39)';

type Choice = 'Light' | 'Dark' | 'System';

function initials(page: Page) {
  return page.getByRole('button', { name: 'Account menu for Test User' });
}

/** Opens the menu, picks the theme, and closes the menu again. */
async function choose(page: Page, choice: Choice) {
  await initials(page).click();
  await page.getByRole('menuitemradio', { name: choice }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
}

async function ticked(page: Page): Promise<string> {
  await initials(page).click();
  const name = await page.getByRole('menuitemradio', { checked: true }).innerText();
  await page.keyboard.press('Escape');
  return name.trim();
}

async function pageBackground(page: Page) {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

async function isDark(page: Page) {
  return page.evaluate(() => document.documentElement.dataset.theme === 'dark');
}

/** The colour behind an element: its own background, or the nearest one behind it. */
async function backgroundOf(locator: Locator) {
  return locator.evaluate((el) => {
    for (let node: Element | null = el; node; node = node.parentElement) {
      const bg = getComputedStyle(node).backgroundColor;
      if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
    }
    return 'none';
  });
}

async function open(page: Page, path: string) {
  await page.goto(path);
  await settled(page);
}

test('a fresh browser starts in light mode, with Light ticked', async ({ page }) => {
  await open(page, '/');
  expect(await isDark(page)).toBe(false);
  expect(await pageBackground(page)).toBe(LIGHT_PAGE);
  expect(await ticked(page)).toBe('Light');
});

test('choosing Dark switches at once and keeps the menu open; the choice lasts through a reload', async ({
  page,
}) => {
  await open(page, '/deals');
  await initials(page).click();
  await page.getByRole('menuitemradio', { name: 'Dark' }).click();
  await expect(page.getByRole('menu')).toBeVisible();
  expect(await isDark(page)).toBe(true);
  expect(await backgroundOf(page.getByRole('menu'))).toBe(RAISED);
  await page.keyboard.press('Escape');

  expect(await pageBackground(page)).toBe(DARK_PAGE);
  expect(await backgroundOf(page.getByRole('table'))).toBe(BLACK);

  await page.reload();
  await settled(page);
  expect(await isDark(page)).toBe(true);
  expect(await pageBackground(page)).toBe(DARK_PAGE);
  expect(await ticked(page)).toBe('Dark');
});

test('a page in dark mode is dark before the app has loaded', async ({ page }) => {
  await open(page, '/');
  await choose(page, 'Dark');

  // Hold the app's code back, then look at the page while it waits.
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/src/main.tsx', async (route) => {
    await held;
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForFunction(() => document.body !== null && getComputedStyle(document.body).backgroundColor !== '');
  await expect.poll(() => pageBackground(page)).toBe(DARK_PAGE);
  expect(await page.locator('#root').innerHTML()).toBe('');
  expect(await isDark(page)).toBe(true);

  release();
  await settled(page);
  await page.unroute('**/src/main.tsx');
});

test('every section stays dark, and the rail has no toggle at its foot', async ({ page }) => {
  await open(page, '/');
  await choose(page, 'Dark');
  await expect(page.getByRole('navigation', { name: 'Sections' }).getByRole('button')).toHaveCount(0);

  for (const section of ['Pipeline', 'Deals', 'Contacts', 'Organizations', 'Dashboard']) {
    await page.getByRole('link', { name: section, exact: true }).click();
    await settled(page);
    expect(await isDark(page), section).toBe(true);
    expect(await pageBackground(page), section).toBe(DARK_PAGE);
  }

  await page.getByRole('link', { name: 'Deals', exact: true }).click();
  await expect(page.getByText('30 of 30 deals')).toBeVisible();
  await page.getByRole('row', { name: 'Open Booking engine' }).click();
  await settled(page);
  expect(await isDark(page)).toBe(true);
  expect(await pageBackground(page)).toBe(DARK_PAGE);
});

test('dialogs, tooltips, the search and messages are dark too', async ({ page }) => {
  await open(page, '/deals');
  await choose(page, 'Dark');

  await page.getByRole('link', { name: 'Pipeline', exact: true }).hover();
  await expect(page.getByRole('tooltip')).toHaveText('Pipeline');
  expect(await backgroundOf(page.getByRole('tooltip'))).toBe(SEA_MIST);
  await page.mouse.move(600, 400);

  await page.getByRole('combobox', { name: 'Search everything' }).fill('book');
  await expect(page.getByRole('option', { name: /Booking engine/ })).toBeVisible();
  expect(await backgroundOf(page.getByRole('listbox'))).toBe(RAISED);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'New deal' }).click();
  expect(await backgroundOf(page.getByRole('dialog'))).toBe(RAISED);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Delete Booking engine' }).click();
  expect(await backgroundOf(page.getByRole('alertdialog'))).toBe(RAISED);
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('button', { name: 'Edit Booking engine' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  // exact: Radix also reads "Notification Deal saved" out to screen readers.
  const message = page.getByText('Deal saved', { exact: true });
  await expect(message).toBeVisible();
  expect(await backgroundOf(message)).toBe(SEA_MIST);
});

test('text typed in the Log activity form is kept when the theme changes', async ({ page, api }) => {
  const deal = await api.find('deals', 'Compliance suite');
  await open(page, `/deals/${deal.id}`);
  const description = page.getByPlaceholder('What happened?');
  await description.fill('Called about the renewal');
  await choose(page, 'Dark');
  await expect(description).toHaveValue('Called about the renewal');
  await choose(page, 'Light');
  await expect(description).toHaveValue('Called about the renewal');
});

test('switching back to Light also lasts through a reload', async ({ page }) => {
  await open(page, '/');
  await choose(page, 'Dark');
  await choose(page, 'Light');
  await page.reload();
  await settled(page);
  expect(await isDark(page)).toBe(false);
  expect(await pageBackground(page)).toBe(LIGHT_PAGE);
});

test('System follows the device, and changes with it while the app is open', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await open(page, '/deals');
  await choose(page, 'System');
  expect(await isDark(page)).toBe(false);

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => isDark(page)).toBe(true);
  expect(await pageBackground(page)).toBe(DARK_PAGE);

  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(() => isDark(page)).toBe(false);

  // Kept through a reload, and applied before the app draws.
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.reload();
  await settled(page);
  expect(await isDark(page)).toBe(true);
  expect(await ticked(page)).toBe('System');
});

test('Light and Dark ignore the device', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await open(page, '/');
  expect(await isDark(page)).toBe(false);
  await choose(page, 'Dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.waitForTimeout(100);
  expect(await isDark(page)).toBe(true);
});

test('another browser starts in light mode while this one is dark', async ({ page, browser, baseURL }) => {
  await open(page, '/');
  await choose(page, 'Dark');

  const other = await browser.newContext({ baseURL });
  const otherPage = await other.newPage();
  await otherPage.goto('/');
  await expect(otherPage.getByRole('heading', { name: 'Sign in to Accountable' })).toBeVisible();
  expect(await isDark(otherPage)).toBe(false);
  expect(await pageBackground(otherPage)).toBe(LIGHT_PAGE);
  await other.close();
});

test('signing out keeps the choice, and the sign-in screen follows it', async ({ page }) => {
  await open(page, '/');
  await choose(page, 'Dark');
  await initials(page).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in to Accountable' })).toBeVisible();
  expect(await isDark(page)).toBe(true);
  expect(await pageBackground(page)).toBe(DARK_PAGE);
});

test.describe('with storage blocked', () => {
  // Nothing can be kept, so not the session either: sign in on the screen.
  test.use({ signedOut: true });

  test('the theme choice still works and the console stays clear', async ({ page }) => {
    await page.addInitScript(() => {
      const blocked = () => {
        throw new DOMException('Storage is blocked', 'SecurityError');
      };
      Storage.prototype.getItem = blocked;
      Storage.prototype.setItem = blocked;
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await settled(page);
    expect(await isDark(page)).toBe(false);

    await choose(page, 'Dark');
    expect(await isDark(page)).toBe(true);
    expect(await pageBackground(page)).toBe(DARK_PAGE);

    // Nothing could be saved, so the next visit starts in light mode, signed out.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Sign in to Accountable' })).toBeVisible();
    expect(await isDark(page)).toBe(false);
  });
});
