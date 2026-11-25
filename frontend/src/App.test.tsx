import { QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, test } from 'vitest';

import { App, makeQueryClient } from './App';
import { useDeals } from './api/hooks';
import { createMemoryRouter } from 'react-router';

import { routes } from './routes';
import { giveChartsASize } from './test/chartSize';
import { makeDashboard } from './test/dashboardFixtures';
import { TEST_ME, keepSignedIn } from './test/session';
import { mockFetch } from './test/utils';

function withClient(client = makeQueryClient()) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const serverError = () => new Response(JSON.stringify({ detail: 'Busy' }), { status: 503 });

describe('App', () => {
  test('opens on the dashboard inside the shell, riding out one failed load', async () => {
    giveChartsASize();
    keepSignedIn();
    let calls = 0;
    mockFetch({
      '/api/me': TEST_ME,
      '/api/dashboard': () => {
        calls += 1;
        return calls === 1 ? serverError() : makeDashboard();
      },
    });
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect((await screen.findByTestId('open-pipeline', {}, { timeout: 4000 })).textContent).toBe('$1.130.000');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(calls).toBe(2);
  });
});

describe('signed out (UI-AUTH-02)', () => {
  test('any address shows the sign-in screen and nothing of the app', async () => {
    const spy = mockFetch({});
    const router = createMemoryRouter(routes, { initialEntries: ['/deals/12'] });
    render(<App router={router} />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in to Accountable' })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Sections' })).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toBe('/deals/12');
  });

  test('signing in opens the page that was asked for', async () => {
    mockFetch({
      'POST /api/local/sign-in': { access_token: 'local-token', user: TEST_ME },
      '/api/me': TEST_ME,
      '/api/deals/12': new Promise(() => {}),
      '/api/today': { today: '2026-11-23', now: '2026-11-23T14:00:00' },
    });
    const router = createMemoryRouter(routes, { initialEntries: ['/deals/12'] });
    render(<App router={router} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('navigation', { name: 'Sections' })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/deals/12');
  });

  test('a 401 from the API ends the session with a message, at the same address', async () => {
    keepSignedIn();
    mockFetch({
      '/api/me': TEST_ME,
      '/api/deals': () => new Response(JSON.stringify({ detail: 'Sign in to continue' }), { status: 401 }),
      '/api/today': { today: '2026-11-23', now: '2026-11-23T14:00:00' },
    });
    const router = createMemoryRouter(routes, { initialEntries: ['/deals'] });
    render(<App router={router} />);
    expect(await screen.findByText('Your session has ended. Sign in again.')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in to Accountable' })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/deals');
    expect(localStorage.length).toBe(0);
  });
});

describe('makeQueryClient', () => {
  test('a read that keeps failing is tried twice, then reported', async () => {
    const spy = mockFetch({ '/api/deals': serverError });
    const { result } = renderHook(() => useDeals(), { wrapper: withClient() });
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 4000 });
    expect(spy).toHaveBeenCalledTimes(2);
    expect(result.current.error?.message).toBe('Busy');
  });

  test('a save is never retried, so nothing is sent twice', async () => {
    const client = makeQueryClient();
    const spy = mockFetch({ 'POST /api/deals': serverError });
    const mutation = client.getMutationCache().build(client, {
      mutationFn: () => fetch('/api/deals', { method: 'POST' }).then((r) => (r.ok ? r : Promise.reject(r))),
    });
    await mutation.execute(undefined).catch(() => undefined);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test("coming back to the tab loads again, so other people's changes show (DEC-20)", async () => {
    const client = makeQueryClient();
    const spy = mockFetch({ '/api/deals': [] });
    const { result } = renderHook(() => useDeals(), { wrapper: withClient(client) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('data stays fresh for a few seconds, so moving between pages does not refetch at once', async () => {
    const client = makeQueryClient();
    const spy = mockFetch({ '/api/deals': [] });
    const first = renderHook(() => useDeals(), { wrapper: withClient(client) });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    first.unmount();
    const second = renderHook(() => useDeals(), { wrapper: withClient(client) });
    expect(second.result.current.data).toEqual([]);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
