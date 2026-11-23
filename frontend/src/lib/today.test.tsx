import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, test } from 'vitest';

import { mockFetch } from '../test/utils';
import { toDateTimeInput, useTodayValue } from './today';

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useTodayValue (DEC-12)', () => {
  test("today and now come from the server, not the browser's clock", async () => {
    mockFetch({ '/api/today': { today: '2026-11-23', now: '2026-11-23T14:05:00' } });
    const { result } = renderHook(() => useTodayValue(), { wrapper });
    expect(result.current).toEqual({ today: undefined, now: undefined });
    await waitFor(() => expect(result.current.today).toBe('2026-11-23'));
    expect(result.current.now).toBe('2026-11-23T14:05:00');
  });
});

test('toDateTimeInput gives the value a datetime-local input expects', () => {
  expect(toDateTimeInput('2026-11-23T14:05:00')).toBe('2026-11-23T14:05');
  expect(toDateTimeInput(undefined)).toBe('');
});
