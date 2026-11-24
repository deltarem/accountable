// Tests for the coding agent's hooks in .claude/hooks: the .env guard (RUN-09)
// and the check that runs when the agent finishes a turn (RUN-08).

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { failureReport } from '../.claude/hooks/check-on-stop.mjs';
import { blockReason } from '../.claude/hooks/protect-env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('blocks the file tools on .env and .env.* in any folder', () => {
  for (const file_path of ['.env', 'C:\\repo\\.env', '/repo/backend/.env.local', 'frontend/.env.production']) {
    assert.match(blockReason('Edit', { file_path }), /blocked/, file_path);
    assert.match(blockReason('Write', { file_path }), /blocked/, file_path);
  }
  assert.match(blockReason('NotebookEdit', { notebook_path: '.env' }), /blocked/);
});

test('lets the file tools change .env.example and other files', () => {
  for (const file_path of ['.env.example', 'frontend/.env.example', '.envrc', 'package.json', 'docs/env.md']) {
    assert.equal(blockReason('Edit', { file_path }), null, file_path);
  }
});

test('blocks shell commands that name .env', () => {
  for (const command of ['echo X=1 >> .env', 'cp .env.example .env', 'cat backend/.env.local', 'Set-Content .\\.env "X=1"']) {
    assert.match(blockReason(command.startsWith('Set') ? 'PowerShell' : 'Bash', { command }), /blocked/, command);
  }
});

test('lets shell commands through that only look like .env', () => {
  for (const command of ['cat .env.example', 'node -e "console.log(process.env.HOME)"', '$env:X = 1', 'cat .gitleaks.toml']) {
    assert.equal(blockReason('Bash', { command }), null, command);
  }
});

test('the stop hook lets the agent stop when it was already blocked once', () => {
  const hook = path.join(ROOT, '.claude', 'hooks', 'check-on-stop.mjs');
  const run = spawnSync('node', [hook], { input: JSON.stringify({ stop_hook_active: true }), encoding: 'utf8' });
  assert.equal(run.status, 0);
  assert.equal(run.stdout, '');
});

test('the failure report keeps only the failed steps and the summary', () => {
  const output = [
    '=== Frontend formatting (Prettier): npm run check:format:frontend ===',
    '[warn] src/hooktest.ts',
    '=== Backend lint (ruff check): npm run check:lint:backend ===',
    'All checks passed!',
    '=== Summary ===',
    'FAIL  Frontend formatting (Prettier) (3s)',
    'PASS  Backend lint (ruff check) (1s)',
    '',
    '1 of 2 checks failed.',
  ].join('\n');
  const report = failureReport(output);
  assert.match(report, /src\/hooktest\.ts/);
  assert.doesNotMatch(report, /All checks passed/);
  assert.match(report, /1 of 2 checks failed\./);
});
