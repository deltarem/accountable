# Spec: Accountable

This spec describes Accountable as it stands today: the problem it solves, how it behaves, how it looks and how it's built. Read it first. It is the reference for every change.

A change starts in its own folder, `docs/changes/<branch name>/`:
- `intent.md` says what the change should achieve.
- `plan.md` says how it will be built and tested.

When the change is finished, this spec is updated so it describes the product with the change in it. Older change folders are history.

The look follows the brand skill (`.claude/skills/brand/SKILL.md`), and the stack follows `docs/TECH_STACK.md`. How the code is organised is in `docs/frontend-architecture.md` and `docs/backend-architecture.md`.

## The problem

A small business keeps track of its customers and sales in spreadsheets, inboxes and people's heads. Nobody can see at a glance:
- which companies we deal with
- who our contacts are
- what's in the sales pipeline
- what happened last with a customer
- what needs doing next.

## What Accountable is

Accountable is a business management system: a sales CRM that will grow into a full Business OS, including ERP. Today it is a complete sales CRM for one person, running on their own computer. It does the everyday CRM essentials well, and it is meant to feel sharp, modern and professional.

It has five sections:
- **Dashboard**, the landing page: how sales are going at a glance.
- **Pipeline**: the deals as cards on a board, one column per stage.
- **Deals**, **Contacts** and **Organizations**: a searchable, sortable table of each, with a page for every record.

It has four kinds of record:
- **Organization**: a company we do business with.
- **Contact**: a person we deal with. A lead is simply a contact with the lead status.
- **Deal**: a potential sale, with a stage, a value in US dollars, a probability of close and a close date.
- **Activity**: a note, call or email logged on a contact or a deal, optionally with a follow-up date.

It comes with realistic sample data, so every screen looks alive the first time it starts.

### How it answers the problem

- **Which companies we deal with:** the Organizations table, and each organization's page with its contacts, deals and timeline.
- **Who our contacts are:** the Contacts table, filtered by lead, qualified or customer.
- **What's in the sales pipeline:** the Pipeline board with its totals and expected revenue, and the dashboard's headline figures, funnel and pipeline by stage.
- **What happened last with a customer:** each contact's and organization's timeline, newest first, with deal activity rolled up, and the dashboard's recent activity.
- **What needs doing next:** follow-ups on the dashboard, overdue first, and late deals marked in the table and on the board.

## Who uses it

- One salesperson, using Accountable on their own computer every day. For now that's the person building it: a course project, built to show a polished, complete product rather than to run a live business yet. The rest of the sales team joins later.
- No other systems are involved.

## Constraints

- The technology in `docs/TECH_STACK.md`.
- It runs locally with one documented command that works on Mac, Linux and Windows, and needs no internet connection to use.
- Every change is kept: it's still there after a browser refresh, and every time the app starts it shows every change made before.
- One documented command resets the data to the sample data.
- It handles a few hundred of each kind of record comfortably. Paging or virtual scrolling for thousands of records isn't needed.

### Not in the product

- sign-in, user accounts, or several users
- following the device's own dark mode setting (the app has its own toggle)
- a layout for phones
- AI features
- email, calendar or phone integrations
- currencies other than US dollars
- reports beyond the dashboard
- tags or custom fields
- changing the pipeline stages or their usual probabilities
- importing or exporting data.

One thing is designed to make later work easier, though nothing is built for it yet: the API is the only way into the data, so a hosted database can replace SQLite.

### Later

- **Sign-in, several people sharing the same data, and a record of who did what.** No table has an owner or author column yet. Adding users means adding a `user_id` to records and to `events`. The `events` table is already the place where a history of changes would grow.
- **Use beyond one computer.** The browser only talks to the JSON API, and the tables avoid anything SQLite-only. Moving to Supabase's Postgres and hosting on Render changes the backend's connection and deployment, not the screens.

## Success criteria

The product meets these today. A change must keep them true, or say in its intent which one it changes.

1. `SC-01` Someone non-technical can start Accountable with the one documented command, open it in a browser and land on the dashboard, with sample data on every screen.
2. `SC-02` Organizations, contacts (leads, qualified contacts and customers) and deals can each be added, found by searching, sorted, edited and deleted from their tables.
   - Every change is still there after a refresh and after a restart.
   - Deleting asks first, says what will happen to linked records, and does exactly that.
   - The reset command brings back the sample data.
3. `SC-03` Contacts can be filtered by status, and each record's page shows the records it's linked to.
4. `SC-04` The pipeline board:
   - Dragging a deal to another column changes its stage and its probability of close, and the deals list shows both.
   - A card dropped anywhere in a column, including higher or lower in its own column, stays there after a refresh.
   - The board's and the columns' totals and expected revenue change as soon as the card moves.
   - A deal added in a column starts at that stage, and late deals stand out.
5. `SC-05` Timelines and follow-ups:
   - An activity or follow-up logged on a contact or deal appears in its timeline, newest first, and so does an entry for each change of stage.
   - Activity on a deal also shows on its main contact's and its organization's timelines.
   - Follow-ups show on the dashboard as upcoming or overdue until they're marked done.
6. `SC-06` The dashboard's figures match the data, and they reflect a deal marked won or a new follow-up. Winning a deal makes its main contact a customer.
7. `SC-07` Forms show clear errors for a missing required field, a badly formed email, a negative value or a probability outside 0 to 100%, and nothing is saved until they're fixed.
8. `SC-08` Forms and tables can be used with the keyboard: Tab moves between fields, Enter submits, Escape closes a dialog.
9. `SC-09` With the sample data, every screen loads and every action responds in under a second.
10. `SC-10` Every table, timeline and chart still looks right with no data in it, for example after deleting everything.
11. `SC-11` Every screen is sharp, modern and professional, and follows the brand. The dashboard is visually stunning, with a line chart, a bar chart and a visual of the pipeline.
12. `SC-12` Before a change is called done, someone has used it end to end in a real browser, the way a salesperson would: every section and action it touches, each screen checked by eye, with no errors in the browser's console. Passing tests is necessary, but it isn't enough.
13. The toggle at the foot of the rail switches every screen, chart, dialog and message between light and dark mode.
    - Light mode is the default, and it looks as it did before dark mode was added, apart from the toggle.
    - The choice is still there after a refresh and after a restart.
    - Dark mode text meets the same contrast rules as light mode (`DEC-06`).

## Requirement IDs

Each requirement in this spec carries an ID in code style, such as `DEC-07`.

| Prefix | Section of this spec |
|---|---|
| `SC` | Success criteria |
| `DEC` | Decisions |
| `RUN` | How it runs |
| `ARC` | Architecture, Decisions |
| `DM`, `RULE`, `TL` | Data model: tables, stage rules, timelines |
| `API` | API |
| `UI-LAY`, `UI-DASH`, `UI-TBL`, `UI-REC`, `UI-PIPE`, `UI-FORM`, `UI-DEL`, `UI-EMPTY`, `UI-ERR` | Screens: layout, dashboard, tables, record pages, pipeline, forms, deleting, empty and loading states, errors |
| `DES` | Design |
| `SEED` | Sample data |

The rules for IDs:
- An ID never changes meaning. A requirement that changes keeps its ID; a new requirement gets a new ID.
- A change's `plan.md` has a Traceability table: each ID the change adds or touches, the phase that builds it, and the test or check that proves it.
- `scripts/check-trace.mjs` runs first in `npm test`. It fails if an ID here has no row in the plan, or a row names an ID this spec doesn't have.

## Decisions

These settle questions where a simpler reading of the product would be wrong or unclear. The rest of the spec follows them.

1. `DEC-01` **Deals that lose their organization.** A deal needs an organization, but deleting an organization keeps its deals with no organization. Both rules stand:
   - The database allows a deal with no organization.
   - The table and the deal's page show "No organization".
   - The deal form won't save until one is chosen.

   So a deal can sit without an organization until it's next edited.
2. `DEC-02` **Fonts with no internet.** The brand's fonts are bundled with the app through the `@fontsource` npm packages, so nothing is fetched from Google at runtime.
3. `DEC-03` **"One command" and installing.** `npm run dev` runs a small Node script with no dependencies of its own. On the first run it installs what's missing (`npm install`; uv sets up Python and the backend packages by itself), then starts both servers.
   - The only things to install beforehand are Node 24 or later and uv.
   - The first run needs an internet connection to download packages; after that, none.
