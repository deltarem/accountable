import { type ChildProcess, spawn, spawnSync } from 'node:child_process';

import { expect, reseed, test } from './fixtures';
import { expectToast } from './tables';

// SC-02: changes survive a refresh and a restart of the backend; the reset
// command brings back the sample data.

const PORT = 8110;

function startBackend(): ChildProcess {
  return spawn('uv', ['run', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', String(PORT)], {
    env: { ...process.env, ACCOUNTABLE_DB: 'data/e2e.db', ACCOUNTABLE_TODAY: '2026-11-23T14:00:00' },
    shell: process.platform === 'win32',
    stdio: 'ignore',
  });
}

function stopBackend(child: ChildProcess) {
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill();
}

async function namesFrom(port: number): Promise<string[]> {
  const started = Date.now();
  while (Date.now() - started < 30_000) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/organizations`);
      if (r.ok) return (await r.json()).map((o: { name: string }) => o.name);
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('backend did not start');
}

test('changes are kept after a refresh and a restart, and seed resets them', async ({ page }) => {
  // Two cold backend starts (about 12 seconds each on Windows) and a reseed
  // take this past the usual 45-second limit.
  test.slow();
  await page.goto('/organizations');
  await page.getByRole('button', { name: 'New organization' }).click();
  await page.getByRole('dialog').getByLabel(/^Name/).fill('Kept After Restart');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expectToast(page, 'Organization saved');
  await page.getByRole('button', { name: 'Delete Solano Foods' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expectToast(page, 'Organization deleted');

  await page.reload();
  await expect(page.getByRole('row', { name: 'Open Kept After Restart' })).toBeVisible();

  // A backend started from scratch on the same database file sees both changes,
  // twice over: start, stop, start again.
  for (let run = 0; run < 2; run++) {
    const backend = startBackend();
    try {
      const names = await namesFrom(PORT);
      expect(names).toContain('Kept After Restart');
      expect(names).not.toContain('Solano Foods');
    } finally {
      stopBackend(backend);
    }
  }

  // npm run seed resets to the sample data while the app is running.
  reseed();
  await page.reload();
  await expect(page.getByText('10 of 10 organizations')).toBeVisible();
  await expect(page.getByRole('row', { name: 'Open Kept After Restart' })).toHaveCount(0);
  await expect(page.getByRole('row', { name: 'Open Solano Foods' })).toBeVisible();
});
