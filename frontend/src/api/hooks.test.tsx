import {
  QueryClient,
  QueryClientProvider,
  type UseMutationResult,
  type UseQueryResult,
  focusManager,
} from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, test } from 'vitest';

import type { ActivityPayload, ContactPayload, DealPayload, OrganizationPayload } from '../lib/schemas';
import { mockFetch } from '../test/utils';
import { ApiError } from './client';
import {
  fetchDeleteImpact,
  keys,
  useContact,
  useContacts,
  useDashboard,
  useDeal,
  useDeals,
  useDelete,
  useIndustries,
  useMoveDeal,
  useOrganization,
  useOrganizations,
  useSaveActivity,
  useSaveContact,
  useSaveDeal,
  useSaveOrganization,
  useSetDone,
  useToday,
} from './hooks';
import type { Deal } from './types';

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

/** Puts one cached query under every key, so a test can see which ones a save marks stale. */
function seedEveryKey(client: QueryClient) {
  const all = [
    keys.organizations,
    keys.organization(1),
    keys.contacts,
    keys.contact(1),
    keys.deals,
    keys.deal(1),
    keys.dashboard,
    keys.industries,
    keys.today,
  ];
  for (const key of all) client.setQueryData(key, []);
}

function staleKeys(client: QueryClient) {
  const names = client
    .getQueryCache()
    .getAll()
    .filter((q) => q.state.isInvalidated)
    .map((q) => String(q.queryKey[0]));
  return [...new Set(names)].sort();
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function deal(id: number, stage: Deal['stage'], position: number, extra: Partial<Deal> = {}): Deal {
  return {
    id,
    name: `Deal ${id}`,
    organization_id: 1,
    organization_name: 'Acme Ltd',
    contact_id: null,
    contact_name: null,
    stage,
    value_cents: 1_000_000,
    probability: 10,
    close_date: '2026-12-15',
    position,
    late: false,
    expected_cents: 100_000,
    created_at: '2026-11-01T10:00:00',
    updated_at: '2026-11-01T10:00:00',
    ...extra,
  };
}

const organization: OrganizationPayload = { name: 'Acme Ltd', website: null, industry: null, notes: null };
const contact: ContactPayload = {
  name: 'Maria Lopez',
  email: null,
  phone: null,
  job_title: null,
  organization_id: 1,
  status: 'lead',
};
const dealBody: DealPayload = {
  name: 'Renewal',
  organization_id: 1,
  contact_id: null,
  stage: 'new',
  value_cents: 1_000_000,
  probability: null,
  close_date: null,
};
const activity: ActivityPayload = {
  type: 'call',
  contact_id: 1,
  deal_id: null,
  description: 'Called',
  occurred_at: '2026-11-23T14:05',
  follow_up_date: null,
  follow_up_done: false,
};

const READS: [string, () => UseQueryResult<unknown>, string][] = [
  ['useOrganizations', () => useOrganizations(), '/api/organizations'],
  ['useOrganization', () => useOrganization(3), '/api/organizations/3'],
  ['useContacts', () => useContacts(), '/api/contacts'],
  ['useContact', () => useContact(4), '/api/contacts/4'],
  ['useDeals', () => useDeals(), '/api/deals'],
  ['useDeal', () => useDeal(5), '/api/deals/5'],
  ['useDashboard', () => useDashboard(), '/api/dashboard'],
  ['useIndustries', () => useIndustries(), '/api/industries'],
  ['useToday', () => useToday(), '/api/today'],
];

describe('reads', () => {
  test.each(READS)('%s reads %s', async (_name, hook, url) => {
    const spy = mockFetch({ [url]: { from: url } });
    const { wrapper } = setup();
    const { result } = renderHook(hook, { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ from: url });
    expect(spy).toHaveBeenCalledWith(url, expect.objectContaining({ method: 'GET' }));
  });

  test('a failed read surfaces the ApiError for the screen to show', async () => {
    mockFetch({ '/api/deals': () => new Response(JSON.stringify({ detail: 'Database is locked.' }), { status: 503 }) });
    const { wrapper } = setup();
    const { result } = renderHook(() => useDeals(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.message).toBe('Database is locked.');
  });

  test('industries are not fetched until the field needs them', () => {
    const spy = mockFetch({ '/api/industries': ['Hospitality'] });
    const { wrapper } = setup();
    const { result } = renderHook(() => useIndustries(false), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(spy).not.toHaveBeenCalled();
  });

  test('the dashboard is fetched again every time it opens, even when its data is fresh', async () => {
    const spy = mockFetch({ '/api/dashboard': { today: '2026-11-23' }, '/api/deals': [] });
    const { client, wrapper } = setup();
    client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity, staleTime: Infinity } });
    for (let i = 0; i < 2; i += 1) {
      const dashboard = renderHook(() => useDashboard(), { wrapper });
      const deals = renderHook(() => useDeals(), { wrapper });
      await waitFor(() => expect(dashboard.result.current.isSuccess && deals.result.current.isSuccess).toBe(true));
      dashboard.unmount();
      deals.unmount();
    }
    const urls = spy.mock.calls.map(([url]) => url);
    expect(urls.filter((u) => u === '/api/dashboard')).toHaveLength(2);
    expect(urls.filter((u) => u === '/api/deals')).toHaveLength(1);
  });

  test('today is read again when the window gets focus (DEC-12)', async () => {
    const spy = mockFetch({ '/api/today': { today: '2026-11-23', now: '2026-11-23T14:05:00' } });
    const { wrapper } = setup();
    const { result } = renderHook(() => useToday(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    focusManager.setFocused(undefined);
  });

  test('fetchDeleteImpact asks the delete-impact endpoint (UI-DEL-01)', async () => {
    const spy = mockFetch({ '/api/contacts/4/delete-impact': { name: 'Maria Lopez', activities: 2 } });
    await expect(fetchDeleteImpact('contacts', 4)).resolves.toEqual({ name: 'Maria Lopez', activities: 2 });
    expect(spy).toHaveBeenCalledWith('/api/contacts/4/delete-impact', expect.objectContaining({ method: 'GET' }));
  });
});

type Wrapper = ({ children }: { children: ReactNode }) => ReactNode;

/** Renders a save hook and runs one save with it. */
function saveWith<TData, TVars>(useHook: () => UseMutationResult<TData, Error, TVars>, vars: TVars) {
  return async (wrapper: Wrapper) => {
    const { result } = renderHook(() => useHook(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(vars);
    });
  };
}

describe('saves invalidate everything they affect (ARC-10)', () => {
  const cases = [
    {
      name: 'organization',
      body: organization,
      saveNew: saveWith(useSaveOrganization, { body: organization }),
      saveExisting: saveWith(useSaveOrganization, { id: 5, body: organization }),
      create: 'POST /api/organizations',
      update: 'PUT /api/organizations/5',
      stale: ['contact', 'contacts', 'dashboard', 'deal', 'deals', 'industries', 'organization', 'organizations'],
    },
    {
      name: 'contact',
      body: contact,
      saveNew: saveWith(useSaveContact, { body: contact }),
      saveExisting: saveWith(useSaveContact, { id: 5, body: contact }),
      create: 'POST /api/contacts',
      update: 'PUT /api/contacts/5',
      stale: ['contact', 'contacts', 'dashboard', 'deal', 'deals', 'organization', 'organizations'],
    },
    {
      name: 'deal',
      body: dealBody,
      saveNew: saveWith(useSaveDeal, { body: dealBody }),
      saveExisting: saveWith(useSaveDeal, { id: 5, body: dealBody }),
      create: 'POST /api/deals',
      update: 'PUT /api/deals/5',
      stale: ['contact', 'contacts', 'dashboard', 'deal', 'deals', 'organization', 'organizations'],
    },
    {
      name: 'activity',
      body: activity,
      saveNew: saveWith(useSaveActivity, { body: activity }),
      saveExisting: saveWith(useSaveActivity, { id: 5, body: activity }),
      create: 'POST /api/activities',
      update: 'PUT /api/activities/5',
      stale: ['contact', 'dashboard', 'deal', 'organization'],
    },
  ];

  test.each(cases)('a new $name is created with POST', async ({ saveNew, body, create, stale }) => {
    const spy = mockFetch({ [create]: { id: 9 } });
    const { client, wrapper } = setup();
    seedEveryKey(client);
    await saveNew(wrapper);
    const [method, url] = create.split(' ');
    expect(spy).toHaveBeenCalledWith(url, expect.objectContaining({ method, body: JSON.stringify(body) }));
    expect(staleKeys(client)).toEqual(stale);
  });

  test.each(cases)('an existing $name is updated with PUT', async ({ saveExisting, update }) => {
    const spy = mockFetch({ [update]: { id: 5 } });
    const { wrapper } = setup();
    await saveExisting(wrapper);
    const [method, url] = update.split(' ');
    expect(spy).toHaveBeenCalledWith(url, expect.objectContaining({ method }));
  });

  test('a save the server refuses marks nothing stale and keeps the field errors', async () => {
    mockFetch({
      'POST /api/deals': () =>
        new Response(JSON.stringify({ detail: 'Check the fields.', errors: { name: 'Enter a name.' } }), {
          status: 422,
        }),
    });
    const { client, wrapper } = setup();
    seedEveryKey(client);
    const { result } = renderHook(() => useSaveDeal(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ body: dealBody }).catch(() => undefined);
    });
    // The hook's error state arrives in TanStack Query's setTimeout batch, which
    // can land after mutateAsync rejects, so wait for it.
    await waitFor(() => expect(result.current.error).toBeInstanceOf(ApiError));
    expect((result.current.error as ApiError).fieldErrors).toEqual({ name: 'Enter a name.' });
    expect(staleKeys(client)).toEqual([]);
  });

  test('ticking a follow-up done posts the new state and refreshes timelines and the dashboard', async () => {
    const spy = mockFetch({ 'POST /api/activities/12/done': { id: 12 } });
    const { client, wrapper } = setup();
    seedEveryKey(client);
    const { result } = renderHook(() => useSetDone(), { wrapper });
    await act(() => result.current.mutateAsync({ id: 12, done: true }));
    expect(spy).toHaveBeenCalledWith('/api/activities/12/done', expect.objectContaining({ body: '{"done":true}' }));
    expect(staleKeys(client)).toEqual(['contact', 'dashboard', 'deal', 'organization']);
  });
});