4. `DEC-04` **The money format.** Money shows as `$12.500,00`: a US dollar sign on European separators. That's unusual for US dollars, but it's used everywhere, forms included.
   - Forms accept `12500`, `12.500`, `12.500,50` and `$12.500,00`, and turn down `12.5` with "Use a comma for cents, like 12.500,50".
   - Headline figures on the dashboard drop the cents (`$412.500`).
   - Chart axes shorten amounts (`$400k`), and their tooltips show the full figure.
5. `DEC-05` **Six stages, five brand colours.** The brand gives five colours for things side by side, in a fixed order. The stages get colours by meaning instead:
   - New Cerulean, Qualified Marigold, Proposal Coral, Negotiation Midnight, Won Sea Green, and Lost a grey taken from Sea Mist.
   - Raspberry is kept for things that need attention, such as late deals and overdue follow-ups.
   - Because Marigold and Coral sit close together, and Midnight is nearly grey, every coloured mark in a chart has its stage name beside it, and segments have 2px gaps.
6. `DEC-06` **Contrast.** The brand's bright colours fail contrast at small sizes:
   - White text on Cerulean (3.96:1) and on Raspberry (3.62:1) falls below the 4.5:1 that small text needs.
   - Sea Green, Marigold and Coral text on white is far too faint (1.6 to 2.4:1), as the brand itself warns.

   So badges and small labels use a pale tint of the colour with darker text in the same hue (all 4.8:1 or better, listed under Design). Solid fills carry Midnight text, or white text only at 16px semibold or larger.

   The solid stage blocks also hold small text, so they use these pairs, all checked:
   - white on the darker Cerulean `#0D6E8F` (5.8:1)
   - Midnight on Marigold (7.5:1), Coral (5.1:1), Sea Green (6.4:1) and the Lost grey (4.6:1)
   - white on Midnight.

   On Midnight panels:
   - labels use `#9FB4BA` (5.6:1)
   - Sea Green figures are 6.4:1
   - a Raspberry figure (3.3:1) is used only at 28px or larger.

   Dark mode follows the same rules. Its pairs are listed under Design (`DES-01`, `DES-02` and "Dark mode").
7. `DEC-07` **Close dates.**
   - The close date is optional while a deal is open, and a deal with no close date is never late.
   - Moving a deal to Won or Lost, by dragging or in the form, sets its close date to today. The form shows that date and it can be changed before saving, so a deal won last week can be recorded properly.
   - Moving a deal back out of Won or Lost keeps the date. If that date has passed, the deal is late at once, which prompts a new expected date.
8. `DEC-08` **Undoing a win.**
   - If a won deal is moved back to an open stage, its main contact stays a customer.
   - Winning a deal with no main contact changes no contact.
   - Winning one whose contact is already a customer adds no entry to their timeline.
9. `DEC-09` **Status changes in the timeline.** Every change of a contact's status makes an entry, whether it was made by hand or by a win, for example "Status changed from Lead to Qualified".
10. `DEC-10` **What the funnel counts.** "How much value reaches each stage" is worked out from stage history. It covers open deals and deals closed in the last 12 months:
    - A deal counts towards its current stage and every open stage before it.
    - A won deal counts towards every stage.
    - A lost deal counts towards every stage up to the last one it was in before it was lost. A lost deal with no stage history counts towards New only.
11. `DEC-11` **Which follow-ups the dashboard shows.** "Coming up" means due in the next 7 days.
    - The dashboard lists every overdue follow-up, then those due today, then those due in the next 7 days.
    - Later ones show on their contact or deal page only.
12. `DEC-12` **"Today".** The app runs on one computer, so "today" is that computer's local date. The backend works it out; the browser never uses its own clock.
13. `DEC-13` **Sample data dates.** Sample dates are relative to the day the data is created, so the dashboard's last 12 months are always filled on a fresh start or after `npm run seed`. Data seeded months ago looks older, which is expected; reseeding fixes it.
14. `DEC-14` **Keyboard use on the pipeline.** Cards can be moved with the keyboard as well as the mouse:
    - Space picks a card up and drops it.
    - Left and right move it to the neighbouring column; up and down move it within its column.
    - Escape cancels the move.
    - Enter opens the deal.
15. **Dark surfaces.** The brand gives dark mode a `#04232E` page with black panels and cards. It leaves three things open:
    - **Cards inside panels.** Pipeline cards, follow-up rows and "Add deal" buttons sit inside black panels, where black would hide them. They use `#0F2027`, one step lighter, the way the light mode's pale grey sits on white.
    - **The Midnight panels.** The rail, the dashboard's headline panel and the pipeline's totals strip stay Midnight in both modes. They still stand out on the dark page, and their figures and labels keep the contrast listed under `DEC-06`.
    - **Midnight everywhere else.** Midnight fills elsewhere would almost vanish on black. In dark mode they become Sea Mist `#CDD8DB` with Midnight text (8.3:1). That covers main action buttons, the initials circle, the note icon, the Negotiation stage, the chosen status filter and activity type, tooltips and confirmation messages. Negotiation already uses Sea Mist on the totals strip, so it looks the same everywhere in dark mode.
16. **Where the light or dark choice is kept.** In the browser's localStorage, not in the database.
    - The choice belongs to the browser: a different browser on the same computer starts in light mode.
    - The device's own dark mode setting is ignored. Light mode is the default until the toggle is used.
    - The saved choice is applied before the page first draws, so a page in dark mode never shows light mode first.
    - If the browser blocks localStorage, the toggle still works until the page is closed, and the app starts in light mode next time.

## How it runs

- `RUN-01` **Prerequisites:** Node 24 or later and uv. Google Chrome is needed only for the end-to-end tests.
- `RUN-02` **`npm run dev`** runs `scripts/dev.mjs`:
  1. It installs Node packages if `node_modules` is missing or older than `package-lock.json`.
  2. It starts the backend with `uv run uvicorn` on `127.0.0.1:8000` and the frontend with Vite on `127.0.0.1:5173`. `BACKEND_PORT` and `FRONTEND_PORT` choose other ports.
  3. If a port can't be used, it says why before starting anything: already in use, or blocked by the system (Windows can reserve whole port ranges). It also says how to pick another port.
  4. It prints the address to open.
  5. Ctrl+C stops both servers and everything they started.
  6. Vite forwards `/api` to the backend, so the browser only talks to one address.
- `RUN-03` **`npm run seed`** deletes all data and loads the sample data again, in one transaction. It works whether or not the app is running; a running app shows the new data on its next refresh. `npm run seed -- --empty` leaves every table empty.
- `RUN-04` **`npm test`** runs every suite in order:
  1. the traceability check
  2. the script tests (`node --test`)
  3. the backend tests (pytest)
  4. the frontend tests (Vitest)
  5. the end-to-end tests (Playwright with the installed Chrome).

  It keeps going after a suite fails, prints a pass or fail summary, and exits with 1 if any suite failed. The end-to-end tests start their own backend and frontend on ports 8100 and 5273, with their own database file and the date fixed to 23 Nov 2026.
- `RUN-05` **The database** is `data/accountable.db`, which is not committed to git. The environment variable `ACCOUNTABLE_DB` points to another file; the tests use it. When the backend starts and the file doesn't exist, it creates the tables and loads the sample data. An existing file is never reseeded.
- `RUN-07` **The git pre-commit hook** (lefthook, `lefthook.yml`), installed by `npm install`, runs in two steps and stops the commit if either fails:
  1. It formats the staged files (Prettier in `frontend/`, ruff format in `backend/`) and adds the fixes to the commit. Changes that aren't staged stay out of it.
  2. It lints the staged files (ESLint, ruff check), checks the types of the frontend or backend when files of that kind are staged (tsc, ty) and scans what is staged for secrets (gitleaks).

  It runs no tests, so a commit stays quick. `git commit --no-verify` skips it.
- `RUN-08` **When the coding agent finishes a turn**, a Claude Code Stop hook (`.claude/hooks/check-on-stop.mjs`) runs `npm run check:quick`. If it fails, the agent is sent the output of the failed steps and keeps working. It is blocked only once: the next time it stops, it may.
- `RUN-09` **The coding agent can't change `.env`**: a Claude Code PreToolUse hook (`.claude/hooks/protect-env.mjs`) blocks the file-editing tools on `.env` and `.env.*` in any folder, except `.env.example`, and any shell command that names one of those files.

`RUN-06` `docs/STATUS.md` explains how to run, seed and test the app, in a few lines.

