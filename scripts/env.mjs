// The settings for the Node scripts (ARC-17, RUN-13). No dependencies of its own:
// Node's util.parseEnv reads the .env file.
//
// Only these scripts read .env; the backend reads its environment and nothing
// else. So the test runners, which don't go through these scripts, never see the
// team's settings (ARC-14).

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ENV_FILE = path.join(ROOT, '.env');

/** The three settings `npm run dev`, `npm start` and Render need. */
export const TEAM_SETTINGS = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'];

/** The values in a .env file, or none when there's no file. */
export function readEnvFile(file = ENV_FILE) {
  return existsSync(file) ? { ...parseEnv(readFileSync(file, 'utf8')) } : {};
}

/**
 * The environment with the .env file's values added. A variable already in the
 * environment wins, as on Render, where the settings are entered in its dashboard.
 */
export function withEnvFile(env = process.env, file = ENV_FILE) {
  return { ...readEnvFile(file), ...env };
}

/** The team settings that are missing or empty. */
export function missingSettings(env) {
  return TEAM_SETTINGS.filter((name) => !(env[name] ?? '').trim());
}

/** What to say when settings are missing, or null when they're all there. */
export function settingsProblem(env, command = 'npm run dev') {
  const missing = missingSettings(env);
  if (missing.length === 0) return null;
  return [
    `${command} needs ${missing.join(', ')} in .env, and ${missing.length === 1 ? "it's" : "they're"} missing or empty.`,
    'Copy .env.example to .env and fill it in from your Supabase project (it says where each value is),',
    'or run npm run dev:local to work offline with the built-in test user.',
  ].join('\n');
}

/**
 * The environment for local mode (RUN-12, DEC-19): SQLite and the built-in test
 * user. The team settings are left out, so nothing can reach Supabase even when
 * the shell or .env has them.
 */
export function localEnv(env = process.env) {
  const local = { ...env, ACCOUNTABLE_LOCAL: '1' };
  for (const name of TEAM_SETTINGS) delete local[name];
  return local;
}

/** The environment for Supabase: the .env file's values added, local mode off. */
export function supabaseEnv(env = process.env, file = ENV_FILE) {
  const merged = withEnvFile(env, file);
  delete merged.ACCOUNTABLE_LOCAL;
  return merged;
}
