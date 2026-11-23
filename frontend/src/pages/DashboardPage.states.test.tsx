import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { giveChartsASize } from '../test/chartSize';
import { followUp, makeDashboard } from '../test/dashboardFixtures';
import { mockFetch, renderWithProviders } from '../test/utils';
import { DashboardPage } from './DashboardPage';

beforeEach(() => giveChartsASize(600, 232));

describe('DashboardPage', () => {
  test('a failed load shows an error with Try again, which loads the dashboard (UI-ERR-01)', async () => {
    let calls = 0;
    mockFetch({
      '/api/dashboard': () => {
        calls += 1;
        return calls === 1 ? new Response(JSON.stringify({ detail: 'Down' }), { status: 500 }) : makeDashboard();
      },
    });
    renderWithProviders(<DashboardPage />);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(
      "Couldn't load the dashboard. Check that Accountable is running, then try again.",
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeTruthy();

    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect((await screen.findByTestId('open-pipeline')).textContent).toBe('$1.130.000');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(calls).toBe(2);
  });

  test('the follow-ups panel counts what is to do and lists it', async () => {
    mockFetch({
      '/api/dashboard': makeDashboard({
        follow_ups: [
          followUp({ id: 1, key: 'a-1', group: 'overdue', description: 'Chase', follow_up_date: '2026-11-20' }),
          followUp({ id: 2, key: 'a-2', group: 'today', description: 'Call' }),
        ],
      }),
    });
    renderWithProviders(<DashboardPage />);
    expect(await screen.findByText('2 to do')).toBeTruthy();
    expect(screen.getAllByTestId('follow-up')).toHaveLength(2);
  });

  test('a pipeline-by-stage row opens the pipeline (UI-DASH-04)', async () => {
    mockFetch({ '/api/dashboard': makeDashboard() });
    renderWithProviders(
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/pipeline" element={<p>Pipeline board</p>} />
      </Routes>,
    );
    await userEvent.click(await screen.findByTestId('stage-row-proposal'));
    expect(screen.getByText('Pipeline board')).toBeTruthy();
  });
});
