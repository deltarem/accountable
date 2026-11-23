import { QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, test } from 'vitest';

import { App, makeQueryClient } from './App';
import { useDeals } from './api/hooks';
import { giveChartsASize } from './test/chartSize';
import { makeDashboard } from './test/dashboardFixtures';
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
    let calls = 0;
    mockFetch({
      '/api/dashboard': () => {
        calls += 1;
        return calls === 1 ? serverError() : makeDashboard();
      },
    });
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect((await screen.findByTestId('open-pipeline', {}, { timeout: 4000 })).textContent).toBe('$1.130.000');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(calls).toBe(2);
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
