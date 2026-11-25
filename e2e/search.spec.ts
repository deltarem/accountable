import { expect, settled, test } from './fixtures';

// UI-SRCH-01 to UI-SRCH-03, UI-EMPTY-06: the search in the top bar finds any
// organization, contact or deal by part of its name, in any case, from any page.

function searchBox(page: import('@playwright/test').Page) {
  return page.getByRole('combobox', { name: 'Search everything' });
}

test('opens an organization with the keyboard, from the dashboard', async ({ page }) => {
  await page.goto('/');
  await settled(page);
  await searchBox(page).fill('NORTHGATE');
  const list = page.getByRole('listbox');
  await expect(list.getByRole('option', { name: /Northgate Finance/ }).first()).toBeVisible();
  await expect(list.getByText('Organizations')).toBeVisible();

  // The first result is highlighted; Enter opens it.
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Northgate Finance' })).toBeVisible();
  await expect(searchBox(page)).toHaveValue('');
  await expect(page.getByRole('listbox')).toHaveCount(0);
});

test('opens a contact with a click, from another page', async ({ page }) => {
  await page.goto('/pipeline');
  await settled(page);
  await searchBox(page).fill('raman');
  await page.getByRole('option', { name: /Priya Raman/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Priya Raman' })).toBeVisible();
  expect(new URL(page.url()).pathname).toMatch(/^\/contacts\/\d+$/);
});

test('opens a deal with the arrows and Enter, across the groups', async ({ page }) => {
  await page.goto('/contacts');
  await settled(page);
  await searchBox(page).fill('compliance');
  const deal = page.getByRole('option', { name: /Compliance suite/ });
  await expect(deal).toBeVisible();
  await expect(deal).toContainText('Northgate Finance · Negotiation');
  // Move until the deal is the highlighted result.
  for (let i = 0; i < 10 && (await deal.getAttribute('aria-selected')) !== 'true'; i++) {
    await page.keyboard.press('ArrowDown');
  }
  await expect(deal).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Compliance suite' })).toBeVisible();
});

test('says when nothing matches, and Escape closes then clears', async ({ page }) => {
  await page.goto('/');
  await settled(page);
  await searchBox(page).fill('xyzzy');
  await expect(page.getByRole('listbox')).toContainText('No matches for "xyzzy"');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(searchBox(page)).toHaveValue('xyzzy');
  await page.keyboard.press('Escape');
  await expect(searchBox(page)).toHaveValue('');
});

test('the search boxes above the tables still work on their own', async ({ page }) => {
  await page.goto('/organizations');
  await settled(page);
  await page.getByRole('searchbox').fill('north');
  await expect(page.getByText('1 of 10 organizations')).toBeVisible();
  await expect(page.getByRole('listbox')).toHaveCount(0);
});
