# Plan: sign-in, search and a user menu

How the change in `intent.md` gets built and tested. The spec (`docs/spec.md` and the area files `accounts.md`, `search.md`, `theme.md`, `architecture.md`, `running.md`, `screens.md`, `sample-data.md`, `activities.md`, `testing.md`) already describes the product with this change in it. This plan follows it.

## Files that change

The files are grouped into seven parts. Each file belongs to exactly one part, so each part can go to a different agent without two of them editing the same file. Where one part needs something in another part's file, the owner makes that edit; those are listed under "Edits made for other parts".

### Contracts between the parts

Agreed before any part starts, so parts can be built against each other without waiting:

- **The signed-in user on the backend.** `backend/auth.py` exports `current_user`, a FastAPI dependency returning `CurrentUser(id: str, email: str, name: str)`. Routes take it with `user: CurrentUser = Depends(current_user)` and pass `user.id` to the services. The `/api` router applies it to every route, so a route that forgets it is still protected.
- **Who in API responses.** Organizations, contacts, deals and activities come back with `created_by_name` and `updated_by_name`; timeline entries and the dashboard's recent activity with `created_by_name`. Each is a string, or `null` for sample data. The frontend turns `null` into "Sample data".
- **`GET /api/me`** returns `{id, email, name, initials}`. Initials are worked out on the backend (`API-19`).
- **`POST /api/local/sign-in`** takes `{email, password}` and returns `{access_token, user: {id, email, name, initials}}`.
- **`GET /api/search?q=`** returns `{organizations: [...], contacts: [...], deals: [...]}`, each item `{id, name, context}`.
- **The session in the browser.** `frontend/src/auth/session.tsx` exports `SessionProvider` and `useSession()`, which returns `{status: 'loading' | 'signed-out' | 'signed-in', user, signIn(email, password), signOut(), endedMessage}`. `frontend/src/test/session.tsx` exports `renderSignedIn()` and a `TestSessionProvider` with a fixed user, for Vitest.
- **The search box.** `frontend/src/components/topbar/GlobalSearch.tsx` exports `GlobalSearch`, with no props. The top bar places it.
- **The local-mode switch.** `ACCOUNTABLE_LOCAL=1` in the environment turns local mode on for the backend, and for Vite, which passes it to the browser at build time.

### Part A: backend database and sign-in

