# Architecture

Part of the [Accountable spec](../spec.md). How the app is built: the layers, the code layout, the decisions behind them, the settings, the rules every table follows and the rules every API route follows. How each way of running it is started is in `docs/specs/running.md`.

## Decisions

12. `DEC-12` **"Today".** "Today" is the backend's local date, and every time is the backend's local time. The browser never uses its own clock.
    - On this computer that's the computer's own time zone.
    - On Render the server runs on UTC, so `render.yaml` sets `TZ` to the team's time zone. Without it, late deals and overdue follow-ups would change over at midnight UTC rather than at the team's midnight.
    - The whole team shares one time zone. People in other time zones see the team's dates.

### Overview

```
                    Browser (React app)
                     |                 \
   fetch /api/... with the             \  sign in, renew the session
   Supabase access token                \ (email and password)
                     v                   v
FastAPI                                Supabase Auth
   auth       checks the token, finds the user   <- public keys, fetched now and then
   routes     HTTP in and out, Pydantic models, status codes
   services   business rules, one transaction per user action
   tables     SQLAlchemy Core table definitions and queries
   migrations Alembic, run when the backend starts
   static     the built frontend (hosted and `npm start` only)
   |
   v
Postgres on Supabase (DATABASE_URL)
  or a SQLite file (data/accountable.db, or ACCOUNTABLE_DB) for local mode and the tests
```

In development the React app is on Vite's port 5173, and Vite forwards `/api` to FastAPI on port 8000. Built, FastAPI serves both on one port. In local mode the sign-in goes to the backend's `POST /api/local/sign-in` instead of Supabase.

### Code layout

```
package.json            root scripts: dev, dev:local, build, start, seed, test; frontend/ as a workspace
render.yaml             the Render web service, with no secrets in it
.env.example            the settings, with empty values (.env itself is ignored by git)
scripts/                dev.mjs (one-command start, with or without Supabase), test-all.mjs
                        (npm test), check-trace.mjs (traceability), and their tests
lefthook.yml            the git pre-commit hook
.claude/                the coding agent's settings, hooks (check on stop, .env guard,
                        reviewer's read-only shell) and subagents (reviewer, ui-check)
.mcp.json               the Playwright MCP server, used by ui-check
pyproject.toml, uv.lock backend dependencies
shared/                 validation-cases.json, read by both test suites
backend/
  main.py               FastAPI app, routers, JSON errors, the built frontend, startup
                        (run migrations, seed if new)
  settings.py           reads DATABASE_URL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and local mode
  auth.py               checks the token, keeps the users table up to date, the local test user
  db.py                 engine, table definitions, transaction helper
  migrations/           Alembic migrations, for SQLite and Postgres alike
  clock.py              today() and now(), the only source of the current date
  money.py              cents and half-up rounding
  schemas.py            Pydantic request models with the field rules
  routes/               organizations, contacts, deals, activities, dashboard, search, me, meta
  services/             the rules: stages, deletes, timelines, dashboard figures, search
  seed.py               sample data, also run by npm run seed
  tests/                pytest
frontend/
  src/
    api/                fetch wrapper (adds the token, handles 401), typed TanStack Query hooks
    auth/               the session: Supabase sign-in, or the local test user
    pages/              Dashboard, Pipeline, the three tables, the three record pages, Sign in
    components/         table, board, dashboard, record, forms, dialogs, fields, shell,
                        top bar (search, account menu)
    lib/                formatting, money parsing, zod schemas, stage rules, board state
    styles/             tokens.css (colours for light and dark mode, type, spacing), global styles
  index.html            sets the theme and loads the global styles before the app loads
  dist/                 the built frontend, ignored by git
e2e/                    Playwright tests, fixtures and helpers
playwright.config.ts    the end-to-end servers, ports, database and local mode
data/                   the local SQLite files, ignored by git
```

### Architecture decisions

Each one says what was decided, why, and what was turned down.

1. `ARC-01` **A React app talking to a JSON API.**
   - **Decided:** for data, the browser only ever calls `/api`. In development Vite forwards those calls to FastAPI. Built, FastAPI serves the frontend's files and the API from one address (`ARC-18`). Either way there's one address and no CORS setup. The browser's only other calls are to Supabase Auth, to sign in and renew the session.
   - **Why:** it matches the tech stack, keeps every rule on the server, and let the database move to Postgres without touching the screens.
