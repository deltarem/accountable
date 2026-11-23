// `npm run check`: formatting, lint (with a complexity limit of 15), type
// checks, a secrets scan and every test suite with coverage. Runs them all,
// even after one fails, prints a summary, and exits with 1 if any failed.
//
//   npm run check          everything, including the end-to-end tests
//   npm run check:quick    the same without the end-to-end tests

import { SUITES, runSteps } from './test-all.mjs';

export const CHECKS = [
  ['check:format:frontend', 'Frontend formatting (Prettier)'],
  ['check:lint:frontend', 'Frontend lint (ESLint)'],
  ['check:types:frontend', 'Frontend types (tsc)'],
  ['check:format:backend', 'Backend formatting (ruff format)'],
  ['check:lint:backend', 'Backend lint (ruff check)'],
  ['check:types:backend', 'Backend types (ty)'],
  ['check:secrets', 'Secrets scan (gitleaks)'],
];

const quick = process.argv.includes('--quick');
const suites = quick ? SUITES.filter(([script]) => script !== 'test:e2e') : SUITES;
process.exit(runSteps([...CHECKS, ...suites], 'checks'));
