// Signing in with Supabase Auth, email and password (AUTH-02, AUTH-03). Supabase's
// client keeps the session in localStorage, so a refresh or a new tab stays signed
// in, and renews the token before it expires. It's used for signing in only.
//
// session.tsx imports this file only outside local mode, so local mode and the
// tests never load Supabase's client.

import { createClient, isAuthApiError } from '@supabase/supabase-js';

import { type SignInService, SignInError, UNREACHABLE, WRONG_DETAILS } from './service';

export function supabaseService(url: string, publishableKey: string): SignInService {
  const client = createClient(url, publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });

  async function token() {
    const { data } = await client.auth.getSession();
    return data.session?.access_token ?? null;
  }

  return {
    restore: token,
    token,
    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (!error) return;
      // A 400 is wrong details; anything else means Supabase couldn't be reached
      // or couldn't answer.
      throw new SignInError(isAuthApiError(error) && error.status === 400 ? WRONG_DETAILS : UNREACHABLE);
    },
    async signOut() {
      // Only this browser's session; other devices stay signed in.
      await client.auth.signOut({ scope: 'local' });
    },
    onEnded(listener) {
      const { data } = client.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') listener();
      });
      return () => data.subscription.unsubscribe();
    },
  };
}