2. `ARC-02` **Three layers in the backend.**
   - **Decided:** routes handle HTTP only, services hold every business rule, and the tables module holds the schema.
   - **Why:** a stage change can come from a drag on the board or from the deal form. Both call the same service function, so the probability, the close date, the event and the customer change can't drift apart.
   - **Turned down:** rules inside the route handlers, which would duplicate them between `move` and `PUT`.
3. `ARC-03` **SQLAlchemy Core with Alembic migrations.**
   - **Decided:**
     - Every change to the tables is an Alembic migration in `backend/migrations/`. The backend runs any that are missing when it starts, before it takes requests, on SQLite and Postgres alike.
     - A brand-new database gets its tables from the migrations, then the sample data (`RUN-05`).
     - A local SQLite file from before migrations is brought up to date in place, keeping its data. Its records get no author, so they read "Sample data".
     - The migrations use SQLAlchemy's operations only, with no raw SQL, and each one is tested on SQLite.
   - **Why:** the team's data lives on Supabase now and has to survive every change to the tables. Rebuilding the database with `npm run seed` is no longer an option there.
   - **Turned down:** `metadata.create_all` plus hand-run SQL in Supabase's dashboard, which would let the two databases drift apart.
4. `ARC-04` **The services do the unlinking and cascading.**
   - **Decided:** foreign keys are declared on the tables, but the delete rules (unlink contacts and deals, delete activities and events) are written out in the service, in the same transaction as the delete.
   - **Why:** SQLite only enforces foreign keys after a raw `PRAGMA`, which the stack rules out. Doing it in the service is explicit, easy to test, and works the same on Postgres.
5. `ARC-05` **Money in whole cents, probability in whole percent.**
   - **Decided:** values travel through the API as integer cents. Expected revenue is worked out in cents and rounded half up only at the end. The frontend only formats.
   - **Why:** sums of money must be exact.
   - **Turned down:** floats.
6. `ARC-06` **Automatic entries in their own table.**
   - **Decided:** stage and status changes go in `events`, separate from `activities`. Timelines merge the two when read.
   - **Why:** events have a different shape and can't be edited or deleted. Keeping them apart means the activity form and API never have to guard against them.
7. `ARC-07` **Timelines and dashboard figures are worked out when asked for.**
   - **Decided:** no stored totals, counters or copies of timeline entries. Each request runs the queries.
   - **Why:** at a few hundred records these queries take milliseconds. Nothing has to be kept in step, and changing a deal's main contact moves its history with no extra work.
   - **Revisit if:** a screen gets near the one-second limit.
8. `ARC-08` **Pipeline order is a plain integer per column.**
   - **Decided:** `position` runs 0, 1, 2… within each stage. A move renumbers the column it left and the column it joined, in one transaction.
   - **Why:** simple and correct at this size.
   - **Turned down:** fractional or text ranks, which only pay off with thousands of cards.
9. `ARC-09` **Lists come whole; the tables' search, sort and filter run in the browser.**
   - **Decided:** TanStack Table works on the full list. The top bar's search is the one search that runs on the server (`ARC-20`), because it covers three kinds of record from any page.
   - **Why:** a few hundred rows filter instantly, and paging isn't needed.
   - **Turned down:** server-side paging, and server-side search for the tables.
10. `ARC-10` **Server data through TanStack Query.**
    - **Decided:** every read is a query, and every save invalidates what it affects. For example, saving a deal refreshes the deals list, the board, the dashboard and the timelines involved. Pipeline moves update the board first and roll back if the server refuses.
      - Queries load again when a page opens and when the browser tab comes back into focus, so other people's changes show up without a refresh (`DEC-20`).
      - Signing out clears every query, so the next person on the same browser sees nothing of the last one's session.
    - **Why:** the screens stay in step with the database without a hand-written store.
    - **Turned down:**
      - Redux or a global store
      - live updates pushed from the server, which a small team doesn't need yet.
