# Plan: building the Accountable MVP

This plan builds what `docs/spec.md` describes, to meet the success criteria in `docs/intent.md`. It has five sections:

- **Files that change:** every file the build creates or edits.
- **Order of the work:** the build in phases, each ending in something that runs and a commit. Each phase lists the spec IDs it delivers.
- **Risks:** what could go wrong and what we do about it.
- **Proof:** the unit and end-to-end tests, and the checks by hand.
- **Traceability:** every spec ID, the phase that builds it and what proves it.

Where the spec already decides something, this plan doesn't repeat the reasoning; it points to the spec's section or ID.

**The look:** mockup B (Command deck) was chosen on 23 Nov 2026, and the spec's Screens, Screen structures and Design sections describe it. `docs/mockups/b-dashboard.html` and `b-pipeline.html` are the visual reference. Where they and the spec differ, the spec wins.

**How we know nothing is missed:**
- Every requirement in the spec carries an ID, such as `DEC-07` or `UI-PIPE-06`, and every ID has a row in Traceability.
- `scripts/check-trace.mjs` runs first in `npm test`. It fails if an ID in the spec has no row in Traceability, if a row names an ID the spec doesn't have, or if a row has no phase or no proof.

## Files that change

### Root

| File | What it holds |
|---|---|
| `package.json` | npm workspace (`frontend`) and `@playwright/test` as a dev dependency. Scripts: `dev`, `seed`, and `test`, which runs `test:trace`, `test:scripts`, `test:backend`, `test:frontend` and `test:e2e` in that order |
| `package-lock.json` | written by npm |
| `pyproject.toml`, `uv.lock` | Python 3.12 project: fastapi, uvicorn, sqlalchemy; dev: pytest, httpx. pytest settings (`testpaths = ["backend/tests"]`, `pythonpath = ["."]`) |
| `.python-version` | `3.12`, so uv picks the right Python |
| `.gitignore` | adds `node_modules/`, `data/`, `.venv/`, `test-results/`, `playwright-report/`, `frontend/dist/`, `__pycache__/` |
| `scripts/dev.mjs` | the one-command start (`DEC-03`, `RUN-02`). It has no dependencies of its own. It exports `needsInstall(dir)`, installs Node packages when needed, starts uvicorn and Vite (ports from `BACKEND_PORT` and `FRONTEND_PORT`, defaults 8000 and 5173), and prints the address. One `shutdown()` stops both, including their child processes on Windows. Ctrl+C calls it, and so does a `stop` message from a parent process, which the test uses. |
| `scripts/dev.test.mjs` | tests for `dev.mjs`, run with `node --test` (see Proof) |
| `scripts/check-trace.mjs` | the traceability check described above |
| `shared/validation-cases.json` | good and bad example inputs for every form field, read by both the pytest and Vitest suites so the two sets of rules can't drift apart (`ARC-11`) |
| `docs/STATUS.md` | how to run the app, and a line for each finished phase |
| `docs/spec.md` | changes only if a requirement changes. Any change keeps its ID, or adds a new ID and a Traceability row in the same commit |

### Backend (`backend/`)

| File | What it holds |
|---|---|
| `__init__.py` | marks the package |
| `main.py` | creates the FastAPI app and includes the routers. On startup it creates the tables and seeds a new database, but never reseeds an existing one (`RUN-05`). Errors come back as JSON. |
| `db.py` | the engine, built from `ACCOUNTABLE_DB` (default `data/accountable.db`, creating `data/` if needed) with a 10-second busy timeout. Also the five `Table` definitions, the check constraint that an activity belongs to exactly one record, and a `transaction()` helper that every service write goes through (`DM-06`) |
| `clock.py` | `today()` and `now()`, which honour `ACCOUNTABLE_TODAY` (`ARC-12`) |
| `schemas.py` | Pydantic models for every request and response, with the field rules from the spec's data model |
| `money.py` | cents helpers, and expected revenue rounded half up |
| `routes/organizations.py`, `routes/contacts.py`, `routes/deals.py`, `routes/activities.py`, `routes/dashboard.py`, `routes/meta.py` | thin HTTP handlers. `meta.py` serves `/api/today` (`API-18`) and `/api/industries` (`API-16`). |
| `services/organizations.py`, `services/contacts.py` | create, read, update, delete, list with counts, and delete impact. Deletes unlink or delete linked rows (`ARC-04`). |
| `services/deals.py` | create and update with the stage rules; `move()`, which renumbers positions; delete and delete impact |
| `services/stages.py` | the stage table and `apply_stage_change()`, the one function used by both the form and the board (`ARC-02`) |
| `services/activities.py` | log, edit, delete, and mark a follow-up done |
| `services/timeline.py` | the deal, contact and organization timelines (`TL-01` to `TL-04`) |
| `services/dashboard.py` | everything `GET /api/dashboard` returns (`API-15`) |
| `seed.py` | `seed(conn, today)` builds the sample data. `python -m backend.seed` resets the database, and `--empty` leaves it empty. |
| `tests/conftest.py` | a fresh temporary database per test, a fixed clock, and a TestClient |
| `tests/test_*.py` | see Proof |

### Frontend (`frontend/`)

