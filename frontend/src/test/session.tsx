// Signing in for the unit tests. Vitest builds in local mode (vite.config.ts), so
// the real SessionProvider signs in through the local token; these helpers set one
// up, or skip the provider for components that only read the session.

import type { ReactElement, ReactNode } from 'react';
import { vi } from 'vitest';

import type { Me } from '../api/auth';
import { LOCAL_SESSION_KEY } from '../auth/local';
import { type Session, SessionValue } from '../auth/session';
import { renderWithProviders } from './utils';

export const TEST_ME: Me = { id: 'user-priya', email: 'priya@company.com', name: 'Priya Shah', initials: 'PS' };

/** A kept local session, as after an earlier sign-in. Mock GET /api/me with TEST_ME. */
export function keepSignedIn(token = 'test-token') {
  localStorage.setItem(LOCAL_SESSION_KEY, token);
}

export function fakeSession(overrides: Partial<Session> = {}): Session {
  return {
    status: 'signed-in',
    user: TEST_ME,
    endedMessage: null,
    local: true,
    signIn: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    ...overrides,
  };
}

/** A fixed, signed-in session, for components that read it. */
export function TestSessionProvider({ session, children }: { session?: Session; children: ReactNode }) {
  return <SessionValue value={session ?? fakeSession()}>{children}</SessionValue>;
}

export function renderSignedIn(ui: ReactElement, options: { route?: string; session?: Session } = {}) {
  const session = options.session ?? fakeSession();
  return {
    session,
    ...renderWithProviders(<TestSessionProvider session={session}>{ui}</TestSessionProvider>, options),
  };
}