11. `ARC-11` **Validation in both places; the server has the last word.**
    - **Decided:** Pydantic checks every request, with the same messages the forms show. Zod schemas in the browser give errors as you type. Both apply the same rules, and both test suites run the same good and bad examples from `shared/validation-cases.json`.
    - **Why:** instant feedback in forms, and no bad data even if the browser is skipped.
12. `ARC-12` **One clock.**
    - **Decided:** `backend/clock.py` is the only place that reads the current date and time. `ACCOUNTABLE_TODAY` fixes the date (`2026-11-23`), or the date and time (`2026-11-23T14:00:00`), for tests.
    - **Why:** late deals, overdue follow-ups, "this month" and the 12-month charts all depend on today. Tests need them to give the same result every day.
13. `ARC-13` **One seed function.**
    - **Decided:** `backend/seed.py` fills an empty database, on SQLite or Postgres. Startup uses it when the database is new, and `npm run seed` uses it after clearing every table except `users`. It uses a fixed random seed and dates relative to today, and leaves every record's author empty (`SEED-07`).
    - **Why:** first start and reset give exactly the same data.
14. `ARC-14` **Tests never touch your data, or Supabase.**
    - **Decided:**
      - Each backend test gets a fresh temporary SQLite database. The end-to-end run starts its own servers on other ports with `ACCOUNTABLE_DB` pointing to its own file, which is reseeded before each test.
      - Every suite runs in local mode or with test tokens signed by a key the test makes for itself. No suite reads `DATABASE_URL`, `SUPABASE_URL` or `SUPABASE_PUBLISHABLE_KEY`, even when `.env` has them, and no suite opens a connection to the internet. CI needs no secrets.
    - **Why:** the tech stack requires it, it keeps tests independent of each other, and a test that wiped the team's data would be a disaster.
15. `ARC-15` **Styling with CSS Modules and CSS variables.**
    - **Decided:** `tokens.css` defines the brand colours, fonts and spacing as variables, and each component has its own CSS Module. Inline styles are used only for values that come from data, such as a stage's colour or a chart column's height.
      - The light colours are on `:root`. Dark mode redefines the same variables under `:root[data-theme='dark']`, which also sets `color-scheme: dark` so scrollbars and the browser's date pickers turn dark too.
      - Every colour in the app comes from a token, with no colour values anywhere else: the CSS Modules, the stage and status colours in `lib/stages.ts`, the timeline icons and the charts all use them. Code that hands a colour to a library, such as Recharts, passes it as `var(--token)`.
    - **Why:** each colour is defined in one file, once for each mode. Switching modes changes the variables, and no component needs to know which mode is on.
    - **Turned down:**
      - a CSS framework, which adds a second vocabulary for the same tokens
      - overriding colours for dark mode inside each component.
16. `ARC-16` **Mature libraries for the hard parts.**

    | Need | Library |
    |---|---|
    | Routing | React Router 7 |
    | Server data | TanStack Query 5 |
    | Tables | TanStack Table 8 |
    | Drag and drop | dnd-kit (sortable preset, pointer and keyboard sensors) |
    | Charts | Recharts 3 |
    | Dialogs, menus, popovers, tooltips, messages | Radix UI |
    | Searchable select, the top bar's search | cmdk |
    | Forms and validation | React Hook Form 7 with zod 4 |
    | Icons | Lucide |
    | Fonts | `@fontsource` (Instrument Sans, Instrument Serif, JetBrains Mono) |
    | Sign-in in the browser | Supabase's JavaScript client (`@supabase/supabase-js`), for auth only |
    | Backend | FastAPI, Pydantic, SQLAlchemy Core, uvicorn |
    | Migrations | Alembic |
    | Postgres driver | psycopg 3 |
    | Checking tokens | PyJWT, with its crypto extra, against Supabase's published keys |
    | Tests | pytest with FastAPI's TestClient, Vitest with Testing Library, Playwright Test |

    - **Why:** the tech stack asks for popular, well-supported libraries over custom code. The last four on the backend and Supabase's client came in with sign-in and Postgres; the plan for that change makes the case for each.
    - **Dark mode** needs no library of its own (see "Switching between light and dark" in `docs/specs/theme.md`).
    - **Search** reuses cmdk, already used for the searchable select.
    - **Versions:** the majors above are pinned in the lockfiles. Newer majors of React Router, TanStack Table, Vite, Vitest and TypeScript exist; moving to them is a change of its own.