New:
- `backend/settings.py`: reads `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `ACCOUNTABLE_LOCAL` and `ACCOUNTABLE_DB` from the environment only, never from `.env` (the Node scripts load `.env`, Part B). Refuses to start in local mode when `DATABASE_URL` is Postgres (`DEC-19`). In local mode the Supabase settings are ignored (`ARC-17`).
- `backend/auth.py`: the `current_user` dependency (`ARC-19`). Reads the bearer token, checks its signature against Supabase's published keys with PyJWT's `PyJWKClient` (keys kept in memory, fetched again for an unknown key id), its expiry, audience `authenticated` and issuer (`AUTH-02`). In local mode it checks the local token instead. Writes the user into `users` when the id, email or name differ from what it last saw, kept in an in-memory cache so most requests write nothing (`DEC-18`). The name rule (display name, or the part of the email before the @) and the initials rule (`UI-MENU-01`) live here.
- `backend/routes/me.py`: `GET /api/me` (`API-19`), and `POST /api/local/sign-in` (`API-20`), registered only in local mode so it is a 404 otherwise.
- `backend/services/users.py`: the id-to-name lookup the services use to fill `created_by_name` and `updated_by_name`.
- `backend/migrations/env.py`, `backend/migrations/script.py.mako`, `backend/migrations/versions/0001_baseline.py` (today's five tables, as they are), `backend/migrations/versions/0002_users_and_authors.py` (the `users` table, and `created_by` and `updated_by` on the four record tables and `created_by` on `events`, through `batch_alter_table` so SQLite can add the foreign keys) (`ARC-03`, `DM-07`, `DM-08`).
- Tests: `backend/tests/tokens.py` (makes an EC key pair once per session and signs test tokens, good and bad), `test_auth.py`, `test_me.py`, `test_local_mode.py`, `test_settings.py`, `test_authors.py`, `test_migrations.py`, `test_static.py`, `test_seed_guard.py`.

Changed:
- `pyproject.toml`, `uv.lock`: `alembic`, `psycopg[binary]` and `pyjwt[crypto]` (the case for each is under Risks).
- `backend/db.py`: the engine comes from `settings.py`, Postgres or SQLite, with `pool_pre_ping` and a small pool for Supabase's session pooler. The `users` table and the author columns. `run_migrations()`: runs Alembic programmatically; a SQLite file from before migrations (tables but no `alembic_version`) is stamped at `0001` first, so it keeps its data. Says whether the database was new.
- `backend/main.py`: one `/api` router carrying the `current_user` dependency; migrations, then seeding a new database, on startup (`RUN-05`); serves `frontend/dist/` when it exists, with `index.html` for any address outside `/api` that isn't a file (`ARC-18`).
- `backend/routes/organizations.py`, `contacts.py`, `deals.py`, `activities.py`, `dashboard.py`, `meta.py`: take the user and pass `user.id` to the services; move under the `/api` router.
- `backend/services/organizations.py`, `contacts.py`, `deals.py`, `activities.py`: write `created_by` and `updated_by` (`DM-08`); logging an activity leaves its record's `updated_by` alone. `deals.py` locks the rows of the two columns a move renumbers (`with_for_update`, which SQLite ignores), so two moves at once can't interleave on Postgres (`DEC-20`).
- `backend/services/stages.py`: the stage change takes the user id, writes it on the stage event, on the contact's status event when a win makes it a customer, and as the contact's `updated_by`.
- `backend/services/timeline.py`, `backend/services/dashboard.py`: `created_by_name` on every timeline entry and recent activity entry.
- `backend/seed.py`: `clear()` keeps `users`; records get no author (`SEED-07`); on Postgres it refuses without `--yes`, saying which database and how many records, and exits 1 (`RUN-03`). The record count is behind a function the test replaces, so the test never connects.
- `backend/tests/conftest.py`: removes `DATABASE_URL`, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from the environment for every test, sets a test Supabase address with the test keys already loaded into the key cache, blocks any socket connection to anything other than localhost, and gives `client` a signed-in test user by default. Adds `anon_client` and `other_user_client`.
- Existing tests that read response shapes or run startup: `test_seed.py`, `test_startup.py`, `test_timeline.py`, `test_dashboard.py`, `test_transactions.py`.

Edits made for other parts: registers `backend/routes/search.py` (Part E) in `main.py` in phase 2.

### Part B: running and hosting

New:
- `scripts/env.mjs`: reads `.env` at the repo root with Node's own `util.parseEnv`, so no dotenv package is needed. Lists which of the three settings are missing.
- `scripts/start.mjs`: loads `.env`, then runs `uv run uvicorn backend.main:app` on `0.0.0.0` and `PORT` (8000 if unset) (`RUN-14`).
- `scripts/seed.mjs`: loads `.env` unless `--local` is given, sets `ACCOUNTABLE_LOCAL=1` for `--local`, and runs `uv run python -m backend.seed` with the remaining arguments (`RUN-03`).
- `scripts/env.test.mjs`.
- `render.yaml`: one web service on the free plan; build `npm ci && npm run build`, start `npm start`; the three settings named with `sync: false`; `TZ` set (`RUN-15`, `DEC-12`).
- `.env.example`: the three names with empty values and where each comes from in Supabase's dashboard (`RUN-13`).

Changed:
- `package.json` (root): `dev:local`, `build`, `start`; `seed` goes through `scripts/seed.mjs`.
- `scripts/dev.mjs`: two modes. `npm run dev` checks the three settings and stops with a clear message, pointing to `.env.example` and `npm run dev:local`, if any is missing (`RUN-02`). `npm run dev:local` sets `ACCOUNTABLE_LOCAL=1` and never passes the Supabase settings on (`RUN-12`). Each prints which mode it's in.
- `scripts/dev.test.mjs`: both modes.
- `playwright.config.ts`: `ACCOUNTABLE_LOCAL=1` in `E2E_ENV`, for both servers.
- `e2e/seed.ts`: runs the seed in local mode.
- `.claude/agents/ui-check.md`: uses `npm run dev:local`, signs in as the test user, and also checks the sign-in screen, the search dropdown and the menu (`RUN-11`).

### Part C: sign-in in the browser

New:
- `frontend/src/auth/config.ts`: the Supabase address, publishable key and local flag, as Vite put them into the build.
- `frontend/src/auth/session.tsx`: `SessionProvider` and `useSession()`. Outside local mode it loads `@supabase/supabase-js` with a dynamic import, so local mode never loads it; Supabase's client keeps the session and renews the token (`AUTH-03`). In local mode it keeps the local token in localStorage. On sign-in it fetches `/api/me`. A 401 from the API ends the session with "Your session has ended. Sign in again." Signing out clears every query (`ARC-10`).
- `frontend/src/api/auth.ts`: `getMe()` and `localSignIn()`, so `fetch` stays inside `api/`.
- `frontend/src/pages/SignInPage.tsx`, `SignInPage.module.css` (`UI-AUTH-01`).
- `frontend/src/test/session.tsx`: `TestSessionProvider` and `renderSignedIn()`.
- Tests: `frontend/src/auth/session.test.tsx`, `frontend/src/pages/SignInPage.test.tsx`.
- `e2e/sign-in.spec.ts`.

Changed:
- `frontend/package.json`, `package-lock.json`: `@supabase/supabase-js`.
- `frontend/vite.config.ts`: reads the root `.env` with `loadEnv` and puts exactly `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and the local flag into the build with `define`, nothing else (`ARC-17`).
- `frontend/src/api/client.ts`: adds the token to every call, and reports a 401 to the session.
- `frontend/src/App.tsx`: wraps the app in `SessionProvider`; shows nothing while the session loads, the sign-in screen when signed out, and the router when signed in, so the address stays as it was asked for (`UI-AUTH-02`). Queries load again when the tab comes back into focus (`DEC-20`).
- `frontend/src/api/client.test.ts`, `frontend/src/App.test.tsx`, `frontend/src/main.test.tsx`: signed in.
- `e2e/fixtures.ts`: every test signs in as the test user through `POST /api/local/sign-in` and puts the session in localStorage before the page loads; `Api` sends the token; a `signedOut` option skips this.
- `e2e/start.spec.ts`: starts signed out, signs in, lands on the dashboard (`SC-01`).
- `e2e/offline.spec.ts`: still nothing fetched from outside 127.0.0.1, sign-in included.

