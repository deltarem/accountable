// Every test reseeds first, signs in as the built-in test user (local mode,
// DEC-19), and fails if the page logs a console error or warning (UI-ERR-02).
// `api` makes records directly, signed in, for tests that need a particular
// starting point. `test.use({ signedOut: true })` starts on the sign-in screen.

import { type APIRequestContext, type Page, test as base, expect } from '@playwright/test';

import { empty, reseed } from './seed';

export { empty, reseed };

export const TEST_USER = { email: 'test@example.com', password: 'accountable', name: 'Test User' };
// Where the app keeps the local session (frontend/src/auth/local.ts).
const LOCAL_SESSION_KEY = 'accountable-local-session';

/** Signs the test user in through the backend, as the sign-in screen does (API-20). */
export async function signInToken(request: APIRequestContext): Promise<string> {
  const r = await request.post('/api/local/sign-in', { data: { email: TEST_USER.email, password: TEST_USER.password } });
  expect(r.ok(), `sign in: ${await r.text()}`).toBeTruthy();
  return (await r.json()).access_token;
}

export class Api {
  constructor(
    private readonly request: APIRequestContext,
    private readonly token: string,
  ) {}

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async get<T = any>(path: string): Promise<T> {
    const r = await this.request.get(`/api${path}`, { headers: this.headers });
    expect(r.ok(), `GET ${path}`).toBeTruthy();
    return r.json();
  }

  async post<T = any>(path: string, body: unknown): Promise<T> {
    const r = await this.request.post(`/api${path}`, { data: body, headers: this.headers });
    expect(r.ok(), `POST ${path}: ${await r.text()}`).toBeTruthy();
    return r.json();
  }

  async put<T = any>(path: string, body: unknown): Promise<T> {
    const r = await this.request.put(`/api${path}`, { data: body, headers: this.headers });
    expect(r.ok(), `PUT ${path}`).toBeTruthy();
    return r.json();
  }

  /** The first record of a list whose name matches. */
  async find<T = any>(list: 'organizations' | 'contacts' | 'deals', name: string): Promise<T> {
    const rows = await this.get<any[]>(`/${list}`);
    const row = rows.find((r) => r.name === name);
    expect(row, `${name} in ${list}`).toBeTruthy();
    return row;
  }
}

type Fixtures = {
  api: Api;
  allowConsole: RegExp[];
  seeded: void;
  signedOut: boolean;
  token: string;
};

export const test = base.extend<Fixtures>({
  allowConsole: [[], { option: true }],
  signedOut: [false, { option: true }],

  token: async ({ request }, use) => {
    await use(await signInToken(request));
  },

  seeded: [
    async ({}, use) => {
      reseed();
      await use();
    },
    { auto: true },
  ],

  page: async ({ page, allowConsole, signedOut, token }, use) => {
    if (!signedOut) {
      // Signed in before the first page loads, as after an earlier sign-in. Only
      // once per tab, so a test that signs out stays signed out after a reload.
      await page.addInitScript(
        ([key, value]) => {
          if (sessionStorage.getItem('e2e-signed-in')) return;
          sessionStorage.setItem('e2e-signed-in', '1');
          localStorage.setItem(key, value);
        },
        [LOCAL_SESSION_KEY, token],
      );
    }
    const problems: string[] = [];
    page.on('console', (message) => {
      if (message.type() !== 'error' && message.type() !== 'warning') return;
      const text = message.text();
      if (allowConsole.some((pattern) => pattern.test(text))) return;
      problems.push(`[${message.type()}] ${text}`);
    });
    page.on('pageerror', (error) => problems.push(`[pageerror] ${error.message}`));
    await use(page);
    expect(problems, 'the browser console stays free of errors and warnings').toEqual([]);
  },

  api: async ({ request, token }, use) => {
    await use(new Api(request, token));
  },
});

export { expect };

/** Wait until the page shows its data (no loading placeholders left). */
export async function settled(page: Page) {
  await expect(page.locator('[data-testid="skeleton"]')).toHaveCount(0);
}

/** The visible text of each body row's first cell. */
export async function firstColumn(page: Page) {
  return page.locator('tbody tr td:first-child').allInnerTexts();
}

export function dialog(page: Page) {
  return page.getByRole('dialog');
}