17. `ARC-17` **Three settings, in `.env` or in Render.**
    - **Decided:**
      - `DATABASE_URL` is the Postgres connection string from Supabase. Render can't reach Supabase's direct connection, which is IPv6 only, so it is the session pooler's address.
      - `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are the project's address and publishable key.
      - On this computer they're read from `.env` at the repo root. On Render they're entered in the service's environment, and `render.yaml` only names them.
      - The browser gets `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from the build, not from the API, so no API route has to be open to tell it. It never gets `DATABASE_URL`.
      - With `ACCOUNTABLE_LOCAL=1`, set by `npm run dev:local` and the tests, the three are ignored: the backend uses SQLite and the built-in test user, and the browser signs in through the backend (`DEC-19`).
    - **Why:** the intent names these three, the publishable key is safe in a browser, and nothing secret is ever committed.
    - **Turned down:** a secret or service-role key on the backend. Checking tokens against Supabase's public keys doesn't need one.
18. `ARC-18` **One web service on Render.**
    - **Decided:** `npm run build` builds the frontend into `frontend/dist/`. FastAPI serves those files, and any address outside `/api` that isn't a file gets `index.html`, so React Router handles it. Render runs the same `npm start` that runs the built app on this computer (`RUN-14`, `RUN-15`).
    - **Why:** Render's free plan gives one web service, and one address needs no CORS.
    - **Turned down:** a separate static site for the frontend, which would need CORS and a second deploy.
19. `ARC-19` **The user comes from the token, in one place.**
    - **Decided:** one FastAPI dependency on the `/api` router checks the token (`AUTH-01`, `AUTH-02`), keeps `users` up to date (`DEC-18`), and hands the user's id to the route. Routes pass it to the services, which write it into `created_by`, `updated_by` and events (`DM-08`). No service reads it from anywhere else.
    - **Why:** a route can't forget to check sign-in, and every write records who made it the same way.
    - **Turned down:** asking Supabase about every request, which would add a round trip to every screen and break the one-second rule (`SC-09`).
20. `ARC-20` **Search matches in Python.**
    - **Decided:** `GET /api/search` reads the id, name and context of every organization, contact and deal, then matches and orders them in Python (`DEC-21`).
    - **Why:** SQLite's `lower()` and `LIKE` fold case for A to Z only, and Postgres folds every letter, so matching in SQL would give different results on the two. A few hundred names take a millisecond or two in Python.
    - **Revisit if:** the records grow into the thousands.

## Data model

`DM-06` SQLAlchemy Core tables in `backend/`, with no raw SQL. Each user action writes in a single transaction.
- Columns use SQLAlchemy's generic types, such as `Date` and `DateTime`. SQLite stores them as ISO 8601 text and Postgres in its own date and timestamp types, both in the backend's local time (`DEC-12`).
- Nothing SQLite-only or Postgres-only is used, so the same tables, queries and migrations run on both.
- Money is stored as whole cents in an integer, so sums are exact.
- Every table has `id` (integer primary key), `created_at` and `updated_at`, set by the server. The `users` table is the exception: its `id` is the Supabase user id (`DM-07`).
- Organizations, contacts, deals, activities and events also record who added them, and the first four who last changed them (`DM-08`).

## API

`API-17` JSON under `/api`, served by FastAPI with Pydantic models.
- Every route needs a signed-in user, and a request without one gets a 401 (`AUTH-01`).
- Request bodies are validated on the server with the same rules and messages as the forms.
- A request that breaks a rule gets a 422 with one message per field, `{"detail": ..., "errors": {"field": "message"}}`, which the form shows next to the field.
- A request for a missing record gets a 404.
- Any other error comes back as JSON with a `detail`.

| ID | Method and path | Purpose |
|---|---|---|
| `API-18` | `GET /api/today` | today's date and the current time from `backend/clock.py`, so the browser never uses its own clock (`DEC-12`) |

Lists return every record; a few hundred of each kind is fine without paging. The tables' search and sorting run in the browser; the top bar's search runs on the server (`API-21`).