### Part D: who added it, on the screens

New:
- `frontend/src/lib/who.ts`, `who.test.ts`: "Added by Priya Shah on 2 Mar 2026 · Last changed by Sam Lee on 20 Nov 2026", the first half alone when it hasn't changed since, "Sample data" for `null`, and the timeline's "· Priya Shah" (`UI-WHO-01`, `UI-WHO-02`).
- `e2e/who.spec.ts`.

Changed:
- `frontend/src/api/types.ts`: the `*_by_name` fields.
- `frontend/src/components/record/RecordParts.tsx`, `RecordParts.module.css`, `RecordParts.test.tsx`: the who line at the foot of the record header.
- `frontend/src/pages/DealPage.tsx`, `ContactPage.tsx`, `OrganizationPage.tsx` and their tests: pass the who line; the deal page drops its "Created" fact.
- `frontend/src/components/record/Timeline.tsx`, `Timeline.test.tsx`, `frontend/src/components/dashboard/ActivityFeed.tsx`, `ActivityFeed.test.tsx`: who made each entry.
- `frontend/src/test/recordHelpers.tsx`, `frontend/src/test/dashboardFixtures.ts`: fixtures with the new fields.

### Part E: search

New:
- `backend/services/search.py`: reads id, name and context of every organization, contact and deal, matches with `str.casefold()` after trimming, treats `%` and `_` as plain text, orders names that start with the text first, then A to Z, and keeps 5 per group (`DEC-21`, `ARC-20`).
- `backend/routes/search.py`: `GET /api/search` (`API-21`).
- `backend/tests/test_search.py`.
- `frontend/src/api/search.ts`: `useSearch(q)`, a TanStack Query hook that keeps the previous results while the next ones load.
- `frontend/src/lib/search.ts`, `search.test.ts`: splits a name around the matching part for the semibold highlight.
- `frontend/src/components/topbar/GlobalSearch.tsx`, `GlobalSearch.module.css`, `GlobalSearch.test.tsx`: the box and the cmdk dropdown, 150ms after typing stops, groups, icons, "Searching...", "No matches for ...", "Couldn't search. Try again.", the keys (`UI-SRCH-01` to `UI-SRCH-03`, `UI-EMPTY-06`).
- `e2e/search.spec.ts`.

### Part F: top bar, menu and theme

New:
- `frontend/src/components/topbar/TopBar.tsx`, `TopBar.module.css`, `TopBar.test.tsx`: the 56px bar, search on the left, initials on the right, no fill and no line (`UI-LAY-05`).
- `frontend/src/components/topbar/AccountMenu.tsx`, `AccountMenu.module.css`, `AccountMenu.test.tsx`: the initials circle and the Radix dropdown with name, email, the Light, Dark and System radio group, and Sign out (`UI-MENU-01`, `UI-THEME-01`).
- `e2e/theme.spec.ts` (replaces `e2e/dark-mode.spec.ts`), `e2e/menu.spec.ts`.

