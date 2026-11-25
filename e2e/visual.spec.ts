import { expect, settled, test } from './fixtures';

// SC-11, UI-LAY-03, UI-PIPE-02: screenshots of every screen at 1280px and
// 1024px in test-results/screens/, for comparing with mockup B by eye, in light
// and dark mode (dark ones end in -dark). They are a record for review, not a
// pixel comparison; light mode's pixel comparison is light-mode.spec.ts.

const WIDTHS = [1280, 1024];
const MODES = ['light', 'dark'] as const;

for (const mode of MODES) {
  for (const width of WIDTHS) {
    const suffix = mode === 'dark' ? '-dark' : '';
    test(`every screen at ${width}px in ${mode} mode`, async ({ page, api }) => {
      await page.setViewportSize({ width, height: 800 });
      if (mode === 'dark') {
        await page.goto('/');
        // The theme choice is in the menu under your initials (UI-THEME-01).
        await page.getByRole('button', { name: /^Account menu for/ }).click();
        await page.getByRole('menuitemradio', { name: 'Dark' }).click();
        await page.keyboard.press('Escape');
      }
      const deal = await api.find('deals', 'Compliance suite');
      const contact = await api.find('contacts', 'Priya Raman');
      const org = await api.find('organizations', 'Northgate Finance');
      const screens: [string, string][] = [
        ['dashboard', '/'],
        ['pipeline', '/pipeline'],
        ['deals', '/deals'],
        ['contacts', '/contacts'],
        ['organizations', '/organizations'],
        ['deal', `/deals/${deal.id}`],
        ['contact', `/contacts/${contact.id}`],
        ['organization', `/organizations/${org.id}`],
      ];
      for (const [name, path] of screens) {
        await page.goto(path);
        await settled(page);
        await page.evaluate(() => document.fonts.ready);
        // The page never scrolls sideways; the board may, inside itself.
        const sideways = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(sideways, `${name} scrolls sideways at ${width}px`).toBeLessThanOrEqual(0);
        await page.screenshot({
          path: `test-results/screens/${name}-${width}${suffix}.png`,
          fullPage: true,
        });
      }

      if (width === 1280) {
        await page.goto('/pipeline');
        await settled(page);
        const viewport = page.viewportSize()!;
        for (const stage of ['New', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']) {
          const box = await page.getByRole('region', { name: `${stage} column` }).boundingBox();
          expect(box, stage).not.toBeNull();
          expect(box!.x + box!.width, `${stage} column fits`).toBeLessThanOrEqual(viewport.width);
          expect(box!.width, `${stage} column width`).toBeGreaterThanOrEqual(180);
        }
      }

      // The dialogs, for review.
      await page.goto('/deals');
      await settled(page);
      await page.getByRole('button', { name: 'New deal' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
      await page.screenshot({
        path: `test-results/screens/deal-form-${width}${suffix}.png`,
      });
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Delete Booking engine' }).click();
      await expect(page.getByRole('alertdialog')).toBeVisible();
      await page.screenshot({
        path: `test-results/screens/delete-dialog-${width}${suffix}.png`,
      });
    });
  }
}