| File | What it holds |
|---|---|
| `package.json` | react, react-dom, react-router, @tanstack/react-query, @tanstack/react-table, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, recharts, @radix-ui (dialog, alert-dialog, dropdown-menu, popover, toast, tooltip), cmdk (the searchable select), react-hook-form, @hookform/resolvers, zod, lucide-react, and @fontsource for the three fonts. Dev: vite, @vitejs/plugin-react, typescript, vitest, jsdom, @testing-library/react, @testing-library/user-event |
| `vite.config.ts` | React plugin, port from `FRONTEND_PORT` (default 5173), `/api` forwarded to `BACKEND_PORT` (default 8000), Vitest set to jsdom |
| `tsconfig.json`, `index.html`, `src/main.tsx` | the entry point: fonts, global styles, the query client, the router |
| `src/App.tsx`, `src/routes.tsx` | the app shell and the seven addresses (`UI-LAY-04`) |
| `src/styles/tokens.css`, `src/styles/global.css` | the colour, type, spacing and radius tokens (`DES-01` to `DES-04`), and base styles |
| `src/api/client.ts` | `fetch` wrapper: JSON in and out, 422 errors turned into per-field errors, and any other failure turned into an error message (`UI-ERR-01`) |
| `src/api/*.ts` | one typed function and one TanStack Query hook per endpoint, with what each save invalidates (`ARC-10`) |
| `src/lib/format.ts` | dates, date-times, money, short money, percentages and relative dates (`DES-05`) |
| `src/lib/money.ts` | `parseMoney()` for the form (`DEC-04`) |
| `src/lib/schemas.ts` | zod schemas for the four forms |
| `src/lib/stages.ts` | stage names, colours and usual probabilities, `isLate()` and `expectedRevenue()` |
| `src/lib/today.ts` | today and now from `/api/today`, never from the browser's clock (`DEC-12`) |
| `src/components/` | `AppShell`, `IconRail`, `RailLink` (icon button with tooltip), `PageHeader`, `Panel`, `DataTable`, `SearchBox`, `SortableHeader`, `RowActions`, `StatusFilter`, `StageBadge`, `StatusBadge`, `LateBadge`, `EmptyState`, `Skeleton`, `Toaster`, `FormDialog`, `ConfirmDeleteDialog`, the form fields (`TextField`, `SuggestField`, `MoneyField`, `PercentField`, `DateField`, `DateTimeField`, `RecordSelect`, `StageSelect`, `FieldError`), the four forms, `RecordHeader`, `FactList`, `LinkedList`, `Timeline`, `TimelineEntry`, `LogActivityForm`, `FollowUpCheckbox`, the board (`Board`, `StageColumn`, `ColumnHeader`, `DealCard`, `ContactInitials`, `DatePill`, `DealCardOverlay`, `BoardTotals`), and the dashboard (`HeadlinePanel`, `HeadlineFigure`, `RevenueChart`, `WonLostChart`, `FunnelChart`, `PipelineByStage`, `FollowUpList`, `FollowUpGroup`, `ActivityFeed`). Each has its own `.module.css`. |
| `src/pages/` | `DashboardPage`, `PipelinePage`, `DealsPage`, `ContactsPage`, `OrganizationsPage`, `DealPage`, `ContactPage`, `OrganizationPage`, `NotFoundPage` |
| `src/**/*.test.ts(x)` | see Proof |

### End-to-end (`e2e/`)

| File | What it holds |
|---|---|
| `playwright.config.ts` (at the root) | uses the installed Chrome (`channel: 'chrome'`) and one worker. `webServer` starts uvicorn on port 8100 and Vite on 5273, with `ACCOUNTABLE_DB=data/e2e.db` and `ACCOUNTABLE_TODAY=2026-11-23` |
| `e2e/fixtures.ts` | fails any test whose page logs a console error (`UI-ERR-02`). `reseed()` and `empty()` run `uv run python -m backend.seed` against the end-to-end database. `api` makes records directly through the API for tests that need a particular starting point. |
| `e2e/*.spec.ts` | see Proof |

## Order of the work

Each phase ends with `npm test` passing for everything built so far, a line in `docs/STATUS.md`, and a commit. Later phases depend on earlier ones, so they run in order.

### Phase 1: the skeleton

1. Root `package.json` with the workspace and scripts, `pyproject.toml` via `uv init` and `uv add`, `.python-version`, `.gitignore`.
2. Create the frontend with Vite's React and TypeScript template, then add the packages.
3. `backend/main.py` with only `GET /api/today`, and `db.py` with the engine.
4. `scripts/dev.mjs` and `scripts/dev.test.mjs`. Also check by hand on this Windows machine: a first run with no `node_modules`, then Ctrl+C leaves no stray processes and frees both ports.
5. `tokens.css`, `global.css`, the fonts from `@fontsource`, and an `AppShell` with the icon rail and empty pages at each address.
6. `scripts/check-trace.mjs`.
7. Vitest and pytest each with one placeholder test. Playwright with `start.spec.ts` (opens `/` and sees the icon rail) and `offline.spec.ts`. `npm test` runs everything.

**Delivers:** `DEC-02`, `DEC-03`, `RUN-01`, `RUN-02`, `RUN-04`, `ARC-01`, `ARC-14`, `ARC-15`, `DES-01`, `DES-03`, and the start of `API-18` and `UI-LAY-04`.

**Done when:** `npm run dev` on a fresh clone opens the shell at `http://127.0.0.1:5173`, and `npm test` passes.

### Phase 2: data, rules and API

1. `db.py` tables and the `transaction()` helper, `clock.py`, `money.py`, `schemas.py`.
2. Services in this order: organizations, contacts, stages and deals (including `move`), activities, timeline, delete impacts, dashboard.
3. Routes for every endpoint in the spec's API table, including `/api/industries` and `/api/today`.
4. `seed.py` with the spec's sample data, including stage-change events, pipeline positions, the full follow-up mix and the two probabilities set by hand. Seeding on first start only. Wire up `npm run seed`.
5. `shared/validation-cases.json` and the backend tests in Proof, including `test_meta.py`, `test_startup.py` and `test_transactions.py`.

**Delivers:** `DEC-01` (backend), `DEC-07` to `DEC-11`, `DEC-13`, `RUN-03`, `RUN-05`, `ARC-02` to `ARC-08`, `ARC-11` to `ARC-13`, `DM-01` to `DM-06`, `RULE-01` to `RULE-07`, `TL-01` to `TL-04` (backend), `API-01` to `API-18`, `SEED-01` to `SEED-06`.

