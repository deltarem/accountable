import { execFileSync } from 'node:child_process';

import { E2E_ENV } from '../playwright.config';

// Local mode, like the servers: it refuses Postgres, so this can only ever reset
// the end-to-end SQLite file (DEC-19).
const ENV = { ...process.env, ...E2E_ENV };

function runSeed(args: string[]) {
  execFileSync('uv', ['run', 'python', '-m', 'backend.seed', ...args], {
    env: ENV,
    stdio: 'pipe',
    shell: process.platform === 'win32',
  });
}

/** Reset the end-to-end database to the sample data. */
export function reseed() {
  runSeed([]);
}

/** Reset the end-to-end database to no data at all. */
export function empty() {
  runSeed(['--empty']);
}
