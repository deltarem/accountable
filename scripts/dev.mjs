// The one-command start (DEC-03, RUN-02). No dependencies of its own.
//
//   npm run dev
//
// Installs Node packages when needed, starts the backend (uvicorn) and the
// frontend (Vite), and prints the address. Ctrl+C stops both, and so does a
// "stop" message from a parent process.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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

export function portIsFree(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, host);
  });
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

async function waitForApp(url, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

export async function main() {
  const backendPort = Number(process.env.BACKEND_PORT || 8000);
  const frontendPort = Number(process.env.FRONTEND_PORT || 5173);

  if (needsInstall(ROOT)) {
    console.log('Installing Node packages (first run only)...');
    const result = spawnSync('npm', ['install'], { cwd: ROOT, stdio: 'inherit', shell: IS_WINDOWS });
    if (result.status !== 0) {
      console.error('npm install failed. Check the messages above, then run npm run dev again.');
      process.exit(1);
    }
  }

  for (const [name, port, envName] of [
    ['backend', backendPort, 'BACKEND_PORT'],
    ['frontend', frontendPort, 'FRONTEND_PORT'],
  ]) {
    if (!(await portIsFree(port))) {
      console.error(
        `Port ${port} is already in use, so the ${name} can't start. ` +
          `Stop whatever is using it, or set ${envName} to another port.`,
      );
      process.exit(1);
    }
  }

  const env = { ...process.env, BACKEND_PORT: String(backendPort), FRONTEND_PORT: String(frontendPort) };
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
  if (await waitForApp(`${address}/api/today`, 120_000)) {
    console.log(`\nAccountable is running. Open ${address} in your browser. Press Ctrl+C to stop.\n`);
    if (process.send) process.send('ready');
  } else if (!stopping) {
    console.error(`Accountable didn't start within 2 minutes. Check the messages above.`);
    await shutdown(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
