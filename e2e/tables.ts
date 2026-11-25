// Shared steps for the three table specs.

import type { Page } from '@playwright/test';

import { expect } from './fixtures';

/** Choose an option in a searchable select (RecordSelect). */
export async function choose(page: Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label }).click();
  // The select's own search, in its pop-up; the top bar's search is a cmdk input too.
  await page.locator('[data-radix-popper-content-wrapper] [cmdk-input]').fill(option);
  await page.getByRole('option', { name: new RegExp(`^${option}`) }).first().click();
}

/** The texts of one column, by its heading. */
export async function columnTexts(page: Page, heading: string): Promise<string[]> {
  const headers = await page.locator('thead th').allInnerTexts();
  const index = headers.findIndex((h) => h.trim() === heading);
  expect(index, `column ${heading}`).toBeGreaterThanOrEqual(0);
  return page.locator(`tbody tr td:nth-child(${index + 1})`).allInnerTexts();
}

function sortKey(text: string): string | number {
  const t = text.trim();
  // Empty cells show a muted placeholder, and sort as empty.
  if (t === 'No organization') return '';
  const money = /^\$[\d.]+,\d{2}$/.test(t);
  if (money) return Number(t.replace(/[$.]/g, '').replace(',', '.'));
  if (/^\d+%?$/.test(t)) return Number(t.replace('%', ''));
  return t.toLowerCase();
}

export function isSorted(values: string[], direction: 'asc' | 'desc', compare?: (a: string, b: string) => number) {
  const cmp =
    compare ??
    ((a: string, b: string) => {
      const ka = sortKey(a);
      const kb = sortKey(b);
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
  for (let i = 1; i < values.length; i++) {
    const c = cmp(values[i - 1], values[i]);
    if (direction === 'asc' ? c > 0 : c < 0) return false;
  }
  return true;
}

/** Click a heading and check the column sorts ascending, then descending. */
export async function checkSorting(page: Page, heading: string, compare?: (a: string, b: string) => number) {
  const button = page.locator('thead').getByRole('button', { name: heading, exact: true });
  // Names are sorted A to Z already; one click turns them Z to A.
  const startsSorted = (await page.locator('thead th[aria-sort]').innerText()).trim() === heading;
  if (!startsSorted) {
    await button.click();
    expect(isSorted(await columnTexts(page, heading), 'asc', compare), `${heading} ascending`).toBe(true);
  } else {
    expect(isSorted(await columnTexts(page, heading), 'asc', compare), `${heading} ascending`).toBe(true);
  }
  await button.click();
  expect(isSorted(await columnTexts(page, heading), 'desc', compare), `${heading} descending`).toBe(true);
}

export async function expectToast(page: Page, text: string) {
  await expect(page.getByRole('status').filter({ hasText: text }).first()).toBeVisible();
}
