import { execFileSync } from 'node:child_process';

const ENV = {
  ...process.env,
  ACCOUNTABLE_DB: 'data/e2e.db',
  ACCOUNTABLE_TODAY: '2026-11-23',
};

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
