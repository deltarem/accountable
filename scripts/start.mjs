// `npm start`: the built app, the way Render runs it (RUN-14, RUN-15, ARC-18).
//
// One uvicorn process serves the API and the built frontend (frontend/dist/, made
// by `npm run build`) on 0.0.0.0 and the port in PORT (8000 if unset). The
// backend runs any missing migrations before it takes requests. It uses Supabase,
// with the settings from the environment (Render) or .env (this computer).

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { ROOT, settingsProblem, supabaseEnv } from './env.mjs';

/** The command that serves the app, for the port given. */
export function serveCommand(port) {
  return ['uv', ['run', '--frozen', '--no-dev', 'uvicorn', 'backend.main:app', '--host', '0.0.0.0', '--port', String(port)]];
}

export function main() {
  const env = supabaseEnv(process.env);
  const problem = settingsProblem(env, 'npm start');
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
  if (!existsSync(path.join(ROOT, 'frontend', 'dist', 'index.html'))) {
    console.error('There is no built frontend yet. Run npm run build first, then npm start.');
    process.exit(1);
  }
  const port = Number(env.PORT || 8000);
  const [command, args] = serveCommand(port);
  console.log(`Starting Accountable on port ${port}, using Supabase.`);
  const child = spawn(command, args, { cwd: ROOT, env, stdio: 'inherit', shell: process.platform === 'win32' });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.on('exit', (code) => process.exit(code ?? 1));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
