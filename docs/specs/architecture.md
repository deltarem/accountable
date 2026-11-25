# Architecture

Part of the [Accountable spec](../spec.md). How the app is built: the layers, the code layout, the decisions behind them, the rules every table follows and the rules every API route follows.

## Decisions

12. `DEC-12` **"Today".** The app runs on one computer, so "today" is that computer's local date. The backend works it out; the browser never uses its own clock.

### Overview

```
Browser (React app, port 5173)
   |  fetch /api/...   (Vite forwards /api to the backend)
   v
FastAPI (port 8000)
   routes     HTTP in and out, Pydantic models, status codes
   services   business rules, one transaction per user action
   tables     SQLAlchemy Core table definitions and queries
   |
   v
SQLite file (data/accountable.db, or ACCOUNTABLE_DB)
```

### Code layout

```
package.json            root scripts: dev, seed, test; frontend/ as a workspace
scripts/                dev.mjs (one-command start), test-all.mjs (npm test),
                        check-trace.mjs (traceability), and their tests
lefthook.yml            the git pre-commit hook
.claude/                the coding agent's settings, hooks (check on stop, .env guard,
                        reviewer's read-only shell) and subagents (reviewer, ui-check)
.mcp.json               the Playwright MCP server, used by ui-check
pyproject.toml, uv.lock backend dependencies
shared/                 validation-cases.json, read by both test suites
backend/
  main.py               FastAPI app, routers, JSON errors, startup (create tables, seed if new)
  db.py                 engine, table definitions, transaction helper
  clock.py              today() and now(), the only source of the current date
  money.py              cents and half-up rounding
  schemas.py            Pydantic request models with the field rules
  routes/               organizations, contacts, deals, activities, dashboard, meta
  services/             the rules: stages, deletes, timelines, dashboard figures
  seed.py               sample data, also run by npm run seed
  tests/                pytest
frontend/
  src/
    api/                fetch wrapper, typed TanStack Query hooks
    pages/              Dashboard, Pipeline, the three tables, the three record pages
    components/         table, board, dashboard, record, forms, dialogs, fields, shell
    lib/                formatting, money parsing, zod schemas, stage rules, board state
    styles/             tokens.css (colours for light and dark mode, type, spacing), global styles
  index.html            sets dark mode and loads the global styles before the app loads
e2e/                    Playwright tests, fixtures and helpers
playwright.config.ts    the end-to-end servers, ports and database
data/                   the database files, ignored by git
```

### Architecture decisions

Each one says what was decided, why, and what was turned down.

1. `ARC-01` **A React app talking to a JSON API.**
   - **Decided:** the browser only ever calls `/api`. In development Vite forwards those calls to FastAPI, so there's one address and no CORS setup. The app runs on the development servers only; serving a production build comes with the move to Render.
   - **Why:** it matches the tech stack, keeps every rule on the server, and lets the database change later without touching the screens.
2. `ARC-02` **Three layers in the backend.**
   - **Decided:** routes handle HTTP only, services hold every business rule, and the tables module holds the schema.
   - **Why:** a stage change can come from a drag on the board or from the deal form. Both call the same service function, so the probability, the close date, the event and the customer change can't drift apart.
   - **Turned down:** rules inside the route handlers, which would duplicate them between `move` and `PUT`.
3. `ARC-03` **SQLAlchemy Core with no migrations tool yet.**
   - **Decided:** tables are created with `metadata.create_all` when the database is new. If the schema changes, `npm run seed` rebuilds the database.
   - **Why:** the database only holds sample data so far, so there's nothing to migrate. Alembic comes in with Supabase, when real data has to survive changes.
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
9. `ARC-09` **Lists come whole; search, sort and filter run in the browser.**
   - **Decided:** TanStack Table works on the full list.
   - **Why:** a few hundred rows filter instantly, and paging isn't needed.
   - **Turned down:** server-side paging and search.
10. `ARC-10` **Server data through TanStack Query.**
    - **Decided:** every read is a query, and every save invalidates what it affects. For example, saving a deal refreshes the deals list, the board, the dashboard and the timelines involved. Pipeline moves update the board first and roll back if the server refuses.
    - **Why:** the screens stay in step with the database without a hand-written store.
    - **Turned down:** Redux or a global store.
11. `ARC-11` **Validation in both places; the server has the last word.**
    - **Decided:** Pydantic checks every request, with the same messages the forms show. Zod schemas in the browser give errors as you type. Both apply the same rules, and both test suites run the same good and bad examples from `shared/validation-cases.json`.
    - **Why:** instant feedback in forms, and no bad data even if the browser is skipped.
12. `ARC-12` **One clock.**
    - **Decided:** `backend/clock.py` is the only place that reads the current date and time. `ACCOUNTABLE_TODAY` fixes the date (`2026-11-23`), or the date and time (`2026-11-23T14:00:00`), for tests.
    - **Why:** late deals, overdue follow-ups, "this month" and the 12-month charts all depend on today. Tests need them to give the same result every day.
13. `ARC-13` **One seed function.**
    - **Decided:** `backend/seed.py` fills an empty database. Startup uses it when the database is new, and `npm run seed` uses it after clearing every table. It uses a fixed random seed and dates relative to today.
    - **Why:** first start and reset give exactly the same data.
14. `ARC-14` **Tests never touch your data.**
    - **Decided:** each backend test gets a fresh temporary database. The end-to-end run starts its own servers on other ports with `ACCOUNTABLE_DB` pointing to its own file, which is reseeded before each test.
    - **Why:** the tech stack requires it, and it keeps tests independent of each other.
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
    | Searchable select | cmdk |
    | Forms and validation | React Hook Form 7 with zod 4 |
    | Icons | Lucide |
    | Fonts | `@fontsource` (Instrument Sans, Instrument Serif, JetBrains Mono) |
    | Backend | FastAPI, Pydantic, SQLAlchemy Core, uvicorn |
    | Tests | pytest with FastAPI's TestClient, Vitest with Testing Library, Playwright Test |

    - **Why:** the tech stack asks for popular, well-supported libraries over custom code.
    - **Dark mode** needs no library of its own (see "Switching between light and dark" in `docs/specs/theme.md`).
    - **Versions:** the majors above are pinned in the lockfiles. Newer majors of React Router, TanStack Table, Vite, Vitest and TypeScript exist; moving to them is a change of its own.

## Data model

`DM-06` SQLAlchemy Core tables in `backend/`, with no raw SQL. Each user action writes in a single transaction.
- Columns use SQLAlchemy's generic types, such as `Date` and `DateTime`, which SQLite stores as ISO 8601 text, in local time.
- Nothing SQLite-only is used, so the same tables can move to Postgres later.
- Money is stored as whole cents in an integer, so sums are exact.
- Every table has `id` (integer primary key), `created_at` and `updated_at`, set by the server.

## API

`API-17` JSON under `/api`, served by FastAPI with Pydantic models.
- Request bodies are validated on the server with the same rules and messages as the forms.
- A request that breaks a rule gets a 422 with one message per field, `{"detail": ..., "errors": {"field": "message"}}`, which the form shows next to the field.
- A request for a missing record gets a 404.
- Any other error comes back as JSON with a `detail`.

| ID | Method and path | Purpose |
|---|---|---|
| `API-18` | `GET /api/today` | today's date and the current time from `backend/clock.py`, so the browser never uses its own clock (`DEC-12`) |

Lists return every record; a few hundred of each kind is fine without paging. Search and sorting run in the browser.
