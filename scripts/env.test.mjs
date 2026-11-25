// Tests for scripts/env.mjs, scripts/seed.mjs and scripts/start.mjs, run with node --test.

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, describe, test } from 'node:test';

import {
  TEAM_SETTINGS,
  localEnv,
  missingSettings,
  readEnvFile,
  settingsProblem,
  supabaseEnv,
  withEnvFile,
} from './env.mjs';
import { seedRun } from './seed.mjs';
import { serveCommand } from './start.mjs';

const dir = mkdtempSync(path.join(tmpdir(), 'accountable-env-'));
after(() => rmSync(dir, { recursive: true, force: true }));

function envFile(text) {
  const file = path.join(dir, `${Math.random().toString(36).slice(2)}.env`);
  writeFileSync(file, text);
  return file;
}

const FULL = {
  DATABASE_URL: 'postgresql://postgres.abc:pw@pooler.supabase.com:5432/postgres',
  SUPABASE_URL: 'https://abc.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc',
};

describe('reading .env', () => {
  test('reads names and values, with comments and quotes', () => {
    const file = envFile('# Supabase\nDATABASE_URL="postgresql://x"\nSUPABASE_URL=https://abc.supabase.co\n');
    assert.deepEqual(readEnvFile(file), {
      DATABASE_URL: 'postgresql://x',
      SUPABASE_URL: 'https://abc.supabase.co',
    });
  });

  test('a missing file gives nothing', () => {
    assert.deepEqual(readEnvFile(path.join(dir, 'nope.env')), {});
  });

  test('the environment wins over the file, as on Render', () => {
    const file = envFile('SUPABASE_URL=https://from-file.supabase.co\nOTHER=1\n');
    const merged = withEnvFile({ SUPABASE_URL: 'https://from-env.supabase.co' }, file);
    assert.equal(merged.SUPABASE_URL, 'https://from-env.supabase.co');
    assert.equal(merged.OTHER, '1');
  });
});

describe('missing settings', () => {
  test('none missing', () => {
    assert.deepEqual(missingSettings(FULL), []);
    assert.equal(settingsProblem(FULL), null);
  });

  test('names each missing or empty one, and points to the way out', () => {
    const env = { ...FULL, SUPABASE_URL: '  ', SUPABASE_PUBLISHABLE_KEY: undefined };
    assert.deepEqual(missingSettings(env), ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY']);
    const message = settingsProblem(env);
    assert.match(message, /npm run dev needs SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY in \.env/);
    assert.match(message, /\.env\.example/);
    assert.match(message, /npm run dev:local/);
  });

  test('names the command it was asked for', () => {
    assert.match(settingsProblem({}, 'npm start'), /^npm start needs DATABASE_URL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY/);
  });
});

describe('local mode and Supabase', () => {
  test('local mode drops the team settings and turns local mode on', () => {
    const env = localEnv({ ...FULL, PATH: '/bin' });
    assert.equal(env.ACCOUNTABLE_LOCAL, '1');
    assert.equal(env.PATH, '/bin');
    for (const name of TEAM_SETTINGS) assert.equal(name in env, false, name);
  });

  test('Supabase mode adds the file and turns local mode off', () => {
    const file = envFile(Object.entries(FULL).map(([k, v]) => `${k}=${v}`).join('\n'));
    const env = supabaseEnv({ ACCOUNTABLE_LOCAL: '1' }, file);
    assert.equal(env.ACCOUNTABLE_LOCAL, undefined);
    assert.equal(env.DATABASE_URL, FULL.DATABASE_URL);
  });
});

describe('npm run seed', () => {
  test('--local resets the SQLite file and never passes Supabase on', () => {
    const run = seedRun(['--local', '--empty'], FULL);
    assert.deepEqual(run.args, ['--empty']);
    assert.equal(run.env.ACCOUNTABLE_LOCAL, '1');
    assert.equal(run.env.DATABASE_URL, undefined);
  });

  test('otherwise it passes the settings and the arguments on', () => {
    const run = seedRun(['--yes'], FULL);
    assert.deepEqual(run.args, ['--yes']);
    assert.equal(run.env.DATABASE_URL, FULL.DATABASE_URL);
    assert.equal(run.env.ACCOUNTABLE_LOCAL, undefined);
  });
});

describe('npm start', () => {
  test('serves on every address, on the port given', () => {
    const [command, args] = serveCommand(10000);
    assert.equal(command, 'uv');
    assert.deepEqual(args.slice(-5), ['backend.main:app', '--host', '0.0.0.0', '--port', '10000']);
  });
});