**Done when:**
- Every backend test passes.
- On 23 Nov 2026, the sample data gives the figures the mockups show: open pipeline $1.130.000, 14 open deals, $668.000 won over 12 months, 4 overdue follow-ups.
- `npm run seed` works with the app running.

### Phase 3: frontend foundation

1. `api/client.ts`, including the error message for failed requests, and the query hooks.
2. `lib/format.ts`, `lib/money.ts`, `lib/stages.ts`, `lib/today.ts`, `lib/schemas.ts`, with their unit tests, including the shared validation cases.
3. Shared components: `Panel`, `PageHeader`, `IconRail` with `RailLink` tooltips and accessible names, the badges, `EmptyState`, `Skeleton`, `Toaster`, `FormDialog`, `ConfirmDeleteDialog`, and the form fields with their keyboard behaviour (spec Forms).
4. `navigation.spec.ts`.

**Delivers:** `DEC-04` (format and parsing), `DEC-05`, `DEC-12` (frontend), `ARC-10`, `ARC-11` (frontend), `UI-LAY-01`, `UI-LAY-02`, `UI-FORM-01`, `UI-DEL-02`, `UI-ERR-01` (client), `DES-05`.

**Done when:** the unit tests and `navigation.spec.ts` pass, and a scratch page shows each component in the brand's look. The scratch page is deleted before the commit.

### Phase 4: the three tables, forms and deleting

1. `DataTable` (TanStack Table) with search, sorting, row actions, keyboard focus, the "12 of 25" footer and its loading placeholder.
2. Organizations, Contacts (with the status filter) and Deals pages. The website link opens in a new tab.
3. The organization, contact and deal forms:
   - create and edit, with server errors shown on their fields
   - in the deal form, a stage change fills in the probability and close date, and the chosen organization's contacts are listed first
   - in the organization form, industry suggestions as you type, and `https://` added to a website with no scheme
   - a confirmation message after saving.
4. Failed saves: the error message shows, and the form stays open with what was typed.
5. Delete with the delete-impact text, and the empty and no-results states.
6. End-to-end tests for tables, forms, deleting, errors and keyboard use.

**Delivers:** `DEC-01` (screens), `ARC-09`, `UI-TBL-01` to `UI-TBL-08`, `UI-FORM-02` to `UI-FORM-07`, `UI-DEL-01`, `UI-EMPTY-01`, `UI-ERR-01`.

**Done when:** success criteria 2, 3 (the filter), 7 and 8 pass end to end.

### Phase 5: record pages, timelines and activities

1. `RecordHeader`, `FactList`, `LinkedList`, and the three record pages with their linked lists. The organization page's "New" buttons start a form with the organization filled in, and the page has no "Log activity" form. Deleting from a record page goes back to its list.
2. `Timeline` and `TimelineEntry`, covering activities, stage changes and status changes, with "on deal ..." for entries rolled up from elsewhere.
3. `LogActivityForm`, editing and deleting an activity, and the follow-up checkbox.
4. End-to-end tests for timelines, record pages, the back button and the customer change.

**Delivers:** `DEC-09` (screens), `TL-01` to `TL-04` (screens), `UI-LAY-04`, `UI-REC-01` to `UI-REC-07`, `UI-DEL-03`, `UI-DEL-04`, `UI-EMPTY-04` (timelines).

**Done when:** success criteria 3 and 5 pass end to end.

### Phase 6: the pipeline board

1. `Board` with dnd-kit's `DndContext` and one `SortableContext` per column, using the pointer and keyboard sensors and a drag overlay. An empty column stays a drop target.
2. `StageColumn`, `ColumnHeader`, `DealCard`, `ContactInitials`, `DatePill`, `BoardTotals`, late cards, and "Add deal" in each open column.
3. Optimistic move: the board and its totals update at once, then `POST /api/deals/{id}/move` is called. On failure the board rolls back and shows a message.
4. End-to-end tests for dragging with the mouse and with the keyboard, onto an empty column, and a failed move.

**Delivers:** `DEC-14`, `ARC-08` (screens), `ARC-10` (rollback), `UI-PIPE-01` to `UI-PIPE-08`, `UI-EMPTY-03`, `DES-04` (drag look).

**Done when:** success criterion 4 passes end to end, including after a reload.

### Phase 7: the dashboard

1. `HeadlinePanel`: the Midnight panel with four `HeadlineFigure`s and `RevenueChart` (a Sea Green line with dots).
2. Then the other panels, all in Recharts or plain HTML, as the spec says:
   - `FunnelChart` (stage columns)
   - `PipelineByStage` (solid stage rows that open the pipeline)
   - `WonLostChart` (won above the line and lost below it)
   - `FollowUpList` with its three groups (ticking a box marks the follow-up done)
   - `ActivityFeed`.
3. Tooltips with full figures, empty states, and loading placeholders for every panel.
4. End-to-end tests for the figures, the links, and the dashboard reacting to changes.

**Delivers:** `DEC-10`, `DEC-11` (screens), `UI-DASH-01` to `UI-DASH-08`, `UI-EMPTY-02`, `UI-EMPTY-04` (dashboard), `UI-EMPTY-05`.

**Done when:** success criteria 1 and 6 pass end to end, and the dashboard matches mockup B by eye.

### Phase 8: finishing

1. The empty-state test after `seed --empty` on every screen, and the speed checks.
2. Responsive check: at 1280px and 1024px the page never scrolls sideways (the board may), and panels stack as the spec says.
3. Compare each screen with mockup B using Playwright screenshots, and fix differences. The tables, record pages and dialogs are reviewed against B's style.
4. Accessibility and brand pass:
   - focus rings, labels on icon buttons, dialog focus
   - contrast against the spec's tables
   - tone of every label and message
   - a code review against `ARC-15` and `ARC-16`.
5. `docs/STATUS.md`: how to run, seed and test, in a few lines.
6. A walk-through by hand, including `npm run dev` from a fresh clone (success criterion 12, see Proof).