describe('deletes', () => {
  test.each([
    ['organizations', 'organization', 'industries'],
    ['contacts', 'contact', 'contacts'],
    ['deals', 'deal', 'deals'],
  ] as const)(
    'deleting from %s drops that record from the cache, so its page does not refetch into a 404',
    async (kind, single, listed) => {
      const spy = mockFetch({ [`DELETE /api/${kind}/1`]: () => new Response(null, { status: 204 }) });
      const { client, wrapper } = setup();
      seedEveryKey(client);
      const { result } = renderHook(() => useDelete(kind), { wrapper });
      await act(() => result.current.mutateAsync(1));
      expect(spy).toHaveBeenCalledWith(`/api/${kind}/1`, expect.objectContaining({ method: 'DELETE' }));
      expect(client.getQueryData([single, 1])).toBeUndefined();
      expect(staleKeys(client)).toContain(listed);
      expect(staleKeys(client)).toContain('dashboard');
    },
  );

  test('deleting an activity keeps the record pages and refreshes them', async () => {
    mockFetch({ 'DELETE /api/activities/1': () => new Response(null, { status: 204 }) });
    const { client, wrapper } = setup();
    seedEveryKey(client);
    const { result } = renderHook(() => useDelete('activities'), { wrapper });
    await act(() => result.current.mutateAsync(1));
    expect(client.getQueryData(keys.deal(1))).toEqual([]);
    expect(client.getQueryData(keys.contact(1))).toEqual([]);
    expect(staleKeys(client)).toEqual(['contact', 'dashboard', 'deal', 'organization']);
  });
});

