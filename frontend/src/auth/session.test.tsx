import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { api } from '../api/client';
import { TEST_ME, keepSignedIn } from '../test/session';
import { mockFetch } from '../test/utils';
import { LOCAL_SESSION_KEY } from './local';
import type { SignInService } from './service';
import { SESSION_ENDED, SessionProvider, useSession } from './session';

const loaded = vi.hoisted(() => ({ supabase: false }));
vi.mock('./supabase', () => {
  loaded.supabase = true;
  return { supabaseService: () => ({}) };
});

function Probe() {
  const session = useSession();
  return (
    <div>
      <p>status: {session.status}</p>
      <p>user: {session.user?.name ?? 'none'}</p>
      <p>ended: {session.endedMessage ?? 'no'}</p>
      <button type="button" onClick={() => void session.signIn('test@example.com', 'accountable').catch(() => {})}>
        sign in
      </button>
      <button type="button" onClick={() => void session.signOut()}>
        sign out
      </button>
      <button type="button" onClick={() => void api.get('/deals').catch(() => {})}>
        load deals
      </button>
    </div>
  );
}

function renderSession(props: { service?: SignInService; onSignedOut?: () => void } = {}) {
  const client = new QueryClient();
  client.setQueryData(['deals'], [{ id: 1 }]);
  render(
    <QueryClientProvider client={client}>
      <SessionProvider {...props}>
        <Probe />
      </SessionProvider>
    </QueryClientProvider>,
  );
  return client;
}

const unauthorized = () => new Response(JSON.stringify({ detail: 'Sign in to continue' }), { status: 401 });

describe('the session in local mode', () => {
  test('starts signed out with nothing kept, and never loads Supabase', async () => {
    mockFetch({});
    renderSession();
    expect(await screen.findByText('status: signed-out')).toBeTruthy();
    expect(screen.getByText('ended: no')).toBeTruthy();
    expect(loaded.supabase).toBe(false);
  });

  test('signs in, keeps the token, and the next load stays signed in (AUTH-03)', async () => {
    const spy = mockFetch({
      'POST /api/local/sign-in': { access_token: 'local-token', user: TEST_ME },
      '/api/me': TEST_ME,
    });
    renderSession();
    await userEvent.click(await screen.findByRole('button', { name: 'sign in' }));
    expect(await screen.findByText('user: Priya Shah')).toBeTruthy();
    expect(localStorage.getItem(LOCAL_SESSION_KEY)).toBe('local-token');
    const meCall = spy.mock.calls.find(([url]) => url === '/api/me');
    expect(meCall?.[1]?.headers).toEqual({ Authorization: 'Bearer local-token' });
  });

  test('a kept session is restored on load', async () => {
    keepSignedIn('kept-token');
    mockFetch({ '/api/me': TEST_ME });
    renderSession();
    expect(await screen.findByText('status: signed-in')).toBeTruthy();
    expect(screen.getByText('user: Priya Shah')).toBeTruthy();
  });

  test('a kept session the server refuses ends with the message', async () => {
    keepSignedIn('expired-token');
    mockFetch({ '/api/me': unauthorized });
    renderSession();
    expect(await screen.findByText(`ended: ${SESSION_ENDED}`)).toBeTruthy();
    expect(localStorage.getItem(LOCAL_SESSION_KEY)).toBeNull();
  });

  test('a 401 from any call ends the session and clears every query (ARC-10)', async () => {
    keepSignedIn();
    mockFetch({ '/api/me': TEST_ME, '/api/deals': unauthorized });
    const client = renderSession();
    await screen.findByText('status: signed-in');
    await userEvent.click(screen.getByRole('button', { name: 'load deals' }));
    expect(await screen.findByText(`ended: ${SESSION_ENDED}`)).toBeTruthy();
    expect(screen.getByText('status: signed-out')).toBeTruthy();
    expect(client.getQueryData(['deals'])).toBeUndefined();
    expect(localStorage.getItem(LOCAL_SESSION_KEY)).toBeNull();
  });

  test('signing out forgets the token, clears every query and says nothing has ended', async () => {
    keepSignedIn();
    mockFetch({ '/api/me': TEST_ME });
    const onSignedOut = vi.fn();
    const client = renderSession({ onSignedOut });
    await screen.findByText('status: signed-in');
    await userEvent.click(screen.getByRole('button', { name: 'sign out' }));
    expect(await screen.findByText('status: signed-out')).toBeTruthy();
    expect(screen.getByText('ended: no')).toBeTruthy();
    expect(client.getQueryData(['deals'])).toBeUndefined();
    expect(localStorage.getItem(LOCAL_SESSION_KEY)).toBeNull();
    expect(onSignedOut).toHaveBeenCalledOnce();
  });

  test('a wrong password leaves it signed out', async () => {
    mockFetch({
      'POST /api/local/sign-in': () =>
        new Response(JSON.stringify({ detail: 'Email or password is wrong' }), { status: 401 }),
    });
    renderSession();
    await userEvent.click(await screen.findByRole('button', { name: 'sign in' }));
    expect(screen.getByText('status: signed-out')).toBeTruthy();
    expect(screen.getByText('ended: no')).toBeTruthy();
  });
});

describe('a session that ends by itself', () => {
  function fakeService(): SignInService & { end: () => void } {
    let listener = () => {};
    return {
      restore: async () => 'token',
      signIn: async () => {},
      token: async () => 'token',
      signOut: vi.fn(async () => {}),
      onEnded(l) {
        listener = l;
        return () => {};
      },
      end: () => listener(),
    };
  }

  test("a session Supabase can't renew shows the sign-in screen's message (AUTH-03)", async () => {
    mockFetch({ '/api/me': TEST_ME });
    const service = fakeService();
    renderSession({ service });
    await screen.findByText('status: signed-in');
    act(() => service.end());
    expect(await screen.findByText(`ended: ${SESSION_ENDED}`)).toBeTruthy();
  });

  test('signing out on purpose is not reported as an ended session', async () => {
    mockFetch({ '/api/me': TEST_ME });
    const service = fakeService();
    service.signOut = vi.fn(async () => service.end());
    renderSession({ service });
    await screen.findByText('status: signed-in');
    await userEvent.click(screen.getByRole('button', { name: 'sign out' }));
    await waitFor(() => expect(screen.getByText('status: signed-out')).toBeTruthy());
    expect(screen.getByText('ended: no')).toBeTruthy();
  });
});

test('useSession outside a provider says what is missing', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => render(<Probe />)).toThrow('useSession needs a SessionProvider around it');
});
