import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Tooltip from '@radix-ui/react-tooltip';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';

import { Toaster } from '../components/Toaster';

type Handler = unknown | ((init?: RequestInit) => unknown | Promise<unknown>);

/**
 * Replaces fetch: each key is "GET /api/path" (or just "/api/path" for GET),
 * and its value is the JSON to answer with, or a function returning it.
 * A value of `new Promise(() => {})` never answers, for loading states.
 */
export function mockFetch(routes: Record<string, Handler>) {
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = (init?.method ?? 'GET').toUpperCase();
    const handler = routes[`${method} ${url}`] ?? (method === 'GET' ? routes[url] : undefined);
    if (handler === undefined) {
      return new Response(JSON.stringify({ detail: `No mock for ${method} ${url}` }), { status: 404 });
    }
    const body = typeof handler === 'function' ? await (handler as (i?: RequestInit) => unknown)(init) : await handler;
    if (body instanceof Response) return body;
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <Tooltip.Provider>
          <Toaster>
            <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
          </Toaster>
        </Tooltip.Provider>
      </QueryClientProvider>,
    ),
  };
}
