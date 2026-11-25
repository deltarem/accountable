import { defineConfig } from '@playwright/test';

// The end-to-end tests start their own servers on ports 8100 and 5273, with
// their own database and the clock fixed to 23 Nov 2026, 14:00, so your data is
// never touched (ARC-14, RUN-04). The time is fixed too, so the sample data and
// every screen look the same on each run, which the light mode comparison needs.
export const E2E_ENV = {
  ACCOUNTABLE_DB: 'data/e2e.db',
  ACCOUNTABLE_TODAY: '2026-11-23T14:00:00',
  BACKEND_PORT: '8100',
  FRONTEND_PORT: '5273',
};

export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 5_000 },
  // CI also writes an HTML report to playwright-report/, which the workflow
  // uploads when the run fails.
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://127.0.0.1:5273',
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'uv run uvicorn backend.main:app --host 127.0.0.1 --port 8100',
      url: 'http://127.0.0.1:8100/api/today',
      env: E2E_ENV,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npm run dev --workspace frontend',
      url: 'http://127.0.0.1:5273',
      env: E2E_ENV,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
