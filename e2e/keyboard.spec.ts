import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';

// SC-08, UI-FORM-01, UI-TBL-03: forms and tables work with the keyboard.

async function tabUntil(page: Page, check: () => Promise<boolean>, max = 40) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    if (await check()) return;
  }
  throw new Error('never reached the element with Tab');
}

test('create a contact using only the keyboard', async ({ page, api }) => {
  await page.goto('/contacts');
  await expect(page.getByText('25 of 25 contacts')).toBeVisible();
  const button = page.getByRole('button', { name: 'New contact' });
  await tabUntil(page, () => button.evaluate((el) => el === document.activeElement));
  await page.keyboard.press('Enter');
  const form = page.getByRole('dialog', { name: 'New contact' });
  await expect(form.getByLabel(/^Name/)).toBeFocused();
  await page.keyboard.type('Keyboard Person');
  await page.keyboard.press('Tab');
  await expect(form.getByLabel('Email')).toBeFocused();
  await page.keyboard.type('keys@board.example');
  await page.keyboard.press('Tab');
  await page.keyboard.type('+1 555 0142');
  await page.keyboard.press('Enter');
  await expect(form).toBeHidden();
  await expect(page.getByRole('row', { name: 'Open Keyboard Person' })).toBeVisible();
  const saved = await api.find('contacts', 'Keyboard Person');
  expect(saved.email).toBe('keys@board.example');
  expect(saved.phone).toBe('+1 555 0142');
});

test('Escape closes a dialog without saving', async ({ page, api }) => {
  await page.goto('/organizations');
  await page.getByRole('button', { name: 'New organization' }).click();
  const form = page.getByRole('dialog', { name: 'New organization' });
  await page.keyboard.type('Never Saved');
  await page.keyboard.press('Escape');
  await expect(form).toBeHidden();
  expect((await api.get('/organizations')).length).toBe(10);
});

test('Enter in the notes field starts a new line instead of saving', async ({ page, api }) => {
  await page.goto('/organizations');
  await page.getByRole('button', { name: 'New organization' }).click();
  const form = page.getByRole('dialog', { name: 'New organization' });
  await page.keyboard.type('Two Lines Ltd');
  await form.getByLabel('Notes').focus();
  await page.keyboard.type('First line');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Second line');
  await expect(form).toBeVisible();
  await expect(form.getByLabel('Notes')).toHaveValue('First line\nSecond line');
  await form.getByLabel(/^Name/).focus();
  await page.keyboard.press('Enter');
  await expect(form).toBeHidden();
  expect((await api.find('organizations', 'Two Lines Ltd')).notes).toBe('First line\nSecond line');
});

test('Tab and Enter open a row from a table', async ({ page }) => {
  await page.goto('/deals');
  await expect(page.getByText('30 of 30 deals')).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search deals' }).focus();
  await page.keyboard.type('compliance');
  const row = page.getByRole('row', { name: 'Open Compliance suite' });
  await tabUntil(page, () => row.evaluate((el) => el === document.activeElement));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Compliance suite' })).toBeVisible();
});

test('the row buttons are reachable with Tab', async ({ page }) => {
  await page.goto('/organizations');
  await expect(page.getByText('10 of 10 organizations')).toBeVisible();
  const edit = page.getByRole('button', { name: 'Edit Brightline Health' });
  await tabUntil(page, () => edit.evaluate((el) => el === document.activeElement), 60);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Edit organization' })).toBeVisible();
});