Changed:
- `frontend/src/lib/theme.ts`, `theme.test.ts`: a third choice, `system`, resolved through `prefers-color-scheme` and followed while the app is open.
- `frontend/index.html`: the inline script also handles `system`.
- `frontend/src/components/AppShell.tsx`, `AppShell.module.css`, `AppShell.test.tsx`: the top bar above the page.
- `frontend/src/components/IconRail.tsx`, `IconRail.test.tsx`, `RailLink.module.css`: the toggle leaves the rail.
- `frontend/src/styles/tokens.css`, `tokens.test.ts`: role tokens for the initials circle in both modes, if the existing ones don't cover it, with their contrast checked.
- `frontend/src/test/shellHelpers.tsx`: renders the shell inside `TestSessionProvider`.
- `e2e/light-mode.spec.ts` and `e2e/light-mode.spec.ts-snapshots/`: retaken for the top bar and the rail (see Risks).

Deleted: `frontend/src/components/ThemeToggle.tsx`, `ThemeToggle.test.tsx`, `e2e/dark-mode.spec.ts`, `e2e/hide-theme-toggle.css`.

### Part G: docs, last

- `docs/STATUS.md`: both ways to run it, the test user's email and password, `--yes` on seeding Supabase (`RUN-06`), and the log.
- `docs/TECH_STACK.md`: Postgres on Supabase, sign-in and Render are no longer "later".
- `docs/backend-architecture.md`, `docs/frontend-architecture.md`: auth, settings, migrations, the static files; the session, the sign-in gate, the top bar.
- `docs/specs/testing.md`: initials are tested in pytest, since the backend works them out (`API-19`); anything else the build shows the spec got wrong, in its area file, and in `docs/spec.md` if the summary or the ID index changes.
- This plan, if the build departs from it.

## Order of work

Each step ends with a commit once its tests pass. Each phase ends with `npm test` passing in full.

### Phase 1: sign-in and the database

