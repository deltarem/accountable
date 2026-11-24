import { type Locator, type Page } from '@playwright/test';

import { expect, settled, test } from './fixtures';

// Dark mode intent, success criterion 2, and the spec's "Light and dark
// toggle", "Where the light or dark choice is kept" and "Dark mode": the toggle
// switches everything, the choice lasts through a reload, and a page in dark
// mode never shows light first.

const LIGHT_PAGE = 'rgb(240, 244, 245)';
const DARK_PAGE = 'rgb(4, 35, 46)';
const BLACK = 'rgb(0, 0, 0)';
const SEA_MIST = 'rgb(205, 216, 219)';
// Dialogs sit a step above the black panels, since shadows don't show on black.
const RAISED = 'rgb(15, 32, 39)';

function toggle(page: Page, to: 'dark' | 'light') {
  return page.getByRole('button', { name: `Switch to ${to} mode` });
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

test('a fresh browser starts in light mode', async ({ page }) => {
  await open(page, '/');
  expect(await isDark(page)).toBe(false);
  expect(await pageBackground(page)).toBe(LIGHT_PAGE);
  await expect(toggle(page, 'dark')).toBeVisible();
});

test('the toggle switches to dark, and the choice lasts through a reload', async ({ page }) => {
  await open(page, '/deals');
  await toggle(page, 'dark').click();

  expect(await isDark(page)).toBe(true);
  expect(await pageBackground(page)).toBe(DARK_PAGE);
  expect(await backgroundOf(page.getByRole('table'))).toBe(BLACK);
  await expect(toggle(page, 'light')).toBeVisible();

  await page.reload();
  await settled(page);
  expect(await isDark(page)).toBe(true);
  expect(await pageBackground(page)).toBe(DARK_PAGE);
  await expect(toggle(page, 'light')).toBeVisible();
});

test('a page in dark mode is dark before the app has loaded', async ({ page }) => {
  await open(page, '/');
  await toggle(page, 'dark').click();

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

test('every section stays dark, with the toggle at the foot of the rail', async ({ page }) => {
  await open(page, '/');
  await toggle(page, 'dark').click();
  const viewport = page.viewportSize()!;

  for (const section of ['Pipeline', 'Deals', 'Contacts', 'Organizations', 'Dashboard']) {
    await page.getByRole('link', { name: section, exact: true }).click();
    await settled(page);
    expect(await isDark(page), section).toBe(true);
    expect(await pageBackground(page), section).toBe(DARK_PAGE);
    const box = await toggle(page, 'light').boundingBox();
    expect(box, `toggle on ${section}`).not.toBeNull();
    expect(box!.y + box!.height, `toggle at the foot of the rail on ${section}`).toBeGreaterThan(viewport.height - 80);
  }

  await page.getByRole('link', { name: 'Deals', exact: true }).click();
  await expect(page.getByText('30 of 30 deals')).toBeVisible();
  await page.getByRole('row', { name: 'Open Booking engine' }).click();
  await settled(page);
  expect(await isDark(page)).toBe(true);
  expect(await pageBackground(page)).toBe(DARK_PAGE);
});

test('dialogs, tooltips and messages are dark too', async ({ page }) => {
  await open(page, '/deals');
  await toggle(page, 'dark').click();

  await page.getByRole('link', { name: 'Pipeline', exact: true }).hover();
  await expect(page.getByRole('tooltip')).toHaveText('Pipeline');
  expect(await backgroundOf(page.getByRole('tooltip'))).toBe(SEA_MIST);
  await page.mouse.move(600, 400);

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

test('text typed in the Log activity form is kept when the mode changes', async ({ page, api }) => {
  const deal = await api.find('deals', 'Compliance suite');
  await open(page, `/deals/${deal.id}`);
  const description = page.getByPlaceholder('What happened?');
  await description.fill('Called about the renewal');
  await toggle(page, 'dark').click();
  await expect(description).toHaveValue('Called about the renewal');
  await toggle(page, 'light').click();
  await expect(description).toHaveValue('Called about the renewal');
});

test('switching back to light also lasts through a reload', async ({ page }) => {
  await open(page, '/');
  await toggle(page, 'dark').click();
  await toggle(page, 'light').click();
  await page.reload();
  await settled(page);
  expect(await isDark(page)).toBe(false);
  expect(await pageBackground(page)).toBe(LIGHT_PAGE);
});

test('another browser starts in light mode while this one is dark', async ({ page, browser, baseURL }) => {
  await open(page, '/');
  await toggle(page, 'dark').click();

  const other = await browser.newContext({ baseURL });
  const otherPage = await other.newPage();
  await otherPage.goto('/');
  await settled(otherPage);
  expect(await isDark(otherPage)).toBe(false);
  expect(await pageBackground(otherPage)).toBe(LIGHT_PAGE);
  await other.close();
});

test('with storage blocked, the toggle still works and the console stays clear', async ({ page }) => {
  await page.addInitScript(() => {
    const blocked = () => {
      throw new DOMException('Storage is blocked', 'SecurityError');
    };
    Storage.prototype.getItem = blocked;
    Storage.prototype.setItem = blocked;
  });
  await open(page, '/');
  expect(await isDark(page)).toBe(false);

  await toggle(page, 'dark').click();
  expect(await isDark(page)).toBe(true);
  expect(await pageBackground(page)).toBe(DARK_PAGE);

  // Nothing could be saved, so the next visit starts in light mode.
  await page.reload();
  await settled(page);
  expect(await isDark(page)).toBe(false);
});
