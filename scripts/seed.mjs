// `npm run seed`: reset the database to the sample data (RUN-03).
//
//   npm run seed                  the database npm run dev uses: Supabase when .env has
//                                 DATABASE_URL, which also needs -- --yes
//   npm run seed -- --local       the local SQLite file npm run dev:local uses
//   npm run seed -- --empty       no data at all, instead of the sample data
//
// It loads .env and hands over to backend/seed.py, which refuses Supabase
// without --yes, because that would wipe the team's data.

import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { ROOT, localEnv, supabaseEnv } from './env.mjs';

/** The environment and the arguments for backend/seed.py. */
export function seedRun(args, env = process.env) {
  const local = args.includes('--local');
  return {
    env: local ? localEnv(env) : supabaseEnv(env),
    args: args.filter((a) => a !== '--local'),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const run = seedRun(process.argv.slice(2));
  const result = spawnSync('uv', ['run', 'python', '-m', 'backend.seed', ...run.args], {
    cwd: ROOT,
    env: run.env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  process.exit(result.status ?? 1);
}