1. **Contracts first** (lead). Check the contracts above against the spec once more, then hand out parts A to D.
2. **Settings and migrations** (A). `settings.py`, the Alembic baseline matching today's tables, startup running migrations, an old SQLite file stamped and kept. No behaviour changes yet; every existing test passes.
3. **Users and authors** (A). Migration `0002`, the `current_user` dependency on `/api`, `/api/me`, the local sign-in, authors written by the services, names in responses, the seed guard. Existing tests pass through the signed-in `client`.
4. **Running it** (B, alongside step 3). `scripts/env.mjs`, `dev` and `dev:local`, `seed.mjs`, `start.mjs`, `render.yaml`, `.env.example`, local mode in the Playwright config.
5. **Sign-in screen and session** (C, alongside steps 3 and 4; Vitest runs against mocked API calls). The session, the sign-in page, the token on every call, the gate in `App.tsx`. Then the end-to-end fixture signs in, and every existing end-to-end test passes signed in.
6. **Who added it** (D, after step 3's response shapes land). The who line, the timeline and recent activity names.
7. **Light mode snapshots** (F, alone in a commit). The record pages gained a who line, so their snapshots are retaken, after the check in Risks.
8. **Phase gate.** `npm test` passes. By hand: `npm run dev` against Supabase signs in a real account and shows its name on a new record; `npm run dev:local` with the network off signs in the test user; `npm run build` then `npm start` serves the app on port 8000 signed in against Supabase.

### Phase 2: search

1. **The search endpoint** (E). `services/search.py`, `routes/search.py` and its tests; A registers the router.
2. **The top bar** (F). `TopBar` in the shell, holding `GlobalSearch` on the left, with nothing on the right yet.
3. **The search box and dropdown** (E). `GlobalSearch`, its hook, the highlight, its tests and `e2e/search.spec.ts`.
4. **Light mode snapshots** (F, alone in a commit), since every page now sits 56px lower.
5. **Phase gate.** `npm test` passes; search checked by hand on Supabase, to see it matches the same way on Postgres.

### Phase 3: the user menu

1. **System theme** (F). `lib/theme.ts` and the inline script in `index.html`.
2. **The menu** (F). `AccountMenu` on the right of the top bar, with the theme choice and Sign out; the toggle leaves the rail.
3. **End-to-end** (F). `e2e/theme.spec.ts` and `e2e/menu.spec.ts`; light mode snapshots retaken for the initials and the rail's empty foot, alone in a commit.
4. **Phase gate.** `npm test` passes.

### Phase 4: finishing

1. **Docs** (G).
2. **`npm run check`** passes, with and without the three settings in `.env`.
3. **ui-check** on `npm run dev:local`, every page in light and dark mode, plus the sign-in screen, the search dropdown and the menu.
4. **By hand** (`SC-12`): every section used end to end in Chrome with the console open, signed in against Supabase with `npm run dev`, then once on Render after a deploy, with two accounts to see each other's names on records and in timelines.

## Risks

1. **New dependencies.** The intent asks for the case for each:
   - `alembic`: the team's data on Supabase has to survive every change to the tables, and tracking which changes a database has had is what Alembic does (`ARC-03`). Hand-run SQL would let SQLite and Postgres drift.
   - `psycopg[binary]`: SQLAlchemy needs a Postgres driver. Version 3 is the current one, and the binary wheels need no Postgres libraries installed on Windows or Render.
   - `pyjwt[crypto]`: checking an ES256 or RS256 signature against Supabase's published keys, with key caching, is security code that shouldn't be home-made. The crypto extra brings `cryptography`, which the tests also use to make their own keys. Asking Supabase about every request was turned down (`ARC-19`).
   - `@supabase/supabase-js`: keeping the session across tabs and renewing the token before it expires is fiddly to get right by hand (`AUTH-03`). It's used for sign-in only, and loaded only outside local mode.
   - No dotenv package: Node's `util.parseEnv` reads `.env` in the scripts, and the backend reads only its environment.
2. **A test touching Supabase or the team's data** (`ARC-14`). The backend never reads `.env`; only the Node scripts do, and the test runners don't go through them. `conftest.py` removes the three settings and blocks sockets to anything but localhost, so a slip fails loudly instead of connecting. The end-to-end servers run in local mode, which refuses Postgres. `test_settings.py` proves the refusal.
3. **Postgres behaving differently from SQLite**, which no test runs on. Known spots, each handled in Part A and checked by hand at the phase 1 gate:
   - String lengths: Postgres enforces `String(200)` and SQLite doesn't, so the Pydantic limits must match the column lengths. A test compares them.
   - Two moves at once on Postgres could interleave their renumbering under its default isolation. The move locks the rows it renumbers.
   - Sorting by `lower(name)` differs for accented letters between the two. Only the server's linked lists sort this way, and the difference is cosmetic.
   - Dates and times stay naive local time (`DEC-12`), with `DateTime` and no time zone, on both.
4. **The migrations drifting from `db.py`'s tables.** Unit tests build their databases from `db.py` for speed. `test_migrations.py` runs the migrations on an empty SQLite file and compares the result with `db.py` using Alembic's `compare_metadata`, so any drift fails.
5. **An existing `data/accountable.db` from before migrations.** Startup stamps it at the baseline, then adds the new columns. A test copies a file made by today's `create_tables`, with records, and checks they survive and read "Sample data".
6. **Supabase's tokens.** Tokens are checked against the published keys, which only works for a project using asymmetric signing keys (the default for new projects). If the project still uses the older shared secret, the backend logs that clearly at the first refused token rather than failing quietly. The claim that carries the dashboard's display name (`user_metadata.display_name`), the audience and the issuer are confirmed against a real token at the phase 1 gate.
7. **Speed on Supabase** (`SC-09`). Every query now crosses the network. The dashboard runs several. Render and Supabase go in the same region, the `users` write is skipped when nothing changed, and the speed is measured by hand on Render. Tests still time the SQLite path.
8. **Retaking the light mode snapshots.** `docs/STATUS.md` says never to update them to make a failing comparison pass, but this change moves every page down and changes the rail, as the spec says. Before each retake, the new screenshots are compared with the old ones below the top bar, shifted 56px, and checked by eye, so the only differences are the top bar, the rail's foot and the who line. Each retake is its own commit, saying what changed.
9. **The local test user is public.** Its password and the local token's signing key are in the repo by design. That is safe only because local mode is off unless a script turns it on, and refuses Postgres; tests prove both. If gitleaks flags the key, it is allowlisted by path with the reason.
10. **Local mode reaching the internet.** Supabase's client is imported only outside local mode; `e2e/offline.spec.ts` fails on any request leaving 127.0.0.1.
11. **Render's runtime** needs both Node (to build) and uv (to run). It's checked on the first deploy; if the Python runtime lacks one of them, the build command installs it. This can only be found out on Render.
12. **Unit tests over one second.** The test key pair is made once per session; migrations run on small temporary files; `pytest --durations=10` and Vitest's per-test times are checked at each phase gate.
13. **Parallel parts drifting from the contracts.** The contracts are fixed at the start of phase 1. A part that needs one changed asks the lead, who updates this plan before anyone builds on it.
14. **The search highlight.** Python's `casefold()` and JavaScript's lower-casing differ for a few letters, such as "ß". Matching runs on the server, so results are right; at worst a name shows with no highlight.
15. **The browser seeing more than it should** (`ARC-17`). Vite's `define` names exactly two settings and the local flag. At the phase 1 gate, the built `frontend/dist/` is searched for the database address to confirm it's absent.

## Proof

### Backend unit tests (pytest)

- `test_auth.py`: every route under `/api` (listed from the app's routes, so a new one can't be missed) returns 401 with "Sign in to continue" for no token, an expired token, a token signed by another key, a tampered token and a token for the wrong audience; a `user_id` or `created_by` in a body, query or header is ignored; a token with an unknown key id fetches the keys once more (`AUTH-01`, `AUTH-02`).
- `test_me.py`: `/api/me` gives id, email, name and initials; the name falls back to the email before the @; "Priya Shah" gives PS and "priya" PR; a changed display name updates `users` and shows on that person's records; an unchanged one writes nothing (`API-19`, `DEC-18`, `DM-07`).
- `test_local_mode.py`: the test user signs in with the right password and gets "Email or password is wrong" otherwise; outside local mode the route is a 404 (`API-20`, `DEC-19`).
- `test_settings.py`: local mode refuses a Postgres `DATABASE_URL`; local mode ignores the Supabase settings; missing settings outside local mode give a clear error (`DEC-19`, `ARC-17`).
- `test_authors.py`, with two users: adding sets both authors; saving, a move and a win's status change set `updated_by`; logging an activity doesn't touch its record; stage and status events record who made them, including both events of a win; names come back in records, timelines and recent activity; sample records come back with `null` (`DM-08`, `SEED-07`, `UI-WHO-01`, `UI-WHO-02`).
- `test_migrations.py`: an empty file migrates to exactly `db.py`'s tables; a file from before migrations keeps its records; startup on a new database seeds it and on an existing one doesn't (`ARC-03`, `RUN-05`).
- `test_seed_guard.py`: a Postgres `DATABASE_URL` without `--yes` exits 1 naming the database and its record count, without connecting; `--yes` goes ahead; seeding keeps `users` (`RUN-03`, `SEED-07`).
- `test_static.py`: with a temporary `dist/`, `/deals/12` gets `index.html`, a real file gets the file, an unknown `/api` address gets a JSON 404, and without `dist/` nothing is served (`ARC-18`, `RUN-14`).
- `test_search.py`: part of a name in any case; trimmed spaces; "müller" finds "Müller"; `%` and `_` as plain text; starts-with first, then A to Z; 5 per group; an empty or blank `q` gives three empty lists; the context lines (`DEC-21`, `API-21`, `ARC-20`).
- `test_move.py` and `test_transactions.py` keep passing with authors in place; a test checks the move asks for row locks.
- Every existing test passes through the signed-in `client`.

### Frontend unit tests (Vitest)

- `auth/session.test.tsx`: signing in, signing out clearing every query, a 401 ending the session with "Your session has ended. Sign in again.", the local session kept across a reload, Supabase's client never imported in local mode (`AUTH-03`, `ARC-10`).
- `pages/SignInPage.test.tsx`: focus on the email field, Enter signs in, "Signing in..." and no double submit, each error message, the local mode line and filled-in fields (`UI-AUTH-01`).
- `App.test.tsx`: signed out, any address shows the sign-in screen and no page; after signing in, the asked-for address opens (`UI-AUTH-02`).
- `api/client.test.ts`: the token on every call; a 401 reported to the session.
- `lib/who.test.ts`, `RecordParts.test.tsx`, `Timeline.test.tsx`, `ActivityFeed.test.tsx`, `DealPage.test.tsx`: the who line, its short form, "Sample data", the timeline suffix, the deal page without "Created" (`UI-WHO-01`, `UI-WHO-02`).
- `lib/search.test.ts`, `GlobalSearch.test.tsx`: the 150ms wait, the groups in order with empty groups left out, the highlight, "Searching...", "No matches for "xyz"", the failure message, the arrow keys, Enter opening and clearing, the two Escapes, focus reopening (`UI-SRCH-01` to `UI-SRCH-03`, `UI-EMPTY-06`).
- `lib/theme.test.ts`: the three choices, System following an emulated `prefers-color-scheme` and its change, blocked storage (`UI-THEME-01`).
- `AccountMenu.test.tsx`, `TopBar.test.tsx`, `AppShell.test.tsx`, `IconRail.test.tsx`: the initials and their accessible name, the menu's contents, the theme radio group keeping the menu open, Sign out, the keys and Escape returning focus; the bar's two sides; no toggle in the rail (`UI-MENU-01`, `UI-LAY-05`).
- `tokens.test.ts`: contrast of any new token pair in both modes.

### Script tests (node --test)

- `scripts/env.test.mjs`: reading `.env`, listing missing settings.
- `scripts/dev.test.mjs`: `npm run dev` without the settings stops, names what's missing and starts nothing; `npm run dev:local` starts both servers in local mode and says so, with the Supabase settings in the environment and ignored (`RUN-02`, `RUN-12`, `DEC-22`).
- `scripts/check-trace.test.mjs` unchanged; the traceability check passes with the table below.

### End-to-end tests (Playwright)

Every test signs in as the test user in local mode unless it says otherwise, and fails on a console error or warning.

- `start.spec.ts`: opens signed out, signs in, lands on the dashboard with sample data (`SC-01`).
- `sign-in.spec.ts`: `/deals/12` signed out shows the sign-in screen, then the deal after signing in; no record name is visible before; a wrong password shows the error; a screenshot of the sign-in screen in both modes (`UI-AUTH-01`, `UI-AUTH-02`).
- `offline.spec.ts`: nothing leaves 127.0.0.1, sign-in included (`RUN-12`).
- `who.spec.ts`: a deal added by the test user reads "Added by Test User" on its page and in its timeline; a stage change names the test user; a sample record reads "Sample data" (`UI-WHO-01`, `UI-WHO-02`).
- `search.spec.ts`: from the dashboard, find and open an organization with the keyboard, a contact with a click, a deal with Enter; "ACME" in capitals; no matches (`UI-SRCH-01` to `UI-SRCH-03`, `UI-EMPTY-06`).
- `menu.spec.ts`: the menu opens with the keyboard and shows the test user; Sign out returns to the sign-in screen at `/`, and an API call with the old page's state is refused (`UI-MENU-01`, `AUTH-01`).
- `theme.spec.ts`: Light, Dark and System from the menu, each kept after a reload; System following an emulated device setting while the page is open (`UI-THEME-01`).
- `light-mode.spec.ts`: every screen against the retaken snapshots.
- Every existing spec (tables, board, records, timelines, follow-ups, win, validation, keyboard, empty states, errors, speed, persistence, screenshots) passes signed in.

### By hand

- `SC-12`: the change used end to end in Chrome with the console open.
- Signing in against the real Supabase project with `npm run dev`, then with `npm run build` and `npm start`, then on Render after a deploy (`RUN-14`, `RUN-15`).
- Two accounts on Supabase at once: each sees the other's name on what they added, and the other's changes after coming back to the tab (`DEC-20`).
- `npm run seed` against Supabase without `--yes` stops and says what it would wipe.

### The intent's success criteria

| Criterion | Proved by |
|---|---|
| 1. `npm run check` passes and never touches Supabase | `npm run check` with and without the settings in `.env`; the socket block in `conftest.py`; `offline.spec.ts` |
| 2. Signed out everything refuses; signed in everything works | `test_auth.py`, `App.test.tsx`, `sign-in.spec.ts`, `menu.spec.ts`, every existing end-to-end test signed in |
| 3. Who added every record and made every change | `test_authors.py`, `lib/who.test.ts`, `who.spec.ts` |
| 4. Search by part of a name in any case | `test_search.py`, `GlobalSearch.test.tsx`, `search.spec.ts` |
| 5. The theme choice is kept, and System follows the device | `lib/theme.test.ts`, `theme.spec.ts` |
| 6. The built app runs like Render, signed in against Supabase | `test_static.py`, and by hand with `npm run build` and `npm start` |

## Traceability

Each ID this change adds, the phase that builds it and what proves it. IDs this change alters that already have a row in an earlier change's plan (such as `ARC-03`, `ARC-10`, `ARC-14`, `RUN-02`, `RUN-03`, `RUN-05`, `RUN-11`, `UI-LAY-04`) are proved by the tests under Proof; the check allows one row per ID, so they aren't repeated here.

| ID | Requirement | Phase | Proof |
|---|---|---|---|
| DEC-18 | Names come from the token and are kept in `users` | 1 | `test_me.py`, `test_authors.py` |
| DEC-19 | The built-in test user, local mode only, never on Postgres | 1 | `test_local_mode.py`, `test_settings.py`, `sign-in.spec.ts` |
| DEC-20 | Several people at once: last save wins, refetch on focus, safe moves | 1 | `test_move.py` row locks, `App.test.tsx` focus refetch, by hand with two accounts |
| DM-07 | The `users` table | 1 | `test_me.py`, `test_migrations.py` |
| DM-08 | Who added and last changed each record, who made each event | 1 | `test_authors.py` |
| AUTH-01 | Every API route needs a signed-in user | 1 | `test_auth.py`, `menu.spec.ts` |
| AUTH-02 | Checking the token against Supabase's keys | 1 | `test_auth.py`, by hand against Supabase |
| AUTH-03 | Staying signed in, and the session ending | 1 | `auth/session.test.tsx`, by hand against Supabase |
| API-19 | `GET /api/me` | 1 | `test_me.py` |
| API-20 | `POST /api/local/sign-in` | 1 | `test_local_mode.py`, `e2e/fixtures.ts` |
| UI-AUTH-01 | The sign-in screen | 1 | `SignInPage.test.tsx`, `sign-in.spec.ts` |
| UI-AUTH-02 | Signed out, every address shows the sign-in screen | 1 | `App.test.tsx`, `sign-in.spec.ts`, `menu.spec.ts` |
| UI-WHO-01 | Who added and changed a record, on its page | 1 | `lib/who.test.ts`, `RecordParts.test.tsx`, `who.spec.ts` |
| UI-WHO-02 | Who made each timeline and recent activity entry | 1 | `Timeline.test.tsx`, `ActivityFeed.test.tsx`, `who.spec.ts` |
| SEED-07 | Sample data has no author and keeps `users` | 1 | `test_authors.py`, `test_seed_guard.py`, `who.spec.ts` |
| ARC-17 | Three settings, in `.env` or in Render | 1 | `test_settings.py`, `scripts/env.test.mjs`, dist search at the phase 1 gate |
| ARC-18 | One web service: FastAPI serves the built frontend | 1 | `test_static.py`, by hand with `npm start` |
| ARC-19 | The user comes from the token, in one place | 1 | `test_auth.py` route sweep, `test_authors.py` |
| DEC-22 | Three ways to run it | 1 | `scripts/dev.test.mjs`, by hand with `npm run dev` and `npm start` |
| RUN-12 | `npm run dev:local` | 1 | `scripts/dev.test.mjs`, `offline.spec.ts` |
| RUN-13 | Settings in `.env`, `.env.example` committed | 1 | `scripts/env.test.mjs`, `scripts/dev.test.mjs` |
| RUN-14 | `npm run build` and `npm start` | 1 | `test_static.py`, by hand |
| RUN-15 | Hosting on Render with `render.yaml` | 1 | by hand after a deploy |
| DEC-21 | What search matches | 2 | `test_search.py` |
| API-21 | `GET /api/search` | 2 | `test_search.py` |
| ARC-20 | Search matches in Python | 2 | `test_search.py` accented letters and wildcards |
| UI-SRCH-01 | The search box | 2 | `GlobalSearch.test.tsx`, `search.spec.ts` |
| UI-SRCH-02 | The dropdown | 2 | `GlobalSearch.test.tsx`, `search.spec.ts` |
| UI-SRCH-03 | Opening a result | 2 | `GlobalSearch.test.tsx`, `search.spec.ts` |
| UI-EMPTY-06 | No matches | 2 | `GlobalSearch.test.tsx`, `search.spec.ts` |
| UI-LAY-05 | The top bar | 2 | `TopBar.test.tsx`, `AppShell.test.tsx`, `light-mode.spec.ts` |
| UI-MENU-01 | The menu under your initials | 3 | `AccountMenu.test.tsx`, `menu.spec.ts` |
| UI-THEME-01 | Light, Dark and System in the menu | 3 | `lib/theme.test.ts`, `AccountMenu.test.tsx`, `theme.spec.ts` |