## Architecture

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
.claude/                the coding agent's settings and hooks (check on stop, .env guard)
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
  index.html            sets dark mode before the app loads
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
    - **Dark mode** needs no library of its own (see "Switching between light and dark" below).
    - **Versions:** the majors above are pinned in the lockfiles. Newer majors of React Router, TanStack Table, Vite, Vitest and TypeScript exist; moving to them is a change of its own.

17. **Switching between light and dark.**
    - **Decided:**
      - A few lines of plain script in `frontend/index.html` read the saved choice from localStorage (key `accountable-theme`, value `light` or `dark`). Before the app's code loads, they set `data-theme="dark"` on `<html>` when dark mode was chosen.
      - The toggle switches that attribute and saves the choice.
      - Nothing else reacts to the mode: every component reads the tokens, so the CSS alone changes the colours, with no re-render and no reload.
    - **Why:** the page never shows the wrong mode first, an open form keeps what was typed, and no dependency is needed.
    - **Turned down:**
      - a theme library
      - a React context that passes colours to every component
      - following `prefers-color-scheme`, which the intent leaves out (see the decision "Where the light or dark choice is kept").

## Data model

`DM-06` SQLAlchemy Core tables in `backend/`, with no raw SQL. Each user action writes in a single transaction.
- Columns use SQLAlchemy's generic types, such as `Date` and `DateTime`, which SQLite stores as ISO 8601 text, in local time.
- Nothing SQLite-only is used, so the same tables can move to Postgres later.
- Money is stored as whole cents in an integer, so sums are exact.
- Every table has `id` (integer primary key), `created_at` and `updated_at`, set by the server.

### organizations `DM-01`

| Column | Type | Rules |
|---|---|---|
| name | text | required, 1 to 200 characters after trimming |
| website | text | optional; `https://` is added if no scheme is given |
| industry | text | optional, free text; the form suggests industries already in use |
| notes | text | optional, up to 5.000 characters |

### contacts `DM-02`

| Column | Type | Rules |
|---|---|---|
| name | text | required, 1 to 200 characters |
| email | text | optional, must look like an email address |
| phone | text | optional, free text |
| job_title | text | optional |
| organization_id | integer | optional; set to empty when the organization is deleted |
| status | text | `lead`, `qualified` or `customer`; new contacts default to `lead` |

### deals `DM-03`

| Column | Type | Rules |
|---|---|---|
| name | text | required, 1 to 200 characters |
| organization_id | integer | required by the form and the API on create and edit; set to empty when the organization is deleted (`DEC-01`) |
| contact_id | integer | the main contact, optional; set to empty when the contact is deleted |
| stage | text | `new`, `qualified`, `proposal`, `negotiation`, `won` or `lost` |
| value_cents | integer | 0 or more; defaults to 0 |
| probability | integer | 0 to 100 |
| close_date | date | optional while open; set to today when the deal is won or lost (`DEC-07`) |
| position | integer | the card's place in its pipeline column, 0 at the top |

### activities `DM-04`

| Column | Type | Rules |
|---|---|---|
| type | text | `note`, `call` or `email` |
| contact_id | integer | set when the activity belongs to a contact |
| deal_id | integer | set when the activity belongs to a deal |
| description | text | required, 1 to 5.000 characters |
| occurred_at | datetime | required; the form defaults it to now |
| follow_up_date | date | optional |
| follow_up_done | boolean | defaults to false |

Exactly one of `contact_id` and `deal_id` is set, which a check constraint enforces. Deleting the contact or deal deletes its activities.

### events `DM-05`

Entries the system writes by itself. They show in timelines and can't be edited or deleted by hand.

| Column | Type | Rules |
|---|---|---|
| kind | text | `stage_change` or `status_change` |
| deal_id | integer | set for a stage change |
| contact_id | integer | set for a status change |
| from_value, to_value | text | for example `proposal` and `negotiation` |
| occurred_at | datetime | when the change was made |

Deleting the deal or contact deletes its events.

### Stage rules

| Stage | Usual probability | Open or closed |
|---|---|---|
| New | 10% | open |
| Qualified | 25% | open |
| Proposal | 50% | open |
| Negotiation | 75% | open |
| Won | 100% | closed |
| Lost | 0% | closed |

- `RULE-01` A new deal takes its stage's usual probability, unless the form sets another. It goes to the top of its column.
- `RULE-02` `RULE-03` When the stage changes, the probability becomes the new stage's usual figure.
  - In the form, picking a new stage fills in that figure, and the user can change it before saving.
  - A probability set by hand is kept until the stage changes again.
- `RULE-04` Every change of stage writes a `stage_change` event, whether it comes from the board or the form.
- `RULE-05` Moving to Won makes the main contact a customer (`DEC-08`) and writes a `status_change` event for them. A deal created at Won does the same.
- `RULE-06` A deal is **late** when it's open and its close date is before today.
- `RULE-07` **Expected revenue** for a deal is value times probability. The open pipeline's figures add up open deals only.

### What each timeline shows

`TL-04` Timelines are newest first, by `occurred_at`. Each entry shows its type, its text and its date. An entry rolled up from another record also says which record it came from: "on deal Acme renewal", or "with Maria Lopez" for a contact's own entry on an organization's timeline.

- `TL-01` **Deal:** its activities and its stage changes.
- `TL-02` **Contact:**
  - their own activities and status changes
  - the activities and stage changes of every deal where they're the main contact now.

  This is worked out when the timeline is read, so changing a deal's main contact moves its history with it.
- `TL-03` **Organization:** everything on the timelines of its contacts and its deals, each entry shown once.

## API

`API-17` JSON under `/api`, served by FastAPI with Pydantic models.
- Request bodies are validated on the server with the same rules and messages as the forms.
- A request that breaks a rule gets a 422 with one message per field, `{"detail": ..., "errors": {"field": "message"}}`, which the form shows next to the field.
- A request for a missing record gets a 404.
- Any other error comes back as JSON with a `detail`.

| ID | Method and path | Purpose |
|---|---|---|
| `API-01` | `GET /api/organizations` | all organizations, each with its contact count, open deal count and open value |
| `API-02` | `POST /api/organizations` | create |
| `API-03` | `GET /api/organizations/{id}` | one organization with its contacts, its deals and its timeline |
| `API-02` | `PUT /api/organizations/{id}` | edit |
| `API-02` | `DELETE /api/organizations/{id}` | delete; contacts and deals are kept, with no organization |
| `API-04` | `GET /api/organizations/{id}/delete-impact` | its name, and how many contacts and deals would lose their organization |
| `API-05` | `GET /api/contacts` | all contacts with their organization's name |
| `API-06` | `POST`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}` | as above; a contact's `GET` includes their organization, their deals and their timeline |
| `API-07` | `GET /api/contacts/{id}/delete-impact` | their name, how many activities would be deleted, and how many deals would lose their main contact |
| `API-08` | `GET /api/deals` | all deals with organization and contact names, a `late` flag and expected revenue |
| `API-09` | `POST`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}` | as above; a deal's `GET` includes its timeline |
| `API-10` | `GET /api/deals/{id}/delete-impact` | its name, and how many activities and stage-history entries would be deleted |
| `API-11` | `POST /api/deals/{id}/move` | body `{stage, index}`: moves the card to that stage and place, renumbers both columns, and applies the stage rules. An index past the end puts the card last. |
| `API-12` | `POST /api/activities` | log an activity on a contact or a deal |
| `API-13` | `PUT /api/activities/{id}`, `DELETE /api/activities/{id}` | edit or delete |
| `API-14` | `POST /api/activities/{id}/done` | body `{done}`: marks a follow-up done or not done |
| `API-15` | `GET /api/dashboard` | every figure the dashboard shows, worked out on the server |
| `API-16` | `GET /api/industries` | industries in use, each once, sorted, with no blanks |
| `API-18` | `GET /api/today` | today's date and the current time from `backend/clock.py`, so the browser never uses its own clock (`DEC-12`) |

Lists return every record; a few hundred of each kind is fine without paging. Search and sorting run in the browser.

## Screens

Colours named in this section are light mode's. In dark mode each one takes its dark value from Design (`DES-01`, `DES-02` and "Dark mode"); layout and behaviour stay the same.

### The look: Command deck

The look is the one called "Command deck", and `docs/mockups/b-dashboard.html` and `b-pipeline.html` are its visual reference. Where they and this spec differ, this spec wins. Two other mockups, A and C, are kept in the same folder for reference only.

