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

describe('starting and stopping', () => {
  test('answers through the frontend, then frees both ports after stop', { timeout: 90_000 }, async () => {
    const backendPort = 8200;
    const frontendPort = 5373;
    const dbDir = tempDir();
    const child = fork(path.join(HERE, 'dev.mjs'), [], {
      env: {
        ...process.env,
        BACKEND_PORT: String(backendPort),
        FRONTEND_PORT: String(frontendPort),
        ACCOUNTABLE_DB: path.join(dbDir, 'dev-test.db'),
      },
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });
    const exited = new Promise((resolve) => child.once('exit', resolve));
    try {
      const started = Date.now();
      let body = null;
      while (Date.now() - started < 30_000) {
        try {
          const response = await fetch(`http://127.0.0.1:${frontendPort}/api/today`);
          if (response.ok) {
            body = await response.json();
            break;
          }
        } catch {
          // not up yet
        }
        await new Promise((r) => setTimeout(r, 250));
      }
      assert.ok(body, 'GET /api/today answered through the frontend within 30 seconds');
      assert.match(body.today, /^\d{4}-\d{2}-\d{2}$/);

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