**Delivers:** `RUN-06`, `UI-LAY-03`, `DES-02`, `DES-06`, and the final checks of `DES-01` to `DES-04`, `ARC-15` and `ARC-16`.

**Done when:** `npm test` passes from a fresh clone, every Traceability row's proof has passed or been checked, and the walk-through finds nothing open.

## Risks

Ordered by how likely they are to cost time.

1. **Dragging between and within columns (Phase 6), the riskiest step.**
   - **The problem:** dnd-kit sortable across several columns needs care: the card's place while hovering over another column, empty columns as drop targets, and the scroll inside a column.
   - **What we do:**
     - Follow dnd-kit's multiple-containers example closely, and keep the board's state as a plain map from stage to ordered deal ids.
     - The server renumbers positions on every move, so the client never has to work out exact numbers.
     - Build it with the keyboard sensor working from the start. That gives a second way to test it.
2. **Dragging in end-to-end tests.**
   - **The problem:** dnd-kit listens to pointer events, and Playwright's `dragTo` can be too quick for it.
   - **What we do:** tests drag with `mouse.down`, several `mouse.move` steps and `mouse.up`, wait for the move request to finish, then reload and check. A separate test moves a card with the keyboard.
3. **One command on Windows.**
   - **The problem:** spawning `npm` and `uv` needs `shell: true` on Windows. Ctrl+C doesn't always stop the children, which can leave ports busy.
   - **What we do:**
     - `dev.mjs` kills the whole process tree (`taskkill /T /F` on Windows, process groups elsewhere).
     - `dev.test.mjs` checks that both ports are free after a stop.
     - A real Ctrl+C is checked by hand on this Windows machine in Phase 1, because a test can't press it.
     - If a port is busy, `dev.mjs` says so plainly instead of failing quietly.
4. **Today in the browser.**
   - **The problem:** relative dates, the activity form's "now", and filling in today when a deal is won would otherwise use the browser's clock, and disagree with the server's fixed test date.
   - **What we do:** the frontend takes today and now from `GET /api/today` (`API-18`). It reads them once and again each time the window gets focus.
5. **SQLite and the delete rules.**
   - **The problem:** SQLite doesn't enforce foreign keys without a raw `PRAGMA`, so a missed unlink would leave links pointing at deleted records.
   - **What we do:** every delete rule has a backend test that checks the linked rows afterwards. `test_transactions.py` checks that a delete that fails partway changes nothing.
6. **Seeding while the app runs.**
   - **The problem:** `npm run seed` writes while uvicorn may be reading.
   - **What we do:** keep transactions short, set a 10-second busy timeout, and seed in a single transaction. A backend test runs a seed while another connection reads.
7. **Two sets of validation rules.**
   - **The problem:** zod and Pydantic can drift apart.
   - **What we do:** both test suites run the same `shared/validation-cases.json`.
8. **Money input.**
   - **The problem:** the dot-for-thousands format can be misread ("12.5"), and people may paste "$12,500".
   - **What we do:** `parseMoney()` has a unit test for every case in `DEC-04`. Anything unclear is turned down with a message rather than guessed.
9. **Funnel figures depend on stage history.**
   - **The problem:** if the sample data's events don't match each deal's stage, the funnel is wrong.
   - **What we do:** `test_seed.py` checks that every seeded deal's events end at its current stage. `test_dashboard.py` checks the funnel against figures worked out by hand.
10. **End-to-end tests are slow or depend on each other.**
    - **The problem:** tests that change data affect the next one.
    - **What we do:** run one worker, and reseed the end-to-end database before each test. If the whole run passes 5 minutes, add a reset endpoint that only exists when `ACCOUNTABLE_TEST=1`.
11. **Mockup B only covers the dashboard and the pipeline.**
    - **The problem:** the tables, record pages and dialogs have no mockup.
    - **What we do:** build them from the spec's wireframes in B's style, and review their screenshots in Phase 8 before calling the look done.
12. **Brand colours in charts.**
    - **The problem:** the palette check flagged light Marigold, a nearly grey Midnight, and Marigold and Coral being close.
    - **What we do:** charts keep stage names beside every coloured mark and 2px gaps between segments. Small text is checked against the spec's contrast tables in Phase 8.
13. **Library versions.**
    - **The problem:** a major version may have changed an API the spec relies on, such as the React Router or Recharts imports.
    - **What we do:** packages are added with `npm install` and `uv add` at build time, and the lockfiles pin them. If an API has changed, we follow the current docs and note it in `docs/STATUS.md`.
14. **The spec and this plan drift apart.**
    - **The problem:** a requirement added later may never get planned or tested.
    - **What we do:** `check-trace.mjs` fails `npm test` until it has a Traceability row.

## Proof

`npm test` runs, in order:
1. the traceability check
2. the `dev.mjs` tests
3. the backend tests
4. the frontend tests
5. the end-to-end tests.

It fails if any of them fails. The end-to-end tests start their own servers on ports 8100 and 5273, with their own database and the date fixed to 23 Nov 2026, so your data is never touched.

### Script tests (`node --test`)

- **`scripts/check-trace.mjs`**: every ID in `docs/spec.md` has a row in the Traceability table below, every row's ID exists in the spec (or is `SC-01` to `SC-12`), and every row names a phase and a proof.
- **`scripts/dev.test.mjs`**
  - `needsInstall()` is true with no `node_modules`, true when `package-lock.json` is newer, and false otherwise (on temporary folders).
  - Starting `dev.mjs` with ports 8200 and 5373 and a temporary database: `GET /api/today` answers through the frontend's address within 30 seconds.
  - After a `stop` message, both ports are free within 5 seconds.

### Backend unit tests (pytest, `backend/tests/`)

Each test gets a fresh temporary database and a fixed clock.

- **`test_organizations.py`**
  - create with only a name
  - a missing or blank name gives a 422 for that field
  - `https://` is added to a website without one
  - list includes contact count, open deal count and open value
  - edit
  - get a missing record gives a 404
