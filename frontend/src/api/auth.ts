// The two calls the session makes to the backend: who is signed in (API-19), and
// the built-in test user's sign-in in local mode (API-20).

import { request } from './client';

/** The signed-in person. Initials come from the backend (UI-MENU-01). */
export interface Me {
  id: string;
  email: string;
  name: string;
  initials: string;
}

export function getMe(): Promise<Me> {
  return request<Me>('GET', '/me');
}

export function localSignIn(email: string, password: string): Promise<{ access_token: string; user: Me }> {
  return request('POST', '/local/sign-in', { email, password }, { signIn: true });
}
