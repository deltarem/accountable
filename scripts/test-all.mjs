// `npm test`: runs every test suite in order, even after one fails, prints a
// summary, and exits with 1 if any suite failed (RUN-04).
//
//   npm test                                  all suites
//   node scripts/test-all.mjs test:backend    only the named suites
//
// `scripts/check.mjs` reuses SUITES and runSteps.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const SUITES = [
  ['test:trace', 'Traceability check'],
  ['test:scripts', 'Script tests (node --test)'],
  ['test:backend', 'Backend unit tests with coverage (pytest)'],
  ['test:frontend', 'Frontend unit tests with coverage (Vitest)'],
  ['test:e2e', 'End-to-end tests (Playwright)'],
];

// Runs each [npm script, label] in order, keeps going after a failure, prints
// a PASS/FAIL summary and returns the process exit code.
export function runSteps(steps, noun = 'suites') {
  const results = [];
  for (const [script, label] of steps) {
    console.log(`\n=== ${label}: npm run ${script} ===\n`);
    const started = Date.now();
    const run = spawnSync('npm', ['run', script], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
    const seconds = Math.round((Date.now() - started) / 1000);
    results.push({ label, passed: run.status === 0, seconds });
  }

  console.log('\n=== Summary ===');
  for (const r of results) console.log(`${r.passed ? 'PASS' : 'FAIL'}  ${r.label} (${r.seconds}s)`);
  const failed = results.filter((r) => !r.passed);
  if (failed.length) {
    console.log(`\n${failed.length} of ${results.length} ${noun} failed.`);
    return 1;
  }
  console.log(`\nAll ${results.length} ${noun} passed.`);
  return 0;
}

function main() {
  const wanted = process.argv.slice(2);
  const unknown = wanted.filter((name) => !SUITES.some(([script]) => script === name));
  if (unknown.length) {
    console.error(`Unknown suite: ${unknown.join(', ')}. Choose from ${SUITES.map(([s]) => s).join(', ')}.`);
    process.exit(2);
  }
  const suites = wanted.length ? SUITES.filter(([script]) => wanted.includes(script)) : SUITES;
  process.exit(runSteps(suites));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