- **`test_contacts.py`**
  - create without an organization
  - status defaults to lead
  - a bad email gives a 422
  - filtering by status in the list data
  - changing status by hand writes a status-change event
- **`test_deals.py`**
  - a deal needs a name and an organization
  - a new deal takes its stage's probability
  - a negative value or a probability outside 0 to 100 gives a 422
  - money stays exact in cents
  - a probability set by hand is kept on edits that don't change the stage
- **`test_stage_rules.py`**
  - every stage change writes one event, with from and to
  - the probability resets to the new stage's figure
  - moving to Won or Lost sets the close date to today
  - moving back out keeps the date, and the deal is late if that date has passed
  - winning makes the main contact a customer and writes their status event
  - winning with no main contact changes nobody
  - winning when the contact is already a customer writes no extra event
  - reopening a won deal leaves the contact a customer
  - the same rules apply through `PUT` and through `move`
- **`test_move.py`**
  - moving within a column, to the top and the bottom
  - moving to another column at a given index, including an empty column
  - both columns are renumbered 0 to n-1 with no gaps
  - an index past the end lands last
  - a missing deal gives a 404
- **`test_late.py`**
  - an open deal with a close date before today is late
  - today itself isn't late
  - won, lost and dateless deals are never late
- **`test_deletes.py`**
  - deleting an organization keeps its contacts and deals with no organization
  - deleting a contact deletes their activities and status events, and keeps their deals with no main contact
  - deleting a deal deletes its activities and events
  - every delete-impact count matches what the delete then does
- **`test_transactions.py`**: a contact delete and a move are each made to fail after their first write. Afterwards every table is exactly as it was before.
- **`test_activities.py`**
  - an activity must belong to exactly one record (0 or 2 gives a 422)
  - a description is required
  - edit, delete, and marking a follow-up done and not done
- **`test_timeline.py`**
  - a deal's timeline merges activities and stage changes, newest first
  - a contact's timeline includes their deals' activities and stage changes, labelled with the deal
  - changing a deal's main contact moves those entries to the new contact
  - an organization's timeline includes its contacts' and deals' entries once each
- **`test_dashboard.py`**, on a small known data set with a fixed today:
  - open pipeline, expected revenue (with rounding), won this month and the change from last month
  - overdue and due-today counts
  - 12 monthly revenue figures and won and lost counts, including the current month and nothing from 13 months ago
  - the funnel for open, won and lost deals, including a lost deal with no history
  - open pipeline by stage
  - the follow-up list (overdue, today, next 7 days, nothing later, nothing done)
  - recent activity (10 newest, nothing in the future)
- **`test_meta.py`**
  - `/api/today` returns the computer's date with no `ACCOUNTABLE_TODAY`, and the fixed date with it
  - `/api/industries` returns each industry in use once, sorted, with no blanks
- **`test_startup.py`**
  - starting the app with a missing database file creates the file, the tables and the sample data
  - starting it again with that file doesn't reseed, so a change made in between survives
- **`test_seed.py`**
  - counts match the spec: 10 organizations, 25 contacts, 30 deals, the stage split, and 13 won and 3 lost
  - each of the last 12 months has a won deal
  - 3 open deals are late
  - every customer is the main contact of a won deal
  - every deal's events end at its current stage, and every column's positions run 0 to n-1
  - the follow-up mix is 4 overdue, 2 due today, 4 due in the next week and 3 later, plus some done
  - exactly two open deals have a probability that differs from their stage's usual figure
  - seeding twice gives the same data
  - `--empty` leaves every table empty
  - seeding while another connection reads doesn't fail
- **`test_validation_cases.py`**: every case in `shared/validation-cases.json` passes or fails in Pydantic as listed.
- **`test_speed.py`**: with the sample data, every `GET` endpoint answers in under 200 ms.

### Frontend unit tests (Vitest, next to the code)

- **`lib/format.test.ts`**
  - `23 Nov 2026`, and `23 Nov 2026, 14:05`
  - `$12.500,00`, `$0,00`, `$1.130.000,00`
  - headline money `$412.500`
  - axis money `$400k` and `$1,2M`
  - `75%`
  - "Today", "Tomorrow", "In 3 days" and "3 days overdue" against a fixed today
- **`lib/money.test.ts`**: `parseMoney` accepts `12500`, `12.500`, `12.500,50`, `$12.500,00` and `0`. It turns down `12.5`, `12,500.00`, `-5`, `abc` and an empty value (which counts as 0 only where the form allows it).
- **`lib/stages.test.ts`**: usual probabilities, open or closed, each stage's colour pair, `isLate`, and `expectedRevenue` rounding.
- **`lib/schemas.test.ts`**: every case in `shared/validation-cases.json` passes or fails in zod as listed.
- **`components/DataTable.test.tsx`**: search filters any text column regardless of case, a heading click sorts ascending then descending, the footer count, the empty and no-results states, and placeholder rows while loading.
- **`components/forms/DealForm.test.tsx`**
  - picking a stage fills in its probability
  - picking Won fills in today
  - errors show under their fields, with focus on the first one
  - with an organization chosen, its contacts come first in the main contact list.
- **`components/ConfirmDeleteDialog.test.tsx`**: shows the impact text, Cancel has focus, and Escape closes it.
- **`components/Board.test.tsx`**: totals and column figures add up open deals only, and Won and Lost show no expected revenue.
- **`pages/DashboardPage.test.tsx`**: while the dashboard query is loading, every panel shows its placeholder in the same layout. When the data arrives, the placeholders are replaced.

### End-to-end tests (Playwright with Chrome, `e2e/`)

Every test reseeds first and fails if the browser's console logs an error.

