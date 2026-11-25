// What the session needs from a way of signing in: Supabase (auth/supabase.ts) or
// the built-in test user in local mode (auth/local.ts).

export interface SignInService {
  /** The token of a session kept from before (a refresh, another tab), or null. */
  restore(): Promise<string | null>;
  /** Signs in, or throws a SignInError with the message to show. */
  signIn(email: string, password: string): Promise<void>;
  /** The current token, renewed when it's about to expire. */
  token(): Promise<string | null>;
  signOut(): Promise<void>;
  /** Calls back when the session ends by itself, for example when it can't be renewed. */
  onEnded(listener: () => void): () => void;
}

export const WRONG_DETAILS = 'Email or password is wrong';
export const UNREACHABLE = "Couldn't reach the sign-in service. Check your connection and try again.";

/** A sign-in that failed, with the message for the sign-in screen (UI-AUTH-01). */
export class SignInError extends Error {}
