// The traceability check: runs first in `npm test`.
//
// Fails if an ID in docs/spec.md has no row in docs/plan.md's Traceability
// section, if a row names an ID the spec doesn't have (SC-01 to SC-12 are the
// intent's success criteria), or if a row has no phase or no proof.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ID = /`([A-Z]+(?:-[A-Z]+)?-\d{2})`/g;

export function specIds(specText) {
  return new Set([...specText.matchAll(ID)].map((m) => m[1]));
}

export function traceRows(planText) {
  const start = planText.indexOf('\n## Traceability');
  if (start < 0) return [];
  const section = planText.slice(start);
  const rows = [];
  for (const line of section.split('\n')) {
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 4) continue;
    if (!/^[A-Z]+(?:-[A-Z]+)?-\d{2}$/.test(cells[0])) continue;
    rows.push({ id: cells[0], requirement: cells[1], phase: cells[2], proof: cells[3] });
  }
  return rows;
}

export function checkTrace(specText, planText) {
  const ids = specIds(specText);
  const rows = traceRows(planText);
  const problems = [];
  const rowIds = new Set();
  for (const row of rows) {
    if (rowIds.has(row.id)) problems.push(`${row.id} has more than one row in Traceability`);
    rowIds.add(row.id);
    const isCriterion = /^SC-(0[1-9]|1[0-2])$/.test(row.id);
    if (!ids.has(row.id) && !isCriterion) problems.push(`${row.id} is in Traceability but not in docs/spec.md`);
    if (!row.phase) problems.push(`${row.id} has no phase`);
    if (!row.proof) problems.push(`${row.id} has no proof`);
  }
  for (const id of ids) {
    if (!rowIds.has(id)) problems.push(`${id} is in docs/spec.md but has no row in Traceability`);
  }
  for (let n = 1; n <= 12; n++) {
    const id = `SC-${String(n).padStart(2, '0')}`;
    if (!rowIds.has(id)) problems.push(`${id} (success criterion ${n}) has no row in Traceability`);
  }
  return { problems, idCount: ids.size, rowCount: rows.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const spec = readFileSync(path.join(ROOT, 'docs', 'spec.md'), 'utf8');
  const plan = readFileSync(path.join(ROOT, 'docs', 'plan.md'), 'utf8');
  const { problems, idCount, rowCount } = checkTrace(spec, plan);
  if (problems.length) {
    console.error('Traceability check failed:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`Traceability check passed: ${idCount} spec IDs, ${rowCount} rows.`);
}
