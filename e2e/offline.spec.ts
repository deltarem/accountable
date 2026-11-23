import { expect, settled, test } from './fixtures';

// DEC-02: fonts are bundled and nothing is fetched from the internet.

test('every request stays on this computer', async ({ page }) => {
  const outside: string[] = [];
  page.on('request', (request) => {
    const host = new URL(request.url()).hostname;
    if (host !== '127.0.0.1' && host !== 'localhost') outside.push(request.url());
  });

  for (const path of ['/', '/pipeline', '/deals', '/contacts', '/organizations', '/deals/1', '/contacts/1', '/organizations/1']) {
    await page.goto(path);
    await settled(page);
  }
  await page.goto('/deals');
  await page.getByRole('button', { name: 'New deal' }).click();
  await expect(page.getByRole('dialog', { name: 'New deal' })).toBeVisible();
  await page.keyboard.press('Escape');

  // The brand fonts are the ones in use, loaded from the app itself.
  const fonts = await page.evaluate(async () => {
    const names = ['Instrument Sans', 'JetBrains Mono', 'Instrument Serif'];
    const loaded = await Promise.all(names.map((f) => document.fonts.load(`16px "${f}"`)));
    return loaded.map((faces) => faces.length > 0);
  });
  expect(fonts).toEqual([true, true, true]);
  expect(outside).toEqual([]);
});
