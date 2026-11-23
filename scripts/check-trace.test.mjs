// Tests that the traceability check catches each kind of gap.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkTrace } from './check-trace.mjs';

const criteria = Array.from({ length: 12 }, (_, i) => `| SC-${String(i + 1).padStart(2, '0')} | c | P1 | x |`).join('\n');
const spec = 'Rule `DEC-01` and `API-17`.';
const plan = (rows) => `# Plan\n\n## Traceability\n\n| ID | Requirement | Phase | Proof |\n|---|---|---|---|\n${rows}\n${criteria}\n`;

test('passes when every ID has a full row', () => {
  const result = checkTrace(spec, plan('| DEC-01 | a | P1 | t |\n| API-17 | b | P2 | t |'));
  assert.deepEqual(result.problems, []);
});

test('fails on a spec ID with no row', () => {
  const { problems } = checkTrace(spec, plan('| DEC-01 | a | P1 | t |'));
  assert.ok(problems.some((p) => p.startsWith('API-17 is in docs/spec.md')));
});

test('fails on a row the spec does not have', () => {
  const { problems } = checkTrace(spec, plan('| DEC-01 | a | P1 | t |\n| API-17 | b | P2 | t |\n| DEC-99 | z | P1 | t |'));
  assert.ok(problems.some((p) => p.startsWith('DEC-99 is in Traceability')));
});

test('fails on a row with no phase or no proof', () => {
  const { problems } = checkTrace(spec, plan('| DEC-01 | a |  | t |\n| API-17 | b | P2 |  |'));
  assert.ok(problems.includes('DEC-01 has no phase'));
  assert.ok(problems.includes('API-17 has no proof'));
});

test('reads rows from more than one change plan', () => {
  const later = '# Plan\n\n## Traceability\n\n| ID | Requirement | Phase | Proof |\n|---|---|---|---|\n| API-17 | b | P1 | t |\n';
  const result = checkTrace(spec, [plan('| DEC-01 | a | P1 | t |'), later]);
  assert.deepEqual(result.problems, []);
});