| Test file | What it does | Criterion |
|---|---|---|
| `start.spec.ts` | open `/`, land on the dashboard; each of the five sections shows sample data | 1 |
| `offline.spec.ts` | visit every screen and open a form; fail if any request goes anywhere but `127.0.0.1` or `localhost` | 1 |
| `navigation.spec.ts` | each rail button has an accessible name, shows its tooltip on hover and on keyboard focus, and opens its address; the current page's button is marked | 1, 8 |
| `organizations.spec.ts` | add, search, sort by each column, edit, delete (checking the dialog's words); reload and check; linked contacts and deals now show "No organization". Also: the website link opens in a new tab, typing "Fin" in Industry suggests "Finance", `acme.example` is saved as `https://acme.example`, and "saved" messages show | 2, 3 |
| `contacts.spec.ts` | the same for contacts; the status filter combined with search; deleting a contact removes their activities and leaves their deals with no main contact | 2, 3 |
| `deals.spec.ts` | the same for deals; a late deal is marked; changing the stage in the form changes the probability and adds a timeline entry; "Deal saved" shows | 2, 4, 5 |
| `errors.spec.ts` | make a deal save fail (Playwright `route`): the message "Couldn't save the deal. Try again." shows and the form stays open with what was typed. Make a list fail to load: a message shows instead of a blank page | 7 |
| `persistence.spec.ts` | make changes, stop and restart the backend, and check they're still there; `seed` brings back the sample data | 2 |
| `records.spec.ts` | the organization page lists its contacts and deals; its "New contact" and "New deal" start with the organization filled in; it has no "Log activity"; deleting from a record page goes back to its list; the browser's back button returns to the previous page | 3 |
| `pipeline.spec.ts` | drag a card to another column; totals change before the reload; reload, and the stage, probability and place are kept; the deals table shows the new stage and probability; drag within a column, higher and lower, and reload; add a deal in a column and it starts at that stage; late cards are marked. Also: from an empty database with one deal made through the API, drag it into an empty column; and make a move fail (`route`), then check the card goes back and a message shows | 4 |
| `pipeline-keyboard.spec.ts` | move a card to another column with space, the arrow keys and space | 4, 8 |
| `timeline.spec.ts` | log a call with a follow-up on a deal; it shows first on the deal, on its main contact (with "on deal ...") and on its organization; edit it, delete it | 5 |
| `follow-ups.spec.ts` | a new follow-up due tomorrow appears on the dashboard; tick it done and it leaves the list and the headline count drops | 5, 6 |
| `win.spec.ts` | drag a deal to Won; the main contact becomes a customer with a timeline entry; the dashboard's won this month, revenue chart and funnel change | 6 |
| `dashboard.spec.ts` | the headline figures, chart tooltips, funnel, stage rows and won and lost bars show the seeded figures; clicking a stage row opens the pipeline; each activity and follow-up link opens its record | 6 |
| `validation.spec.ts` | each form shows the right message for a missing name, a bad email, a negative value and a probability of 120, and saves nothing until fixed | 7 |
| `keyboard.spec.ts` | create a contact using only the keyboard: Tab to the button, Enter, fill in the fields, Enter saves; Escape closes a dialog; Tab and Enter open a row from a table | 8 |
| `speed.spec.ts` | each screen shows its data within 1 second of navigating; a save shows its result within 1 second | 9 |
| `empty.spec.ts` | after `seed --empty`, every table, timeline, chart and the board shows its empty state, and adding the first record works | 10 |
| `visual.spec.ts` | screenshots of every screen at 1280px and 1024px in `test-results/screens/`, for comparing with mockup B. At both widths it checks the page doesn't scroll sideways (the board may) and that all six pipeline columns are visible at 1280px. The screenshots are a record for review, not a pixel comparison | 11 |

### Checks by hand

- **Criterion 11 and the design IDs:** compare the screenshots from `visual.spec.ts` with mockup B, and check them against the brand skill:
  - fonts and colours
  - no one-edge borders and no gradients
  - the contrast pairs in the spec
  - the tone of labels and messages.
- **Windows Ctrl+C:** in Phase 1, press Ctrl+C on `npm run dev` and check that no Python or Node process is left and that both ports are free.
- **Code review:** before the merge, check the styling (`ARC-15`) and the libraries in use (`ARC-16`).
- **Criterion 12:** before calling the MVP done, run `npm run dev` from a fresh clone and use every section and every action the way a salesperson would, with the browser's console open. Note anything found in `docs/STATUS.md`, fix it, and repeat.

## Traceability

Every requirement ID in `docs/spec.md` and every success criterion in `docs/intent.md`, with the phase that builds it and what proves it. "By hand" points to Checks by hand above. `scripts/check-trace.mjs` keeps this table complete.

### Decisions

| ID | Requirement | Phase | Proof |
|---|---|---|---|
| DEC-01 | Deal can lose its organization; form requires one | P2, P4 | test_deletes, organizations.spec |
| DEC-02 | Fonts bundled; no internet needed | P1 | offline.spec |
| DEC-03 | One command installs and starts | P1 | dev.test.mjs; Windows Ctrl+C by hand |
| DEC-04 | Money format and input rules | P3, P4 | format.test, money.test, validation.spec |
| DEC-05 | Stage colours by meaning | P3, P6, P7 | stages.test, visual.spec, by hand |
| DEC-06 | Contrast pairs | P3, P8 | by hand against the spec's contrast tables |
| DEC-07 | Close date rules | P2, P4 | test_stage_rules, test_late, DealForm.test |
| DEC-08 | Undoing a win keeps the customer | P2 | test_stage_rules |
| DEC-09 | Every status change in the timeline | P2, P5 | test_contacts, test_timeline |
| DEC-10 | Funnel from stage history | P2, P7 | test_dashboard, test_seed, dashboard.spec |
| DEC-11 | Follow-ups: overdue, today, 7 days | P2, P7 | test_dashboard, follow-ups.spec |
| DEC-12 | Today from the server only | P1, P2, P3 | test_meta, format.test, e2e on a fixed date |
| DEC-13 | Sample dates relative to today | P2 | test_seed |
| DEC-14 | Pipeline by keyboard | P6 | pipeline-keyboard.spec |

### How it runs

| ID | Requirement | Phase | Proof |
|---|---|---|---|
| RUN-01 | Only Node and uv needed | P1 | walk-through from a fresh clone (by hand) |
| RUN-02 | `npm run dev` behaviour | P1 | dev.test.mjs; Windows Ctrl+C by hand |
| RUN-03 | `npm run seed` resets | P2 | test_seed, persistence.spec |
| RUN-04 | `npm test` runs every suite on its own servers | P1 | the `npm test` run itself |
| RUN-05 | Database file, `ACCOUNTABLE_DB`, seeding when new | P1, P2 | test_startup |
| RUN-06 | STATUS.md explains how to run | P8 | by hand |

### Architecture

| ID | Requirement | Phase | Proof |
|---|---|---|---|
| ARC-01 | React app, JSON API, one address | P1 | every e2e test |
| ARC-02 | One stage-change function for form and board | P2 | test_stage_rules |
| ARC-03 | `create_all`, no migrations tool | P2 | test_startup |
| ARC-04 | Services do unlinking and cascading | P2 | test_deletes |
| ARC-05 | Money in cents, rounding half up | P2 | test_deals, test_dashboard |
| ARC-06 | Automatic entries in `events` | P2 | test_stage_rules, test_timeline |
| ARC-07 | Figures worked out when asked for | P2 | test_timeline, test_speed |
| ARC-08 | Integer positions per column | P2, P6 | test_move, pipeline.spec |
| ARC-09 | Whole lists, search and sort in the browser | P2, P4 | DataTable.test |
| ARC-10 | Query invalidation, optimistic move, rollback | P3, P6 | follow-ups.spec, win.spec, pipeline.spec |
| ARC-11 | Same validation in both places | P2, P3 | test_validation_cases, schemas.test |
| ARC-12 | One clock | P2 | test_meta, conftest fixed clock |
| ARC-13 | One seed function | P2 | test_seed, test_startup |
| ARC-14 | Tests never touch your data | P1, P2 | conftest, playwright config |
| ARC-15 | CSS Modules and tokens | P1, P3 | code review (by hand) |
| ARC-16 | Named libraries | P1, P3–P7 | code review (by hand) |

### Data model and rules

| ID | Requirement | Phase | Proof |
|---|---|---|---|
| DM-01 | Organizations table | P2 | test_organizations |
| DM-02 | Contacts table | P2 | test_contacts |
| DM-03 | Deals table | P2 | test_deals |
| DM-04 | Activities table | P2 | test_activities |
| DM-05 | Events table | P2 | test_stage_rules |
| DM-06 | One transaction per user action | P2 | test_transactions |
| RULE-01 | New deal takes its stage's probability | P2 | test_deals |
| RULE-02 | Stage change resets probability | P2, P4 | test_stage_rules, DealForm.test |
| RULE-03 | Probability set by hand kept until the stage changes | P2 | test_deals |
| RULE-04 | Every stage change writes an event | P2 | test_stage_rules |
| RULE-05 | Winning makes the contact a customer | P2 | test_stage_rules, win.spec |
| RULE-06 | Late deals | P2, P3 | test_late, stages.test |
| RULE-07 | Expected revenue; open deals only | P2, P3 | test_dashboard, stages.test, Board.test |
| TL-01 | Deal timeline | P2, P5 | test_timeline, timeline.spec |
| TL-02 | Contact timeline with deal roll-up | P2, P5 | test_timeline, timeline.spec |
| TL-03 | Organization timeline | P2, P5 | test_timeline, timeline.spec |
| TL-04 | Newest first, with source labels | P2, P5 | test_timeline, timeline.spec |

### API

| ID | Requirement | Phase | Proof |
|---|---|---|---|
| API-01 | Organization list with counts | P2 | test_organizations |
| API-02 | Organization create, edit, delete | P2 | test_organizations, test_deletes |
| API-03 | Organization detail | P2 | test_timeline |
| API-04 | Organization delete-impact | P2 | test_deletes |
| API-05 | Contact list | P2 | test_contacts |
| API-06 | Contact create, read, edit, delete | P2 | test_contacts, test_deletes |
| API-07 | Contact delete-impact | P2 | test_deletes |
| API-08 | Deal list with `late` | P2 | test_deals, test_late |
| API-09 | Deal create, read, edit, delete | P2 | test_deals, test_deletes |
| API-10 | Deal delete-impact | P2 | test_deletes |
| API-11 | Move | P2 | test_move |
| API-12 | Log an activity | P2 | test_activities |
| API-13 | Edit or delete an activity | P2 | test_activities |
| API-14 | Mark a follow-up done | P2 | test_activities |
| API-15 | Dashboard | P2 | test_dashboard |
| API-16 | Industries | P2 | test_meta |
| API-17 | 422 per field, 404 when missing | P2 | test_organizations, test_contacts, test_deals |
| API-18 | Today | P1, P2 | test_meta |

### Screens

| ID | Requirement | Phase | Proof |
|---|---|---|---|
| UI-LAY-01 | Icon rail with tooltips and names | P1, P3 | navigation.spec |
| UI-LAY-02 | Title row | P1, P3 | navigation.spec, visual.spec |
| UI-LAY-03 | 1280px and 1024px | P8 | visual.spec |
| UI-LAY-04 | Addresses and back button | P1, P5 | navigation.spec, records.spec |
| UI-DASH-01 | Headline panel figures | P7 | dashboard.spec |
| UI-DASH-02 | Revenue line chart | P7 | dashboard.spec, win.spec |
| UI-DASH-03 | Funnel | P7 | dashboard.spec, win.spec |
| UI-DASH-04 | Pipeline by stage rows, open the pipeline | P7 | dashboard.spec |
| UI-DASH-05 | Won and lost chart | P7 | dashboard.spec |
| UI-DASH-06 | Follow-ups grouped, tick done | P7 | follow-ups.spec |
| UI-DASH-07 | Recent activity | P2, P7 | test_dashboard, dashboard.spec |
| UI-DASH-08 | Fetched again on opening | P7 | win.spec, follow-ups.spec |
| UI-TBL-01 | Search | P4 | DataTable.test, table specs |
| UI-TBL-02 | Sorting | P4 | DataTable.test, table specs |
| UI-TBL-03 | Open a record; keyboard | P4 | keyboard.spec |
| UI-TBL-04 | Row actions | P4 | table specs |
| UI-TBL-05 | Footer count | P4 | DataTable.test |
| UI-TBL-06 | Columns; website in a new tab | P4 | table specs, organizations.spec |
| UI-TBL-07 | Contact status filter | P4 | contacts.spec |
| UI-TBL-08 | Late marker, "No organization" | P4 | deals.spec, organizations.spec |
| UI-REC-01 | Record header | P5 | records.spec |
| UI-REC-02 | Organization page, "New" buttons filled in | P5 | records.spec |
| UI-REC-03 | Contact page | P5 | timeline.spec, records.spec |
| UI-REC-04 | Deal page | P5 | deals.spec, records.spec |
| UI-REC-05 | Log activity form | P5 | timeline.spec |
| UI-REC-06 | Timeline entries | P5 | timeline.spec |
| UI-REC-07 | No "Log activity" on organizations | P5 | records.spec |
| UI-PIPE-01 | Totals strip | P6 | pipeline.spec |
| UI-PIPE-02 | Six columns, scrolling | P6 | visual.spec |
| UI-PIPE-03 | Column headers | P6 | Board.test, pipeline.spec |
| UI-PIPE-04 | Cards, late pill, initials | P6 | pipeline.spec |
| UI-PIPE-05 | Add deal in a column | P6 | pipeline.spec |
| UI-PIPE-06 | Drag and keep after reload | P6 | pipeline.spec |
| UI-PIPE-07 | Roll back a failed move | P6 | pipeline.spec |
| UI-PIPE-08 | Drop onto an empty column | P6 | pipeline.spec |
| UI-FORM-01 | Dialog keyboard behaviour | P3, P4 | keyboard.spec |
| UI-FORM-02 | Field errors | P3, P4 | validation.spec, DealForm.test |
| UI-FORM-03 | Searchable select, organization's contacts first | P4 | DealForm.test |
| UI-FORM-04 | Deal form fills in probability and date | P4 | DealForm.test |
| UI-FORM-05 | After saving | P4 | deals.spec, organizations.spec |
| UI-FORM-06 | Industry suggestions | P4 | test_meta, organizations.spec |
| UI-FORM-07 | Form adds `https://` | P4 | organizations.spec, test_organizations |
| UI-DEL-01 | Delete impact text | P4, P5 | table specs, ConfirmDeleteDialog.test |
| UI-DEL-02 | Cancel focus, Delete in Raspberry | P3 | ConfirmDeleteDialog.test |
| UI-DEL-03 | Back to the list after deleting | P5 | records.spec |
| UI-DEL-04 | Activity delete wording | P5 | timeline.spec |
| UI-EMPTY-01 | Empty table, no results | P4 | DataTable.test, empty.spec |
| UI-EMPTY-02 | Empty charts | P7 | empty.spec |
| UI-EMPTY-03 | Empty pipeline column | P6 | empty.spec |
| UI-EMPTY-04 | Empty follow-ups, activity, timeline | P5, P7 | empty.spec |
| UI-EMPTY-05 | Loading placeholders | P4, P7 | DataTable.test, DashboardPage.test |
| UI-ERR-01 | Error message, form stays open | P3, P4 | errors.spec |
| UI-ERR-02 | No console errors | all | fixture in every e2e test |

### Design and sample data

| ID | Requirement | Phase | Proof |
|---|---|---|---|
| DES-01 | Colour tokens | P1 | visual.spec, by hand |
| DES-02 | Contrast tables | P8 | by hand |
| DES-03 | Type | P1, P3 | visual.spec, by hand |
| DES-04 | Shape, spacing, focus ring, drag look | P3, P6, P8 | visual.spec, by hand |
| DES-05 | Formats | P3 | format.test |
| DES-06 | Tone | P3–P8 | by hand |
| SEED-01 | Counts and stage split | P2 | test_seed |
| SEED-02 | A win every month, 3 late deals | P2 | test_seed |
| SEED-03 | Every customer has a won deal | P2 | test_seed |
| SEED-04 | Events match stages, positions set | P2 | test_seed |
| SEED-05 | Follow-up mix | P2 | test_seed |
| SEED-06 | Two probabilities set by hand | P2 | test_seed |

### Success criteria (`docs/intent.md`)

| ID | Requirement | Phase | Proof |
|---|---|---|---|
| SC-01 | Start with one command, sample data everywhere | P1, P7 | start.spec, offline.spec, dev.test.mjs |
| SC-02 | Add, find, sort, edit, delete; kept after restart; reset | P2, P4 | table specs, persistence.spec |
| SC-03 | Status filter; linked records on each page | P4, P5 | contacts.spec, records.spec |
| SC-04 | Pipeline drag, totals, late deals | P6 | pipeline.spec, pipeline-keyboard.spec |
| SC-05 | Timelines and follow-ups | P5, P7 | timeline.spec, follow-ups.spec |
| SC-06 | Dashboard figures; winning makes a customer | P7 | dashboard.spec, win.spec |
| SC-07 | Form validation | P4 | validation.spec, errors.spec |
| SC-08 | Keyboard use | P3, P4, P6 | keyboard.spec, navigation.spec, pipeline-keyboard.spec |
| SC-09 | Under a second | P8 | speed.spec, test_speed |
| SC-10 | Empty states | P8 | empty.spec |
| SC-11 | Professional, on brand | P8 | visual.spec, by hand |
| SC-12 | Used end to end by a person | P8 | walk-through (by hand) |
