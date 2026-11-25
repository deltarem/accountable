// Tests for the coding agent's hooks in .claude/hooks: the .env guard (RUN-09)
// the check that runs when the agent finishes a turn (RUN-08) and the reviewer
// subagent's read-only shell (RUN-10).

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { failureReport } from '../.claude/hooks/check-on-stop.mjs';
import { blockReason } from '../.claude/hooks/protect-env.mjs';
import { blockReason as reviewerBlockReason, readOnlyProblem } from '../.claude/hooks/reviewer-read-only.mjs';

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

test('the reviewer may run commands that only read', () => {
  for (const command of [
    'git diff main...HEAD',
    'git --no-pager diff --stat main...HEAD',
    'git log --oneline -10',
    'git log --format="%h > %s" --grep "Deploy: harness improved"',
    'git show HEAD --stat',
    'git grep -n useTheme -- frontend',
    'git branch --show-current',
    'git branch -a',
    'git status --short',
    'git diff main 2>/dev/null',
    'git log -5 2>&1 | head -20',
    "grep -rn 'TODO' backend | head -20",
    'cat docs/REVIEW.md',
    'cd frontend && git diff --stat',
    'find . -name "*.py" -not -path "./.venv/*"',
    'ls docs/changes; git log -1',
    'rg -n "fetch\\(" frontend/src | sort | head',
  ]) {
    assert.equal(readOnlyProblem(command), null, command);
  }
});

test('the reviewer may not run commands that write or run other programs', () => {
  for (const command of [
    'git commit -m x',
    'git checkout main',
    'git switch -c x',
    'git stash',
    'git reset --hard',
    'git push',
    'git branch new-branch',
    'git branch -D old',
    'git tag v1',
    'git -c core.pager=less log',
    'git diff --output=out.txt',
    'git grep -O foo',
    'echo x > notes.md',
    'cat a >> b',
    'git diff | tee out.txt',
    'rm -rf frontend',
    'npm test',
    'node -e "1"',
    "sed -i 's/a/b/' f",
    'X=1 git log',
    'find . -name "*.tmp" -delete',
    'find . -exec rm {} \\;',
    'sort -o out.txt in.txt',
    'rg --pre cat foo',
    'git log $(rm x)',
    'git log "$(rm x)"',
    'git log `rm x`',
    '(rm x)',
    'git log && rm x',
    'cat < input',
    "git log --grep 'open",
  ]) {
    assert.notEqual(readOnlyProblem(command), null, command);
  }
});

test('the reviewer hook blocks PowerShell, judges Bash and ignores the other tools', () => {
  assert.match(reviewerBlockReason('PowerShell', { command: 'git log' }), /Bash/);
  assert.match(reviewerBlockReason('Bash', { command: 'git commit -m x' }), /only reads/);
  assert.equal(reviewerBlockReason('Bash', { command: 'git log' }), null);
  assert.equal(reviewerBlockReason('Read', { file_path: 'docs/spec.md' }), null);
});

test('the reviewer hook denies through Claude Code and lets reads through silently', () => {
  const hook = path.join(ROOT, '.claude', 'hooks', 'reviewer-read-only.mjs');
  const run = (command) =>
    spawnSync('node', [hook], {
      input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
      encoding: 'utf8',
    });
  const denied = run('git push');
  assert.equal(denied.status, 0);
  assert.equal(JSON.parse(denied.stdout).hookSpecificOutput.permissionDecision, 'deny');
  const allowed = run('git diff');
  assert.equal(allowed.status, 0);
  assert.equal(allowed.stdout, '');
});
