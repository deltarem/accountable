// What the build told the browser about sign-in (ARC-17). vite.config.ts fills
// these in; the browser holds only Supabase's address and publishable key, never a
// secret (AUTH-03).

declare const __ACCOUNTABLE_LOCAL__: boolean;
declare const __SUPABASE_URL__: string;
declare const __SUPABASE_PUBLISHABLE_KEY__: string;

/** Local mode: the built-in test user signs in through the backend (DEC-19). */
export const LOCAL_MODE: boolean = __ACCOUNTABLE_LOCAL__;
export const SUPABASE_URL: string = __SUPABASE_URL__;
export const SUPABASE_PUBLISHABLE_KEY: string = __SUPABASE_PUBLISHABLE_KEY__;

/** The built-in test user, filled in on the sign-in screen in local mode. Public by design. */
export const TEST_USER = { email: 'test@example.com', password: 'accountable' };