What it means for every screen:
- **Navigation:** a slim icon rail instead of a wide sidebar, which leaves more width for the board and the tables.
- **Page title:** a small "Accountable" line above the page title.
- **Dark panels:** one Midnight panel per screen carries the headline figures (the dashboard's top panel, the pipeline's totals strip).
- **Stage colour:** used boldly, as solid blocks for stage headers and stage rows rather than small dots.
- **Shapes:** panels have 20px corners; cards and rows have 14px.

### Layout

- `UI-LAY-01` **Icon rail:** a fixed rail on the left, 72px wide, in Midnight.
  - At the top is the Accountable mark: a Sea Green rounded square with a Midnight "A". It links to the dashboard.
  - Below it are five 44px icon buttons from Lucide, for Dashboard, Pipeline, Deals, Contacts and Organizations, with Sea Mist icons. The current page's button is filled Sea Green with a Midnight icon, and marked as the current page for screen readers.
  - Each button has an accessible name, and a tooltip with the section's name shows on hover and on keyboard focus.
  - At the foot of the rail is the light and dark toggle (see "Light and dark toggle" below).
- `UI-LAY-02` **Main area:** the page background is `#F0F4F5`. Each page has a title row:
  - on the left, a small uppercase "Accountable" line in Muted ink above the page title
  - on the right, the page's main action ("New deal") as a Midnight button with white text, or on the dashboard, today's date in Instrument Serif.

  White rounded panels sit below.
- `UI-LAY-03` **Screen size:** the layout is built for screens 1280px wide and up, and still works at 1024px. The page never scrolls sideways; only the board may, inside itself.
- `UI-LAY-04` **Addresses:**
  - `/` for the dashboard
  - `/pipeline`
  - `/deals` and `/deals/:id`
  - `/contacts` and `/contacts/:id`
  - `/organizations` and `/organizations/:id`.

  The browser's back button works throughout. Any other address shows a "Page not found" page with a way back to the dashboard.
- **Light and dark toggle:** a 44px icon button at the foot of the rail, styled like the section buttons.
  - It shows a Lucide moon in light mode and a sun in dark mode.
  - Its accessible name and its tooltip say what it does: "Switch to dark mode" or "Switch to light mode". The tooltip shows on hover and on keyboard focus.
  - Clicking it, or pressing Enter or Space on it, switches the whole app at once: every page, chart, dialog, menu, tooltip and message. Nothing reloads, and an open form keeps what was typed.
  - Light mode is the default, and the choice is kept (see the decision "Where the light or dark choice is kept").

### Dashboard

From top to bottom:

1. `UI-DASH-01` **Headline panel** (full width): a Midnight panel with 20px corners, in two parts.
   - **Left, about 360px:** four figures in a 2 x 2 grid. Each has a label in light Sea Mist (`#9FB4BA`), a large figure in white JetBrains Mono, and a short line of context.
     - **Open pipeline:** the value of all open deals, and how many there are.
     - **Expected revenue:** the open deals' value times their probability.
     - **Won this month:** the value of deals won this month, with the figure in Sea Green. Below it, the change from last month in a pill with an up or down arrow: Sea Green on a translucent Sea Green fill for a rise, and Raspberry for a fall. With nothing won last month, it says so instead.
     - **Follow-ups due:** how many are overdue, in Raspberry when more than zero, and how many are due today.
   - `UI-DASH-02` **Right, the rest:** **Revenue won** (line chart), the value of won deals for each of the last 12 months by close date.
     - The line is Sea Green, with a dot for each month, on grid lines in a lighter Midnight (`#1C5568`), with four round axis steps from $0.
     - The current month's dot is larger and filled, and labelled with its short amount (`$86k`).
     - Hovering a month shows a white tooltip with its full total and how many deals were won.
2. **Three panels in a row:**
   - `UI-DASH-03` **Sales funnel:** one column per stage from New to Won, in stage colours, side by side and getting shorter. Above each column is the share of New's value it keeps (`94%`), and below it the stage name and the value that reached it (`DEC-10`).
   - `UI-DASH-04` **Pipeline by stage:** one solid row per open stage, in the stage's colour (New uses the darker Cerulean, `#0D6E8F`, so its white text passes contrast). Each row shows the stage name and probability, its value, its deal count and its expected revenue. Clicking a row opens the pipeline.
   - `UI-DASH-05` **Won and lost** (bar chart): one bar per month above a centre line for deals won (Sea Green), and one below it for deals lost (Lost grey), with "13 won" and "3 lost" labels, a legend, and a tooltip per month.
