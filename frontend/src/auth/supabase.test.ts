import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { SignInError, UNREACHABLE, WRONG_DETAILS } from './service';
import { supabaseService } from './supabase';

// Supabase's client, faked: the tests never reach the internet (ARC-14).
const fake = vi.hoisted(() => ({
  options: null as unknown,
  session: null as { access_token: string } | null,
  signInError: null as unknown,
  listeners: [] as ((event: string) => void)[],
  signOut: vi.fn(async (options?: { scope: string }) => ({ error: null, options })),
}));

vi.mock('@supabase/supabase-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@supabase/supabase-js')>()),
  createClient: (_url: string, _key: string, options: unknown) => {
    fake.options = options;
    return {
      auth: {
        getSession: async () => ({ data: { session: fake.session } }),
        signInWithPassword: async () => ({ error: fake.signInError }),
        signOut: fake.signOut,
        onAuthStateChange: (listener: (event: string) => void) => {
          fake.listeners.push(listener);
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        },
      },
    };
  },
}));

beforeEach(() => {
  fake.session = null;
  fake.signInError = null;
  fake.listeners = [];
});

describe('signing in with Supabase', () => {
  test('keeps the session and renews the token (AUTH-03)', () => {
    supabaseService('https://abc.supabase.co', 'sb_publishable_x');
    expect(fake.options).toEqual({
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  });

  test('the token is the current session access token', async () => {
    const service = supabaseService('https://abc.supabase.co', 'sb_publishable_x');
    expect(await service.restore()).toBeNull();
    fake.session = { access_token: 'jwt' };
    expect(await service.token()).toBe('jwt');
  });

  test('wrong details and an unreachable service give their own messages', async () => {
    const service = supabaseService('https://abc.supabase.co', 'sb_publishable_x');
    fake.signInError = new AuthApiError('Invalid login credentials', 400, 'invalid_credentials');
    await expect(service.signIn('a@b.co', 'x')).rejects.toEqual(new SignInError(WRONG_DETAILS));
    fake.signInError = new AuthRetryableFetchError('Failed to fetch', 0);
    await expect(service.signIn('a@b.co', 'x')).rejects.toEqual(new SignInError(UNREACHABLE));
    fake.signInError = null;
    await expect(service.signIn('a@b.co', 'x')).resolves.toBeUndefined();
  });

  test('signs out this browser only, and reports a session that ends', async () => {
    const service = supabaseService('https://abc.supabase.co', 'sb_publishable_x');
    await service.signOut();
    expect(fake.signOut).toHaveBeenCalledWith({ scope: 'local' });
    const ended = vi.fn();
    service.onEnded(ended);
    for (const listener of fake.listeners) listener('TOKEN_REFRESHED');
    expect(ended).not.toHaveBeenCalled();
    for (const listener of fake.listeners) listener('SIGNED_OUT');
    expect(ended).toHaveBeenCalledOnce();
  });
});
