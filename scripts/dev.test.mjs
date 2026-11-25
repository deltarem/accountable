// Tests for scripts/dev.mjs, run with node --test.

import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { needsInstall, portIsFree } from './dev.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const temps = [];
function tempDir() {
  const dir = mkdtempSync(path.join(tmpdir(), 'accountable-dev-'));
  temps.push(dir);
  return dir;
}
after(() => {
  for (const dir of temps) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Windows may still hold the database file for a moment; the OS cleans temp later.
    }
  }
});

describe('needsInstall', () => {
  test('is true with no node_modules', () => {
    const dir = tempDir();
    writeFileSync(path.join(dir, 'package-lock.json'), '{}');
    assert.equal(needsInstall(dir), true);
  });

  test('is true when package-lock.json is newer', () => {
    const dir = tempDir();
    mkdirSync(path.join(dir, 'node_modules'));
    const marker = path.join(dir, 'node_modules', '.package-lock.json');
    writeFileSync(marker, '{}');
    writeFileSync(path.join(dir, 'package-lock.json'), '{}');
    const old = new Date(Date.now() - 60_000);
    utimesSync(marker, old, old);
    assert.equal(needsInstall(dir), true);
  });

  test('is false otherwise', () => {
    const dir = tempDir();
    writeFileSync(path.join(dir, 'package-lock.json'), '{}');
    const old = new Date(Date.now() - 60_000);
    utimesSync(path.join(dir, 'package-lock.json'), old, old);
    mkdirSync(path.join(dir, 'node_modules'));
    writeFileSync(path.join(dir, 'node_modules', '.package-lock.json'), '{}');
    assert.equal(needsInstall(dir), false);
  });
});

describe('npm run dev without the Supabase settings', () => {
  test('says which are missing and starts nothing', { timeout: 30_000 }, async () => {
    const backendPort = 8201;
    const frontendPort = 5374;
    // Empty values in the environment win over anything in .env, so this holds
    // whatever this computer's .env has.
    const child = fork(path.join(HERE, 'dev.mjs'), [], {
      env: {
        ...process.env,
        BACKEND_PORT: String(backendPort),
        FRONTEND_PORT: String(frontendPort),
        DATABASE_URL: '',
        SUPABASE_URL: '',
        SUPABASE_PUBLISHABLE_KEY: '',
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => (stderr += chunk));
    const code = await new Promise((resolve) => child.once('exit', resolve));
    assert.equal(code, 1);
    assert.match(stderr, /npm run dev needs DATABASE_URL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY/);
    assert.match(stderr, /npm run dev:local/);
    assert.ok(await portIsFree(backendPort), 'the backend never started');
    assert.ok(await portIsFree(frontendPort), 'the frontend never started');
  });
});

describe('npm run dev:local, starting and stopping', () => {
  test('signs in the test user through the frontend, then frees both ports after stop', { timeout: 90_000 }, async () => {
    const backendPort = 8200;
    const frontendPort = 5373;
    const dbDir = tempDir();
    const child = fork(path.join(HERE, 'dev.mjs'), ['--local'], {
      env: {
        ...process.env,
        BACKEND_PORT: String(backendPort),
        FRONTEND_PORT: String(frontendPort),
        ACCOUNTABLE_DB: path.join(dbDir, 'dev-test.db'),
        // Ignored in local mode (RUN-12): the backend would refuse to start if
        // this reached it, because local mode never runs on Postgres (DEC-19).
        DATABASE_URL: 'postgresql://postgres:pw@db.invalid:5432/postgres',
        SUPABASE_URL: 'https://project.supabase.invalid',
      },
      stdio: ['ignore', 'pipe', 'ignore', 'ipc'],
    });
    let stdout = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    const exited = new Promise((resolve) => child.once('exit', resolve));
    const frontend = `http://127.0.0.1:${frontendPort}`;
    try {
      const started = Date.now();
      let token = null;
      while (Date.now() - started < 30_000) {
        try {
          const response = await fetch(`${frontend}/api/local/sign-in`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@example.com', password: 'accountable' }),
          });
          if (response.ok) {
            token = (await response.json()).access_token;
            break;
          }
        } catch {
          // not up yet
        }
        await new Promise((r) => setTimeout(r, 250));
      }
      assert.ok(token, 'the test user signed in through the frontend within 30 seconds');
      const response = await fetch(`${frontend}/api/today`, { headers: { Authorization: `Bearer ${token}` } });
      assert.equal(response.status, 200);
      assert.match((await response.json()).today, /^\d{4}-\d{2}-\d{2}$/);
      assert.equal((await fetch(`${frontend}/api/today`)).status, 401, 'signed out, the API refuses');

      const ready = Date.now();
      while (!stdout.includes('local mode') && Date.now() - ready < 5_000) {
        await new Promise((r) => setTimeout(r, 100));
      }
      assert.match(stdout, /Accountable is running\. Open http:\/\/127\.0\.0\.1:5373/);
      assert.match(stdout, /local mode.*built-in test user/);

      child.send('stop');
      const stopped = Date.now();
      let free = false;
      while (Date.now() - stopped < 5_000) {
        free = (await portIsFree(backendPort)) && (await portIsFree(frontendPort));
        if (free) break;
        await new Promise((r) => setTimeout(r, 200));
      }
      assert.ok(free, 'both ports are free within 5 seconds of stop');
      await exited;
    } finally {
      if (child.exitCode === null) child.kill();
    }
  });
});
