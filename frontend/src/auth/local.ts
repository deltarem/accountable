// Signing in as the built-in test user, in local mode only (DEC-19, API-20). The
// backend signs a token, which is kept in localStorage so a refresh or a new tab
// stays signed in (AUTH-03).

import { ApiError } from '../api/client';
import { localSignIn } from '../api/auth';
import { type SignInService, SignInError, UNREACHABLE, WRONG_DETAILS } from './service';

export const LOCAL_SESSION_KEY = 'accountable-local-session';

function read(): string | null {
  try {
    return localStorage.getItem(LOCAL_SESSION_KEY);
  } catch {
    // Storage blocked: the session lasts until the page closes (see `memory`).
    return null;
  }
}

function write(token: string | null): void {
  try {
    if (token) localStorage.setItem(LOCAL_SESSION_KEY, token);
    else localStorage.removeItem(LOCAL_SESSION_KEY);
  } catch {
    // Storage blocked: `memory` still holds the token for this page.
  }
}

export function localService(): SignInService {
  let memory: string | null = read();
  return {
    async restore() {
      memory = read() ?? memory;
      return memory;
    },
    async signIn(email, password) {
      try {
        const { access_token } = await localSignIn(email.trim(), password);
        memory = access_token;
        write(access_token);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) throw new SignInError(WRONG_DETAILS);
        throw new SignInError(UNREACHABLE);
      }
    },
    async token() {
      return memory;
    },
    async signOut() {
      memory = null;
      write(null);
    },
    onEnded() {
      // A local token lasts 30 days; the backend's 401 is what ends it.
      return () => {};
    },
  };
}