describe('moving a deal on the board (ARC-08)', () => {
  const board = () => [deal(1, 'new', 0), deal(2, 'new', 1), deal(3, 'proposal', 0, { probability: 50 })];

  test('the board updates at once, before the server answers', async () => {
    const server = deferred<Response>();
    const spy = mockFetch({ 'POST /api/deals/1/move': () => server.promise });
    const { client, wrapper } = setup();
    client.setQueryData(keys.deals, board());
    const { result } = renderHook(() => useMoveDeal('2026-11-23'), { wrapper });

    act(() => result.current.mutate({ id: 1, stage: 'proposal', index: 0 }));

    await waitFor(() => expect(client.getQueryData<Deal[]>(keys.deals)?.[0].stage).toBe('proposal'));
    const moved = client.getQueryData<Deal[]>(keys.deals)!;
    expect(moved.map((d) => [d.id, d.stage, d.position])).toEqual([
      [1, 'proposal', 0],
      [2, 'new', 0],
      [3, 'proposal', 1],
    ]);
    expect(moved[0].probability).toBe(50);
    expect(moved[0].expected_cents).toBe(500_000);
    expect(spy).toHaveBeenCalledWith(
      '/api/deals/1/move',
      expect.objectContaining({ body: '{"stage":"proposal","index":0}' }),
    );

    server.resolve(new Response(JSON.stringify(moved[0]), { status: 200 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(staleKeys(client)).toContain('deals');
  });

  test('if the server refuses, the board goes back to how it was and the reason is kept', async () => {
    const server = deferred<Response>();
    mockFetch({ 'POST /api/deals/1/move': () => server.promise });
    const { client, wrapper } = setup();
    const before = board();
    client.setQueryData(keys.deals, before);
    const { result } = renderHook(() => useMoveDeal('2026-11-23'), { wrapper });

    act(() => result.current.mutate({ id: 1, stage: 'won', index: 0 }));
    await waitFor(() => expect(client.getQueryData<Deal[]>(keys.deals)?.[0].stage).toBe('won'));
    expect(client.getQueryData<Deal[]>(keys.deals)?.[0].close_date).toBe('2026-11-23');

    server.resolve(new Response(JSON.stringify({ detail: 'This deal was deleted.' }), { status: 404 }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData(keys.deals)).toEqual(before);
    expect(result.current.error?.message).toBe('This deal was deleted.');
    expect(staleKeys(client)).toContain('deals');
  });

  test('a move before the board has loaded still reaches the server', async () => {
    const spy = mockFetch({ 'POST /api/deals/1/move': deal(1, 'qualified', 0) });
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useMoveDeal(undefined), { wrapper });
    await act(() => result.current.mutateAsync({ id: 1, stage: 'qualified', index: 0 }));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(keys.deals)).toBeUndefined();
  });

  test('a refused move with nothing cached leaves the cache empty', async () => {
    mockFetch({ 'POST /api/deals/1/move': () => new Response(JSON.stringify({ detail: 'No.' }), { status: 409 }) });
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useMoveDeal(undefined), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: 1, stage: 'qualified', index: 0 }).catch(() => undefined);
    });
    // Same as the refused save above: the error state arrives in a later batch.
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData(keys.deals)).toBeUndefined();
  });
});
