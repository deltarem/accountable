// The session: who is signed in, signing in and out (AUTH-03, UI-AUTH-02).
//
// It picks the way of signing in from the build: the built-in test user in local
// mode, Supabase otherwise. Supabase's client is imported only when it's needed,
// so local mode never loads it and never reaches the internet.
//
// Every API call carries the session's token (api/client.ts). A 401 from the
// API, or a session that can't be renewed, ends the session: the sign-in screen
// shows "Your session has ended. Sign in again." at the same address. Signing out
// or ending clears every query, so the next person sees nothing of the last one's
// session (ARC-10).

import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { type Me, getMe } from '../api/auth';
import { connectSession } from '../api/client';
import { LOCAL_MODE, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config';
import { localService } from './local';
import { type SignInService, SignInError, UNREACHABLE } from './service';

export const SESSION_ENDED = 'Your session has ended. Sign in again.';

export type SessionStatus = 'loading' | 'signed-out' | 'signed-in';

export interface Session {
  status: SessionStatus;
  user: Me | null;
  /** Set when the session ended by itself, for the sign-in screen to say so. */
  endedMessage: string | null;
  local: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession needs a SessionProvider around it');
  return session;
}

/** The provider's value, for tests that render part of the app signed in. */
export const SessionValue = SessionContext.Provider;

async function defaultService(): Promise<SignInService> {
  if (LOCAL_MODE) return localService();
  const { supabaseService } = await import('./supabase');
  return supabaseService(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}

interface State {
  status: SessionStatus;
  user: Me | null;
  endedMessage: string | null;
}

export function SessionProvider({
  children,
  service: givenService,
  local = LOCAL_MODE,
  onSignedOut,
}: {
  children: ReactNode;
  /** The way of signing in; the build decides when it's left out. */
  service?: SignInService;
  local?: boolean;
  /** Called after signing out, to return to the dashboard's address. */
  onSignedOut?: () => void;
}) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<State>({ status: 'loading', user: null, endedMessage: null });
  const [service, setService] = useState<SignInService | null>(givenService ?? null);
  // The status as of the last change, for callbacks that run between renders.
  const statusRef = useRef<SessionStatus>('loading');
  const signingOut = useRef(false);

  const update = useCallback((next: State) => {
    statusRef.current = next.status;
    setState(next);
  }, []);

  const end = useCallback(() => {
    if (signingOut.current || statusRef.current === 'signed-out') return;
    update({ status: 'signed-out', user: null, endedMessage: SESSION_ENDED });
    queryClient.clear();
    void service?.signOut();
  }, [queryClient, service, update]);

  useEffect(() => {
    if (service) return;
    let cancelled = false;
    void defaultService().then((loaded) => {
      if (!cancelled) setService(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [service]);

  useEffect(() => {
    if (!service) return;
    const disconnect = connectSession({ token: () => service.token(), onUnauthorized: end });
    const stopListening = service.onEnded(end);
    return () => {
      disconnect();
      stopListening();
    };
  }, [service, end]);

  useEffect(() => {
    if (!service) return;
    let cancelled = false;
    void (async () => {
      const token = await service.restore();
      if (cancelled || statusRef.current !== 'loading') return;
      if (!token) {
        update({ status: 'signed-out', user: null, endedMessage: null });
        return;
      }
      try {
        const user = await getMe();
        if (!cancelled && statusRef.current === 'loading') update({ status: 'signed-in', user, endedMessage: null });
      } catch {
        // A 401 has already ended the session with its message. Anything else
        // (the server is down) leaves the sign-in screen, where signing in again
        // says what's wrong.
        if (!cancelled && statusRef.current === 'loading') {
          update({ status: 'signed-out', user: null, endedMessage: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [service, update]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!service) throw new SignInError(UNREACHABLE);
      await service.signIn(email, password);
      // Signed in as far as the API is concerned, so a 401 from /me ends it again.
      statusRef.current = 'signed-in';
      let user: Me;
      try {
        user = await getMe();
      } catch {
        statusRef.current = 'signed-out';
        throw new SignInError(UNREACHABLE);
      }
      update({ status: 'signed-in', user, endedMessage: null });
    },
    [service, update],
  );

  const signOut = useCallback(async () => {
    signingOut.current = true;
    try {
      await service?.signOut();
    } finally {
      signingOut.current = false;
    }
    queryClient.clear();
    update({ status: 'signed-out', user: null, endedMessage: null });
    onSignedOut?.();
  }, [queryClient, service, onSignedOut, update]);

  const value = useMemo<Session>(() => ({ ...state, local, signIn, signOut }), [state, local, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
