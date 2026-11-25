// The one-command start (DEC-03, DEC-22, RUN-02, RUN-12). No dependencies of its own.
//
//   npm run dev         against Supabase, with the settings in .env
//   npm run dev:local   offline, on the local SQLite file, as the built-in test user
//
// Installs Node packages when needed, starts the backend (uvicorn) and the
// frontend (Vite), and prints the address. Ctrl+C stops both, and so does a
// "stop" message from a parent process.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { ROOT, localEnv, settingsProblem, supabaseEnv } from './env.mjs';

const IS_WINDOWS = process.platform === 'win32';

/** True when node_modules is missing or older than package-lock.json. */
export function needsInstall(dir) {
  const modules = path.join(dir, 'node_modules');
  if (!existsSync(modules)) return true;
  const lock = path.join(dir, 'package-lock.json');
  if (!existsSync(lock)) return false;
  // npm writes node_modules/.package-lock.json on every install.
  const marker = path.join(modules, '.package-lock.json');
  const installed = statSync(existsSync(marker) ? marker : modules).mtimeMs;
  return statSync(lock).mtimeMs > installed;
}

/** null when the port can be used, otherwise the error code (EADDRINUSE, EACCES...). */
export function portProblem(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (error) => resolve(error.code ?? 'ERROR'));
    server.once('listening', () => server.close(() => resolve(null)));
    server.listen(port, host);
  });
}

export async function portIsFree(port, host = '127.0.0.1') {
  return (await portProblem(port, host)) === null;
}

function start(command, args, env) {
  const child = spawn(command, args, {
    cwd: ROOT,
    env,
    stdio: 'inherit',
    shell: IS_WINDOWS,
    // Elsewhere, a process group lets us stop the child and everything it started.
    detached: !IS_WINDOWS,
  });
  return child;
}

function stopTree(child) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null || child.signalCode !== null) return resolve();
    child.once('exit', () => resolve());
    try {
      if (IS_WINDOWS) {
        spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        process.kill(-child.pid, 'SIGTERM');
      }
    } catch {
      resolve();
    }
    setTimeout(resolve, 5000).unref();
  });
}

/**
 * Waits until the URL answers. `signedOut` counts a 401 as an answer: every API
 * route refuses until someone signs in (AUTH-01), but a 401 means the server is up.
 */
async function waitFor(url, timeoutMs, { signedOut = false } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok || (signedOut && response.status === 401)) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

export async function main({ local = false } = {}) {
  const command = local ? 'npm run dev:local' : 'npm run dev';
  const backendPort = Number(process.env.BACKEND_PORT || 8000);
  const frontendPort = Number(process.env.FRONTEND_PORT || 5173);

  if (needsInstall(ROOT)) {
    console.log('Installing Node packages (first run only)...');
    const result = spawnSync('npm', ['install'], { cwd: ROOT, stdio: 'inherit', shell: IS_WINDOWS });
    if (result.status !== 0) {
      console.error(`npm install failed. Check the messages above, then run ${command} again.`);
      process.exit(1);
    }
  }

  const settings = local ? localEnv(process.env) : supabaseEnv(process.env);
  const problem = local ? null : settingsProblem(settings, command);
  if (problem) {
    console.error(problem);
    process.exit(1);
  }

  for (const [name, port, envName] of [
    ['backend', backendPort, 'BACKEND_PORT'],
    ['frontend', frontendPort, 'FRONTEND_PORT'],
  ]) {
    const problem = await portProblem(port);
    if (problem) {
      // Windows can reserve whole port ranges (Hyper-V, WSL, Docker); binding
      // there fails with EACCES even though nothing is using the port.
      const why =
        problem === 'EADDRINUSE'
          ? `Port ${port} is already in use, so the ${name} can't start. Stop whatever is using it, or set`
          : problem === 'EACCES'
            ? `Port ${port} is blocked by the system, so the ${name} can't start (on Windows, see "netsh interface ipv4 show excludedportrange protocol=tcp"). Set`
            : `Port ${port} can't be used (${problem}), so the ${name} can't start. Set`;
      console.error(`${why} ${envName} to another port, for example: ${envName}=${port + 90} ${command}`);
      process.exit(1);
    }
  }

  const env = { ...settings, BACKEND_PORT: String(backendPort), FRONTEND_PORT: String(frontendPort) };
  const children = [
    start('uv', ['run', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', String(backendPort)], env),
    start('npm', ['run', 'dev', '--workspace', 'frontend'], env),
  ];

  let stopping = false;
  async function shutdown(code = 0) {
    if (stopping) return;
    stopping = true;
    console.log('\nStopping Accountable...');
    await Promise.all(children.map(stopTree));
    process.exit(code);
  }

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
  process.on('message', (message) => {
    if (message === 'stop') shutdown(0);
  });
  for (const child of children) {
    child.on('exit', (code) => {
      if (!stopping) {
        console.error(`A server stopped unexpectedly (exit code ${code}). Stopping the other one.`);
        shutdown(1);
      }
    });
  }

  const address = `http://127.0.0.1:${frontendPort}`;
  const up =
    (await waitFor(`http://127.0.0.1:${backendPort}/api/today`, 120_000, { signedOut: true })) &&
    (await waitFor(address, 30_000));
  if (up) {
    const mode = local
      ? `It's in local mode, on ${settings.ACCOUNTABLE_DB || 'data/accountable.db'}, signed in as the built-in test user (test@example.com, password accountable).`
      : `It's using Supabase (${new URL(settings.SUPABASE_URL).host}); sign in with your own email and password.`;
    console.log(`\nAccountable is running. Open ${address} in your browser. Press Ctrl+C to stop.\n${mode}\n`);
    if (process.send) process.send('ready');
  } else if (!stopping) {
    console.error(`Accountable didn't start within 2 minutes. Check the messages above.`);
    await shutdown(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main({ local: process.argv.includes('--local') });
}
