import { act, screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';

import { giveChartsASize } from './test/chartSize';
import { makeDashboard } from './test/dashboardFixtures';
import { TEST_ME, keepSignedIn } from './test/session';
import { mockFetch } from './test/utils';

// Importing main loads every page module inside the test, which can take a few
// seconds on a cold run, hence the longer timeout.
test('main mounts the whole app into #root, opening on the dashboard', async () => {
  giveChartsASize();
  keepSignedIn();
  mockFetch({ '/api/me': TEST_ME, '/api/dashboard': makeDashboard() });
  const root = document.createElement('div');
  root.id = 'root';
  document.body.append(root);

  await act(async () => {
    await import('./main');
  });

  const inRoot = within(root);
  expect(await inRoot.findByRole('navigation', { name: 'Sections' })).toBeTruthy();
  expect(inRoot.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeTruthy();
  expect((await inRoot.findByTestId('open-pipeline')).textContent).toBe('$1.130.000');
  expect(screen.getByText('Monday, 23 Nov 2026')).toBeTruthy();
}, 30_000);
