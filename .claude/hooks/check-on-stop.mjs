// Claude Code Stop hook (RUN-08): when the agent finishes a turn, run
// `npm run check:quick`. If it fails, block the stop once and send the failing
// steps' output back to the agent to fix. When the agent stops again after
// that, Claude Code sets `stop_hook_active`, and this hook lets it stop, so it
// can never loop.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const LINES_PER_STEP = 60;

// scripts/test-all.mjs starts each step with "=== <label>: npm run <script> ==="
// and ends with "PASS  <label> (Ns)" or "FAIL  <label> (Ns)" lines. Returns the
// last lines of each failed step's output, so the agent sees what broke without
// the whole log.
export function failureReport(output) {
  const lines = output.split(/\r?\n/);
  const failed = new Set(
    lines.filter((line) => line.startsWith('FAIL  ')).map((line) => line.slice(6).replace(/ \(\d+s\)$/, '')),
  );
  const sections = [];
  let current = null;
  for (const line of lines) {
    const header = line.match(/^=== (.+): npm run \S+ ===$/);
    if (header || line === '=== Summary ===') {
      current = header && failed.has(header[1]) ? { header: line, body: [] } : null;
      if (current) sections.push(current);
    } else if (current) {
      current.body.push(line);
    }
  }
  const parts = sections.map(({ header, body }) => {
    const trimmed = body.join('\n').trim().split('\n');
    const shown = trimmed.slice(-LINES_PER_STEP);
    const cut = trimmed.length > shown.length ? `(last ${shown.length} of ${trimmed.length} lines)\n` : '';
    return `${header}\n${cut}${shown.join('\n')}`;
  });
  const summary = output.slice(output.lastIndexOf('=== Summary ===')).trim();
  return [...parts, summary].join('\n\n');
}

function main() {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  if (input.stop_hook_active) return;

  // One command string through the shell, so `npm` resolves to npm.cmd on
  // Windows. 2>&1 keeps each tool's errors inside its own step's output.
  const run = spawnSync('npm run check:quick 2>&1', {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    shell: true,
  });
  if (run.status === 0) return;

  const reason = run.error
    ? `npm run check:quick could not run: ${run.error.message}`
    : `npm run check:quick failed. Find the root cause of each failure below and fix it, then run npm run check:quick again.\n\n${failureReport(run.stdout)}`;
  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
