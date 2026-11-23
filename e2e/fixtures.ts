// Every test reseeds first, and fails if the page logs a console error or
// warning (UI-ERR-02). `api` makes records directly, for tests that need a
// particular starting point.

import { type APIRequestContext, type Page, test as base, expect } from '@playwright/test';

import { empty, reseed } from './seed';

export { empty, reseed };

export class Api {
  constructor(private readonly request: APIRequestContext) {}

  async get<T = any>(path: string): Promise<T> {
    const r = await this.request.get(`/api${path}`);
    expect(r.ok(), `GET ${path}`).toBeTruthy();
    return r.json();
  }

  async post<T = any>(path: string, body: unknown): Promise<T> {
    const r = await this.request.post(`/api${path}`, { data: body });
    expect(r.ok(), `POST ${path}: ${await r.text()}`).toBeTruthy();
    return r.json();
  }

  async put<T = any>(path: string, body: unknown): Promise<T> {
    const r = await this.request.put(`/api${path}`, { data: body });
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
};

export const test = base.extend<Fixtures>({
  allowConsole: [[], { option: true }],

  seeded: [
    async ({}, use) => {
      reseed();
      await use();
    },
    { auto: true },
  ],

  page: async ({ page, allowConsole }, use) => {
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

  api: async ({ request }, use) => {
    await use(new Api(request));
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
