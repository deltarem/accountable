import { type Page } from '@playwright/test';

import { type Api, expect, settled, test } from './fixtures';

// Success criterion 13: light mode looks exactly as it did before dark mode was
// added, apart from the top bar, the rail's empty foot and who added each record.
// The reference screenshots in light-mode.spec.ts-snapshots/ were captured before
// dark mode's styling changed, and retaken once by the sign-in, search and menu
// change (docs/changes/multi-user/), after checking that the only differences
// were those three. Never update them to make this pass: a difference means light
// mode changed, and the fix belongs in tokens.css.
//
// To make references on another computer, check out the commit that last retook
// them and run this file with --update-snapshots.

const WIDTHS = [1280, 1024];

// No tolerance: any pixel that differs fails, so a slightly different shade
// can't slip through.
const EXACT = { threshold: 0, maxDiffPixels: 0 };

type Screen = { name: string; path: (api: Api) => Promise<string> };

const SCREENS: Screen[] = [
  { name: 'dashboard', path: async () => '/' },
  { name: 'pipeline', path: async () => '/pipeline' },
  { name: 'deals', path: async () => '/deals' },
  { name: 'contacts', path: async () => '/contacts' },
  { name: 'organizations', path: async () => '/organizations' },
  {
    name: 'deal',
    path: async (api) => `/deals/${(await api.find('deals', 'Compliance suite')).id}`,
  },
  {
    name: 'contact',
    path: async (api) => `/contacts/${(await api.find('contacts', 'Priya Raman')).id}`,
  },
  {
    name: 'organization',
    path: async (api) => `/organizations/${(await api.find('organizations', 'Northgate Finance')).id}`,
  },
];

async function ready(page: Page) {
  await settled(page);
  await page.evaluate(() => document.fonts.ready);
}

for (const width of WIDTHS) {
  test.describe(`light mode at ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
    });

    for (const screen of SCREENS) {
      test(`${screen.name} is unchanged`, async ({ page, api }) => {
        await page.goto(await screen.path(api));
        await ready(page);
        await expect(page).toHaveScreenshot(`${screen.name}-${width}.png`, {
          fullPage: true,
          animations: 'disabled',
          ...EXACT,
        });
      });
    }

    test('deal form with errors is unchanged', async ({ page }) => {
      await page.goto('/deals');
      await ready(page);
      await page.getByRole('button', { name: 'New deal' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
      await expect(page.getByRole('dialog').getByText('Enter a name')).toBeVisible();
      await expect(page).toHaveScreenshot(`deal-form-${width}.png`, {
        animations: 'disabled',
        ...EXACT,
      });
    });

    test('delete dialog is unchanged', async ({ page }) => {
      await page.goto('/deals');
      await ready(page);
      await page.getByRole('button', { name: 'Delete Booking engine' }).click();
      await expect(page.getByRole('alertdialog')).toBeVisible();
      await expect(page).toHaveScreenshot(`delete-dialog-${width}.png`, {
        animations: 'disabled',
        ...EXACT,
      });
    });
  });
}