3. **Two panels in a row:**
   - `UI-DASH-06` **Follow-ups** (wider), grouped under "Overdue", "Today" and "Next 7 days" (`DEC-11`).
     - Each follow-up is a rounded row with:
       - a checkbox to mark it done
       - the activity's description
       - the record it belongs to, as a link ("Pinecrest Hotels · Booking engine", or a contact's name)
       - its due date, relative ("3 days overdue", "Today", "In 3 days"), with the full date in a tooltip.
     - Overdue rows sit on a pale Raspberry tint with the date in dark Raspberry. The other rows sit on a pale grey (`#F3F7F8`).
     - Ticking the box removes the row and updates the figure in the headline panel.
   - `UI-DASH-07` **Recent activity:** the 10 newest entries across all timelines with `occurred_at` up to now: activities, stage changes and status changes.
     - Each has a rounded-square icon in its type's colour, a line of text, and the record (as a link) with its date and time.

`UI-DASH-08` Charts use Recharts.
- Axes and grid lines are quiet: Sea Mist grid lines and muted labels on white, and lighter Midnight grid lines and pale labels on the headline panel.
- Every chart has a tooltip with full figures in the money format.
- All figures come from `GET /api/dashboard`, which is fetched again whenever the dashboard is opened.

Below 1280px wide, the headline panel stacks its figures above the chart, and the three-panel and two-panel rows become two columns, then one.

### Tables (Organizations, Contacts, Deals)

All three use TanStack Table in a white panel, with the same behaviour:

- `UI-TBL-01` **Search:** a search box above the table. It matches any text column, ignores case, and filters as you type.
- `UI-TBL-02` **Sorting:** clicking a heading sorts by that column, ascending then descending. An arrow shows the current sort. Names sort A to Z by default.
- `UI-TBL-03` **Opening a record:** clicking a row, or pressing Enter on it, opens the record's page. Links inside a row (a website, an email address) do their own thing instead.
- `UI-TBL-04` **Row actions:** each row ends with Edit and Delete icon buttons, which have text labels for screen readers ("Edit Acme Ltd").
- `UI-TBL-03` **Keyboard:** Tab reaches the search box, the headings, each row and the row buttons.
- `UI-TBL-05` **Records:** the panel's footer shows how many records are showing out of the total, for example "12 of 25 contacts".

`UI-TBL-06` Columns:

- **Organizations:** Name, Industry, Website (a link that opens in a new tab), Contacts, Open deals, Open value.
- `UI-TBL-07` **Contacts:** Name, Organization, Job title, Email (a `mailto:` link), Phone, Status (badge). Above the table are filter buttons for All, Lead, Qualified and Customer, each with its count. The filter combines with the search.
- `UI-TBL-08` **Deals:** Name, Organization, Main contact, Stage (badge), Value, Probability, Close date. A late deal shows its close date in Raspberry with a small "Late" badge. A deal with no organization shows "No organization" in muted text.

### Record pages

`UI-REC-01` Each page starts with a "< Deals" (or Contacts, Organizations) link back to its list, then a header panel with the record's name, its key facts, and Edit and Delete buttons. Below it are two columns: linked records on the left (about 40%) and the timeline on the right (about 60%). Below 1100px wide the two columns stack.

- `UI-REC-02` **Organization:**
  - Facts: industry, website, open value and notes.
  - Left: its contacts (name, job title, status) and its deals (name, stage, value), each as a link, each with a "New" button that starts the form with this organization filled in.
  - Right: the organization's timeline.
- `UI-REC-03` **Contact:**
  - Facts: status badge, organization (as a link), job title, email (as a `mailto:` link) and phone.
  - Left: the deals where they're the main contact, with a "New" button that starts a deal with them and their organization filled in.
  - Right: the timeline, with "Log activity" at the top.
- `UI-REC-04` **Deal:**
  - Facts: stage badge, value, probability, expected revenue, close date (with "Late" if it applies).
  - Left: details, including organization and main contact (as links) and when it was created.
  - Right: the timeline, with "Log activity" at the top.

`UI-REC-05` **Log activity:** a form inside the timeline panel.
- Its fields:
  - type: Note, Call or Email, as three buttons
  - description
  - when it happened, which defaults to now on the server's clock
  - an optional follow-up date.
- "Log it" adds the entry at the top of the timeline without reloading the page, and clears the form for the next one.

`UI-REC-06` **Timeline entries:**
- Each entry has a round icon in its type's colour: note Midnight, call Cerulean, email Coral, stage change in the new stage's colour, status change Sea Green.
- Activities read "Call: agreed a two-year term", and have Edit and Delete in a small menu.
- An activity with a follow-up shows its due date, "3 days overdue" if it has passed, and a "Done" checkbox.
- `UI-EMPTY-04` An empty timeline reads "Nothing here yet. Log a call, email or note to start the history."

A record that doesn't exist, for example after it was deleted elsewhere, shows "That deal doesn't exist. It may have been deleted." with a way back to the list.

### Pipeline

- `UI-PIPE-01` **Totals strip:** a Midnight panel across the top. It shows the total open value, the expected revenue (in Sea Green) and the number of open deals. Beside them is a stacked bar of open value by stage, in stage colours with 2px gaps and a legend; Negotiation uses Sea Mist there so it shows on Midnight. With no open deals, the bar reads "No open deals".
- `UI-PIPE-02` **The board:** six columns side by side, New to Lost, sharing the width equally, each at least 180px. Each column is its own white panel with 20px corners. All six fit at 1280px; the board scrolls sideways if the window is narrower, and each column scrolls on its own if it's taller than the window.
- `UI-PIPE-03` **Column header:** a solid block in the stage colour at the top of the column, with 14px corners. It shows:
  - the stage name and its usual probability
  - the number of cards, in a pill (beside the name, or beside the expected revenue in narrower columns)
  - the column's value
  - its expected revenue, or "Closed, won" or "Closed, lost" for the last two columns.

  The header colours are: New `#0D6E8F` with white text, Qualified Marigold, Proposal Coral, Won Sea Green and Lost grey `#8FA3AA`, all four with Midnight text, and Negotiation Midnight with white text.
- `UI-PIPE-04` **Card:** a pale grey card (`#F3F7F8`) with 14px corners, inside the white column. It shows:
  - the value first, in JetBrains Mono 16px
  - the deal name, in semibold
  - the organization, or "No organization"
  - at the bottom, the main contact's initials in a Midnight circle (an empty ringed circle when there's no main contact), and the close date in a white pill ("No date" when there's none).

  A late card's pill reads "Late · 20 Nov 2026" in dark Raspberry on a pale Raspberry tint. Clicking a card, or pressing Enter on it, opens the deal. The initials circle has the contact's full name as its tooltip and accessible name.
- `UI-PIPE-05` **Adding a deal:** "Add deal" sits under the header of each open column, as a pale grey button. It opens the deal form with that stage and its probability already chosen.
- `UI-PIPE-06` **Dragging:** cards are dragged with dnd-kit, using its sortable preset.
  - A card can be dropped anywhere in any column, including higher or lower in its own column.
  - The board updates at once: the card's place, its stage, its probability and every total. Then it calls `POST /api/deals/{id}/move`.
  - `UI-PIPE-07` If the call fails, the card goes back to where it was and a message explains why ("Couldn't move Data audit. ...").
  - The keyboard works too (`DEC-14`).

### Forms

- `UI-FORM-01` **Where:** forms open in a dialog (Radix Dialog), titled "New deal" or "Edit deal".
  - The first field has focus when it opens.
  - Tab moves between fields.
  - Enter saves, except in multi-line text, where it starts a new line, and in a select or suggestion list, where it picks the option.
  - Escape closes an open list first, then the dialog.
- **Building them:** forms use React Hook Form with zod schemas that mirror the server's rules.
- `UI-FORM-02` **Errors:**
  - Errors show under each field when it's left or when the form is saved, in Raspberry text with an icon.
  - Saving is blocked until they're fixed, and focus moves to the first field with an error.
  - Messages are short:
    - "Enter a name"
    - "Choose an organization"
    - "Enter an email like name@company.com"
    - "Value can't be negative"
    - "Use a comma for cents, like 12.500,50"
    - "Probability must be between 0 and 100"
    - "Describe what happened"
  - Errors the server finds show on their fields the same way.
- `UI-FORM-03` **Choosing records:** organization and main contact are chosen with a searchable select. The deal form's contact list shows the chosen organization's contacts first, under "At Acme Ltd", then the others.
- `UI-FORM-04` **Deal form:**
  - Changing the stage fills in its usual probability.
  - Choosing Won or Lost fills in today as the close date.
  - Both can be changed before saving.
  - The value is typed in the money format and tidied to `12.500,00` when the field is left.
- `UI-FORM-05` **After saving:** the dialog closes, a short message confirms it ("Deal saved") at the bottom right, and the list or page shows the change.
- `UI-FORM-06` `UI-FORM-07` **Organization form:** the industry field suggests industries already in use as you type (from `GET /api/industries`), and the form adds `https://` to a website with no scheme before saving.

### Deleting

`UI-DEL-01` Delete opens a confirmation dialog. Before it appears, the dialog asks the `delete-impact` endpoint what will happen, and then says it in plain words:

- **Organization:** "Delete Northwind Traders? Its 3 contacts and 2 deals will be kept, with no organization. This can't be undone." With neither, "It has no contacts or deals."
- **Contact:** "Delete Maria Lopez? 4 activities logged with this contact will be deleted. 2 deals will be kept, with no main contact. This can't be undone." Parts with a count of zero are left out. The text never uses a pronoun for the contact.
- **Deal:** "Delete Acme renewal? Its 5 activities and its stage history will be deleted. This can't be undone."
- `UI-DEL-04` **Activity:** "Delete this call? This can't be undone."

`UI-DEL-02` `UI-DEL-03` The buttons are Cancel, which has focus, and Delete, in dark Raspberry. After deleting, a message confirms it ("Deal deleted"). Deleting from a record's page goes back to its list.

### Empty and loading states

- `UI-EMPTY-01` An empty table shows a short line and the add button, such as "No contacts yet" with "New contact". A search with no results says "No contacts match "smith"" and offers to clear the search.
- `UI-EMPTY-02` An empty chart keeps its axes and shows "No deals won in the last 12 months" in the middle. An empty funnel or pipeline bar shows the same kind of line.
- `UI-EMPTY-03` `UI-PIPE-08` An empty pipeline column shows a dashed drop area reading "No deals". It is still a place to drop cards.
- `UI-EMPTY-04` An empty follow-up list reads "No follow-ups due. You're up to date." The recent activity list reads "No activity yet". Linked lists on record pages read "No contacts yet", "No deals yet".
- `UI-EMPTY-05` While data loads, panels and tables show grey placeholder shapes in the same layout, so nothing jumps around. With the sample data that lasts well under a second.

### Errors

`UI-ERR-01` If the backend can't be reached or returns an error, a message at the bottom right says what failed ("Couldn't save the deal. Try again."). Nothing the user typed is lost, so an open form stays open. A screen whose data can't be loaded shows a short message with "Try again" instead of a blank page.

`UI-ERR-02` The browser's console stays free of errors and warnings during normal use.

## Screen structures

These wireframes show where everything sits on each screen. They show structure only: colours, type and spacing come from Design below, and behaviour from Screens above. Each one ends with the components it's built from, as named in `frontend/src/components/` and `frontend/src/pages/`. Figures are examples.

### App shell

Every page sits inside this shell.

```
+------+-----------------------------------------------------------------+
| [A]  |  ACCOUNTABLE                                   [ Main action ]  |
|      |  Page title                                                     |
| [#]  |                                                                 |
|  #   |  +-----------------------------------------------------------+  |
|  #   |  |  Panel (20px corners)                                     |  |
|  #   |  |                                                           |  |
|  #   |  +-----------------------------------------------------------+  |
|      |                                                                 |
|      |  +-----------------------------------------------------------+  |
|      |  |  Panel                                                    |  |
|      |  +-----------------------------------------------------------+  |
|      |                                            +-----------------+  |
|      |                                            | Message (toast) |  |
| (m)  |                                            +-----------------+  |
+------+-----------------------------------------------------------------+
 Rail,    Main area: page background, 32px padding (24px below 1320px)
 72px,
 Midnight
```

- **Built from:** `AppShell`, `IconRail`, `RailLink` (icon button with tooltip), `ThemeToggle` (the light and dark button), `PageHeader` (eyebrow, title, action slot), `Panel`, `Toaster`, and `FormsProvider`, which hosts the form and delete dialogs for every page.
- **Notes:**
  - The rail stays fixed and the main area scrolls.
  - `[A]` is the brand mark, `#` is a Lucide icon, and `[#]` is the current page's button, filled Sea Green.
  - `(m)` is the light and dark toggle, pinned to the foot of the rail.

### Dashboard (`/`)

```
ACCOUNTABLE
Dashboard                                         Monday, 23 Nov 2026 (serif)

+--------------------------------------------------------------------------+
| MIDNIGHT HEADLINE PANEL                                                  |
|                                    Revenue won        Last 12 months     |
| Open pipeline     Expected revenue                                       |
| $1.130.000        $529.500          $120k                o               |
| 14 open deals     Value times prob.        +-----------+/ \        $86k  |
|                                     $80k  |Apr 2026   |   \   o--- (o)  |
| Won this month    Follow-ups due          |$71.000,00 |    \ /           |
| $86.000 (green)   4 overdue (rasp.)  $40k +---o-------+     o            |
| (^ 37%) on October 2 due today          o--o   \  o                      |
|                                     $0                                   |
|                                       Dec Jan ...              Oct Nov   |
+--------------------------------------------------------------------------+
   about 360px                         the rest: line chart, dots

+-------------------------+ +-----------------------+ +--------------------+
| Sales funnel            | | Pipeline by stage     | | Won and lost       |
|                         | |                       | |          [] Won    |
| 100%  94%               | | [New 10%    $120.000] | | 13 won   [] Lost   |
| ####  ####  76%         | | [4 deals  exp $12.000]| |  # # # ## # # # #  |
| ####  ####  ####  56%   | | [Qualified  $310.000] | | ------------------ |
| ####  ####  ####  ####  | | [Proposal   $340.000] | |    #     #     #   |
| ####  ####  ####  ####  | | [Negotiation $360.000]| | 3 lost             |
| New   Qual. Prop. Neg.  | |  (solid stage colour  | |  Jan  Mar ...  Nov |
| $1.948.000 ...          | |   rows)               | |                    |
+-------------------------+ +-----------------------+ +--------------------+

+--------------------------------------+ +---------------------------------+
| Follow-ups                 10 to do  | | Recent activity                 |
|                                      | |                                 |
| OVERDUE                              | | [>] Moved from Proposal to      |
| +----------------------------------+ | |     Negotiation                 |
| |[ ] Call back about contract terms| | |     Telehealth add-on ·         |
| |    Booking engine  5 days overdue| | |     23 Nov 2026, 10:12          |
| +----------------------------------+ | | [c] Call: agreed a two-year     |
| TODAY                                | |     term                        |
| +----------------------------------+ | |     Compliance suite ·          |
| |[ ] Call about onboarding   Today | | |     23 Nov 2026, 09:30          |
| +----------------------------------+ | | ...                 (10 rows)   |
| NEXT 7 DAYS                          | |                                 |
+--------------------------------------+ +---------------------------------+
```

- **Built from:** `DashboardPage`, `HeadlinePanel`, `HeadlineFigure` x4, `RevenueChart`, `FunnelChart`, `PipelineByStage`, `WonLostChart`, `FollowUpList` (with its groups), `ActivityFeed`, `EmptyState`, `Skeleton`.
- **Notes:**
  - Overdue follow-up rows sit on a pale Raspberry tint, and the other rows on pale grey.
  - Each panel shows its own loading placeholder and its own empty state.

### Pipeline (`/pipeline`)

```
ACCOUNTABLE
Pipeline                                                     [ + New deal ]

+--------------------------------------------------------------------------+
| MIDNIGHT TOTALS STRIP                                                    |
| Open pipeline    Expected revenue   Open deals   Open value by stage     |
| $1.130.000,00    $529.500,00        14           [==|=====|=====|=====]  |
+--------------------------------------------------------------------------+

+----------+ +----------+ +----------+ +----------+ +----------+ +----------+
|+--------+| |+--------+| |+--------+| |+--------+| |+--------+| |+--------+|
||New 10% 4|| ||Qual. 25%|| ||Prop. 50%|| ||Neg. 75% || ||Won 100% || ||Lost 0%  ||
||$120.000|| ||$310.000|| ||$340.000|| ||$360.000|| ||$668.000|| ||$150.000||
||exp ... || ||exp ... || ||exp ... || ||exp ... || ||Closed,  || ||Closed,  ||
|+--------+| |+--------+| |+--------+| |+--------+| ||won     || ||lost    ||
|[+Add    ]| |[+Add    ]| |[+Add    ]| |[+Add    ]| |+--------+| |+--------+|
|+--------+| |+--------+| |+--------+| |+--------+| |+--------+| |+--------+|
||$35.000 || ||$110.000|| ||$140.000|| ||$180.000|| ||$86.000 || ||$60.000 ||
||Fleet   || ||Group   || ||Shop-   || ||Compli- || ||Store   || ||Supply  ||
||tracking|| ||report. || ||floor   || ||ance    || ||analyt. || ||dashb.  ||
||Harbor  || ||Northg. || ||Kestrel || ||Northg. || ||Fernwood|| ||Solano  ||
||(SW) 15 || ||(PR) 29 || ||(MB) 18 || ||(PR) 11 || ||(EF) 18 || ||(TS) 9  ||
||  Feb 27|| ||  Jan 27|| ||  Dec 26|| ||  Dec 26|| ||  Nov 26|| ||  Sep 26||
|+--------+| |+--------+| |+--------+| |+--------+| |+--------+| |+--------+|
|   ...    | |   ...    | |   ...    | |   ...    | |  ...     | |   ...    |
+----------+ +----------+ +----------+ +----------+ +----------+ +----------+
  each column is a white panel; its header is a solid block of stage colour
```

- **Built from:** `PipelinePage`, `BoardTotals` (the Midnight strip with its stacked bar), `Board` (dnd-kit context, with its keyboard handling), `StageColumn` x6, `ColumnHeader`, `DealCard` with `ContactInitials` and `DatePill`, `DealCardOverlay` (the card while dragging).
- **Notes:**
  - The columns share the width equally, at least 180px each, and the board scrolls sideways only when they don't fit.
  - The board takes the full height of the window under the totals strip, and each column scrolls on its own.
  - `(SW)` is the main contact's initials in a Midnight circle. The date sits in a white pill, which turns pale Raspberry with "Late ·" for a late deal.

### Tables (`/deals`, `/contacts`, `/organizations`)

All three share one structure. Contacts is shown here because it also has the status filter.

```
Contacts                                                    [ New contact ]

+--------------------------------------------------------------------------+
| [ Search contacts...           ]    ( All 25 ) ( Lead 9 ) ( Qualified 7 ) |
|                                     ( Customer 9 )                        |
|                                                                          |
| Name ^        Organization    Job title       Email         Status       |
| ------------------------------------------------------------------------ |
| Maria Lopez   Acme Ltd        Head of Ops     maria@acm...  (Customer) e x|
| Tom Becker    Globex Corp     CFO             tom@globe...  (Lead)     e x|
| Aisha Khan    No organization Consultant      aisha@...     (Qualified)e x|
| ...                                                                      |
|                                                                          |
| 25 of 25 contacts                                                        |
+--------------------------------------------------------------------------+
   ^ = sorted column    e = Edit    x = Delete    ( ) = button or badge
```

- **Built from:** `ContactsPage` (and `DealsPage`, `OrganizationsPage`), `DataTable` (TanStack Table), `SearchBox`, `StatusFilter` (Contacts only), `SortableHeader`, `RowActions`, `StageBadge` or `StatusBadge`, `LateBadge` (Deals only), `EmptyState`, `LoadError`.
- **Notes:**
  - The rows are divided by light lines, with no outline around the panel.
  - Money and dates sit right-aligned in JetBrains Mono.
  - Phone is the sixth column on Contacts; it's left out of the sketch to save width.

### Record pages (`/deals/:id`, `/contacts/:id`, `/organizations/:id`)

All three share one structure. A deal is shown here.

```
< Deals

+--------------------------------------------------------------------------+
| Acme renewal                                       [ Edit ]  [ Delete ]  |
| (Negotiation)  $24.000,00   75%   Expected $18.000,00   Close 12 Dec 2026 |
+--------------------------------------------------------------------------+

+-----------------------------+ +------------------------------------------+
| Details                     | | Timeline                                 |
|                             | |                                          |
| Organization  Acme Ltd   -> | | +--------------------------------------+ |
| Main contact  Maria Lopez-> | | | ( Note ) ( Call ) ( Email )          | |
| Stage         Negotiation   | | | [ What happened?                   ] | |
| Value         $24.000,00    | | | When [23 Nov 2026 14:05]             | |
| Probability   75%           | | | Follow-up [         ]   [ Log it ]  | |
| Close date    12 Dec 2026   | | +--------------------------------------+ |
| Created       2 Mar 2026    | |                                          |
|                             | | (o) Moved from Proposal to Negotiation   |
|                             | |     18 Nov 2026, 10:12                   |
|                             | | (o) Call: agreed on a 2-year term    ... |
|                             | |     15 Nov 2026, 16:40                   |
|                             | |     Follow-up 20 Nov 2026  [ ] Done      |
|                             | |     3 days overdue                       |
|                             | | (o) Email: sent the proposal         ... |
|                             | |     ...                                  |
+-----------------------------+ +------------------------------------------+
         about 40%                             about 60%
```

Contact and organization pages differ only in the header facts and the left column:

```
Contact page                            Organization page

+-------------------------------+       +-------------------------------+
| Maria Lopez   [ Edit ][Delete]|       | Acme Ltd      [ Edit ][Delete]|
| (Customer)  Head of Ops       |       | Software   acme.example ->    |
| Acme Ltd ->  maria@acme...    |       | Notes: two offices, renews    |
| +1 555 0100                   |       | every spring                  |
+-------------------------------+       +-------------------------------+

Left column                             Left column
+-------------------------------+       +-------------------------------+
| Deals as main contact  [ New ]|       | Contacts               [ New ]|
| Acme renewal  (Neg) $24.000,00|       | Maria Lopez  Head of Ops  (Cu)|
| Acme support  (Won)  $8.000,00|       | Tom Becker   CFO          (Le)|
+-------------------------------+       +-------------------------------+
                                        +-------------------------------+
Right column: timeline with             | Deals                  [ New ]|
the Log activity form                   | Acme renewal  (Neg) $24.000,00|
                                        | Acme support  (Won)  $8.000,00|
                                        +-------------------------------+

                                        Right column: timeline only
```

- **Built from:** `DealPage`, `ContactPage`, `OrganizationPage`, `RecordHeader`, `HeaderFact`, `FactList`, `LinkedList`, `RecordColumns`, `Timeline` with its entries and their Edit and Delete menu, `LogActivityForm`, `FollowUpCheckbox`, `EmptyState`.
- **Notes:**
  - `< Deals` goes back to the list.
  - `UI-REC-07` An organization's timeline has no "Log activity" form, because activities belong to a contact or a deal. Its entries say which contact or deal they came from.
  - Rolled-up entries on a contact's timeline show "on deal Acme renewal" as a link.

### Form dialog

The deal form is shown here. The organization, contact and activity forms use the same frame with their own fields.

```
+--------------------------------------------------+
| New deal                                     [x] |
|                                                  |
| Name *                                           |
| [ Acme renewal                                 ] |
|                                                  |
| Organization *                Main contact       |
| [ Acme Ltd                v ] [ Maria Lopez  v ] |
|                                                  |
| Stage                         Probability        |
| [ Negotiation (75%)       v ] [ 75          ] %  |
|                                                  |
| Value (USD)                   Close date         |
| [ $ 24.000,00               ] [ 12 Dec 2026    ] |
| ! Value can't be negative                        |
|                                                  |
|                          [ Cancel ]  [ Save ]    |
+--------------------------------------------------+
     about 560px wide, centred, page dimmed behind
```

- **Built from:** `FormDialog` (Radix Dialog), `DealForm` / `ContactForm` / `OrganizationForm` / `ActivityForm`, the fields in `fields.tsx` (`TextInput`, `TextArea`, `MoneyInput`, `PercentInput`, `DateInput`, `DateTimeInput`, `SelectInput`, `StageSelect`, `FieldError`), `RecordSelect` (searchable), `SuggestField` (industry).
- **Notes:**
  - `*` marks a required field.
  - Errors sit under their field, in Raspberry with an icon.
  - Fields are in two columns where they pair naturally. The name and notes fields take the full width.
  - Save is a Sea Green button with Midnight text.

### Delete dialog

```
+--------------------------------------------------+
| Delete Northwind Traders?                        |
|                                                  |
| Its 3 contacts and 2 deals will be kept, with no |
| organization. This can't be undone.              |
|                                                  |
|                        [ Cancel ]  [ Delete ]    |
+--------------------------------------------------+
     about 440px wide; Cancel has focus; Delete in dark Raspberry
```

- **Built from:** `ConfirmDeleteDialog` (Radix AlertDialog). `FormsProvider` loads `delete-impact` before showing the text.

## Design

### Colours `DES-01`

Colours are CSS variables in `tokens.css`, named by their role. Light mode defines them on `:root`, and dark mode redefines the same names (`ARC-15`).

| Role | Light | Dark | Use |
|---|---|---|---|
| Page | `#F0F4F5` | `#04232E` | page background |
| Panel | `#FFFFFF` | `#000000` | panels, dialogs, date pills |
| Ink | `#073B4C` Midnight (12.1:1 on white) | Sea Mist `#CDD8DB` (14.4:1 on black, 11.2:1 on the page, 11.5:1 on cards) | headings and body text |
| Muted ink | `#4D6973` (5.3:1 on the page, 5.9:1 on white) | `#9FB4BA` (9.7:1 on black, 7.6:1 on the page, 7.7:1 on cards) | labels, secondary text |
| Rail and headline panels | `#073B4C` Midnight, with Sea Mist `#CDD8DB` icons, white figures and `#9FB4BA` labels | the same (see the decision "Dark surfaces") | the icon rail, the dashboard headline panel, the pipeline totals strip |
| Card | `#F3F7F8` | `#0F2027` | pipeline cards, follow-up rows, "Add deal" buttons |
| Line | `#E8EEF0` | `#1C3038` | table row dividers and input fills (never an outline around a panel) |
| Midnight fill | `#073B4C` with white text | Sea Mist `#CDD8DB` with Midnight text (8.3:1) (see the decision "Dark surfaces") | main action buttons, the initials circle, the chosen filter or activity type, tooltips, confirmation messages |
| Primary | Sea Green `#06D6A0`, Midnight text | the same | "Save" and "Log it" buttons, focus rings |
| Secondary | Marigold `#FFC145`, Midnight text | the same | Qualified, highlights |
| Tertiary | Coral `#F78C6B`, Midnight text | the same | Proposal, email activity |
| Information | Cerulean `#118AB2` | the same; links use `#5CBFE0` | New, call activity, links |
| Alert | Raspberry `#EF476F` | the same | late, overdue, delete, errors |

`DES-02` Small text and badges use these shades, each checked for contrast. Light mode darkens the brand colours, and dark mode lightens them, as the brand asks.

| Colour | Light: text on white | Light: badge (text on tint) | Dark: text on black | Dark: badge (text on tint) |
|---|---|---|---|---|
| Sea Green | `#067A5C` (5.3:1) | `#067A5C` on `#E6FBF5` (4.9:1) | `#3DE0B4` (12.5:1) | `#3DE0B4` on `#01271D` (9.6:1) |
| Marigold | `#8A5A00` (5.9:1) | `#8A5A00` on `#FFF6E3` (5.5:1) | `#FFCF6B` (14.4:1) | `#FFCF6B` on `#2E230C` (10.6:1) |
| Coral | `#B4472A` (5.4:1) | `#B4472A` on `#FEEEE9` (4.8:1) | `#FFA488` (10.9:1) | `#FFA488` on `#2C1913` (8.7:1) |
| Cerulean | `#0D6E8F` (5.8:1) | `#0D6E8F` on `#E7F3F7` (5.1:1) | `#5CBFE0` (10.0:1) | `#5CBFE0` on `#031920` (8.6:1) |
| Raspberry | `#C2264F` (5.7:1) | `#C2264F` on `#FDECF0` (5.0:1) | `#FF7F9C` (8.8:1) | `#FF7F9C` on `#2B0D14` (7.5:1) |
| Midnight | `#073B4C` | `#073B4C` on `#E8EEF0` (10.3:1) | Sea Mist `#CDD8DB` (14.4:1) | `#CDD8DB` on `#1C3038` (9.4:1) |

Every dark text shade also passes on the dark cards (7.0:1 or better) and on the dark page (6.8:1 or better).

**Stage colours** (`DEC-05`): New Cerulean, Qualified Marigold, Proposal Coral, Negotiation Midnight, Won Sea Green and Lost grey `#8FA3AA`. Stage badges use the tinted versions above; Lost uses `#4D6973` on `#E8EEF0`, and in dark mode `#9FB4BA` on `#1C3038` (6.4:1). In dark mode Negotiation is Sea Mist with Midnight text wherever it is a solid colour (see the decision "Dark surfaces").

**Contact status colours:** Lead Cerulean, Qualified Marigold, Customer Sea Green.

**Gradients:** none.

### Type `DES-03`

Fonts are bundled with `@fontsource` (`DEC-02`).

- **Instrument Sans** for all interface text:
  - page titles 28px semibold
  - panel titles 16px semibold
  - body and table text 14px regular
  - labels 12px medium, in Muted ink.
- **JetBrains Mono** for figures: money, percentages, counts in tiles and tables, and dates in tables. It uses tabular numbers, so columns line up. Tile figures are 28px medium.
- **Instrument Serif** sparingly, as an accent: today's date on the right of the dashboard's title row ("Monday, 23 Nov 2026"), and the empty-state lines.

### Shape and spacing `DES-04`

- **Panels:** 20px rounded corners, 24px padding, no outline. A faint shadow (`0 1px 2px rgba(7, 59, 76, 0.06)`) lifts them off the page.
- **No edge lines:** panels and the page never get a line on one edge only, and there's no line across the top of the page.
- **Smaller parts:** stage headers, cards and list rows have 14px rounded corners, buttons and inputs 12px, rail buttons 12px, and badges and date pills are pills.
- **Spacing:** an 8px grid, with 24px between panels.
- **Dragging:** a card being dragged turns white and lifts with a stronger shadow and a 2-degree tilt. Where it would land, a gap the size of the card shows a pale tint of that column's stage colour with a 2px ring in the stage colour.
- **Focus:** every control shows a 2px Sea Green focus ring with a 2px gap when reached by keyboard.

### Dark mode

Dark mode keeps every layout, size, shape and font. Only colours change, taken from the tables above. What that means for the parts that aren't plain text on a panel:

- **Solid stage blocks** (column headers, pipeline-by-stage rows, funnel columns) keep their light-mode colours and text, except Negotiation, which is Sea Mist with Midnight text.
- **Charts:** grid lines use the Line colour and axis labels use Muted ink. The series keep their brand colours: the won line and bars in Sea Green, lost bars in the Lost grey. The headline panel's chart is unchanged, since that panel stays Midnight.
- **Tooltips**, on charts and on the rail, are Sea Mist with Midnight text.
- **Dialogs** are black panels, and the page behind them dims with black at 60% (light mode dims it with Midnight at 45%).
- **Messages:** a confirmation is Sea Mist with Midnight text and a dark Sea Green `#067A5C` icon (3.7:1, above the 3:1 an icon needs). An error is `#2B0D14` with Sea Mist text (12.3:1) and a `#FF7F9C` icon, so the two still look different at a glance.
- **Follow-ups:** overdue rows sit on `#2B0D14` with the date in `#FF7F9C` (7.5:1). Other rows use the Card colour.
- **Timeline icons:** call Cerulean with white, email Coral and status change Sea Green with Midnight, as in light mode. A note is Sea Mist with a Midnight icon.
- **Pipeline cards:** the date pill is black, and a late deal's pill is `#2B0D14` with `#FF7F9C` text. A dragged card turns `#1C3038`, one step lighter than the others, and keeps its tilt.
- **Delete buttons** stay dark Raspberry `#C2264F` with white text (5.7:1), and focus rings stay Sea Green, with their 2px gap in the panel colour.
- **Shadows** are drawn in black. Panels stand off the page by colour rather than by shadow.
- **Placeholders while loading** keep their translucent Sea Mist, which shows on both backgrounds.

### Formats `DES-05`

All formatting lives in one frontend module, `frontend/src/lib/format.ts`, which has its own unit tests.

- **Dates:** `23 Nov 2026`. Times show as `23 Nov 2026, 14:05`, on a 24-hour clock.
- **Money:**
  - in tables, forms and cards, `$12.500,00`, always with the dollar sign
  - in headline tiles, `$412.500`
  - on chart axes and labels, `$400k` and `$1,2M`.
- **Probability:** `75%`.
- **Relative dates on follow-ups:** "Today", "Tomorrow", "In 3 days", "1 day overdue" and "3 days overdue", with the full date in a tooltip.

### Tone `DES-06`

Plain business English, as the brand asks. Labels are short ("New deal", "Log activity", "Mark done"), with no jargon and no exclamation marks. Money is always shown with its currency.

## Sample data

Created by `backend/seed.py`. It uses a fixed random seed, so every reset gives the same data relative to today. On 23 Nov 2026 it gives these figures:
- $1.130.000 open in 14 deals, with $529.500 expected
- $668.000 won over 12 months
- a funnel of 100, 94, 76, 56 and 34%
- 4 overdue follow-ups.

- `SEED-01` **10 organizations** across seven industries: software, manufacturing, retail, healthcare, logistics, finance and hospitality. Each has a made-up name, a website on `.example` and a line of notes.
- `SEED-01` **25 contacts:**
  - 9 leads, 7 qualified and 9 customers
  - all but 3 at an organization
  - `SEED-03` every customer is the main contact of at least one won deal, and every main contact of a won deal is a customer.
- `SEED-01` **30 deals:**
  - 4 at New, 4 at Qualified, 3 at Proposal and 3 at Negotiation
  - `SEED-02` 13 won and 3 lost, with close dates spread so that each of the last 12 months has at least one won deal
  - `SEED-02` 3 of the open deals are late, and the rest have close dates over the next 4 months
  - values range from $2.500,00 to $180.000,00
  - `SEED-06` two open deals have a probability set by hand
  - `SEED-04` every deal past New has the stage-change events of the path it took
  - `SEED-04` pipeline order is set within each column.
- `SEED-05` **About 65 activities** on contacts and deals, spread over the last 12 months, in working hours and never later than now.
  - 4 have overdue follow-ups, 2 are due today, 4 are due in the next week and 3 are due later.
  - Several follow-ups are done.

## Testing

`npm test` must pass before any change is called done (`RUN-04`). Each change's `plan.md` lists the tests it adds. Between them, the suites cover:

- **Backend (pytest):**
  - every endpoint, against a temporary database
  - the stage rules (probability, close date, events, the customer change), through both the form and the board
  - each delete rule, and that a failed delete or move changes nothing
  - the move endpoint's renumbering
  - each dashboard figure, worked out from a small known set of data
  - each timeline's roll-up
  - the sample data, startup seeding, the shared validation cases, and speed.
- **Frontend (Vitest):**
  - money and date formatting
  - money input parsing (`DEC-04`)
  - the zod schemas, against the shared validation cases
  - the late-deal and expected-revenue helpers
  - the table, the deal form, the delete dialog, the board's totals and the dashboard's placeholders
  - the light and dark toggle, and the contrast of every text pair listed for dark mode under Design.
- **End to end (Playwright with Chrome), for each success criterion that can be automated:**
  - starting and landing on the dashboard, and nothing fetched from the internet
  - adding, searching, sorting, editing and deleting each kind of record, and checking it all after a reload and a restart
  - dragging a card within its column and to another column, with the mouse and the keyboard, then reloading
  - logging an activity and following it into the contact's and organization's timelines
  - follow-ups on the dashboard, and winning a deal and seeing the contact become a customer
  - form errors and failed saves
  - keyboard-only creation of a contact
  - speed, the empty states, and screenshots of every screen at 1280px and 1024px
  - switching to dark mode and back, with the choice kept after a reload
  - light mode compared against reference screenshots taken before dark mode was added, with the toggle's area masked.

  Each test also fails if the browser's console logs an error or a warning.

`SC-12`, a person using the change end to end by eye, stays a manual step after the tests pass.
