# How it runs

Part of the [Accountable spec](../spec.md). Starting the app on Supabase or offline, the database, settings, seeding, the test command, building and hosting on Render, the git hook and the coding agent's hooks and subagents.

## Decisions

3. `DEC-03` **"One command" and installing.** `npm run dev` and `npm run dev:local` run a small Node script with no dependencies of its own. On the first run it installs what's missing (`npm install`; uv sets up Python and the backend packages by itself), then starts both servers.
   - The only things to install beforehand are Node 24 or later and uv.
   - The first run needs an internet connection to download packages.
   - After that, `npm run dev` and the hosted app need one all the time, for Supabase. `npm run dev:local` and the tests don't.
22. `DEC-22` **Three ways to run it.**

    | | Database | Sign-in | Internet |
    |---|---|---|---|
    | `npm run dev` | Postgres on Supabase | Supabase, with your own email and password | needed |
    | `npm run dev:local` | the local SQLite file | the built-in test user (`DEC-19`) | not needed after the first install |
    | Hosted on Render, or `npm start` here | Postgres on Supabase | Supabase | needed |

    The tests run like `npm run dev:local`, on their own database files.

## Commands and tooling

- `RUN-01` **Prerequisites:** Node 24 or later and uv. Google Chrome is needed only for the end-to-end tests. `npm run dev` also needs a Supabase project with its settings in `.env` (`RUN-13`), and an account added for you in its dashboard.
- `RUN-02` **`npm run dev`** runs `scripts/dev.mjs`:
  1. It installs Node packages if `node_modules` is missing or older than `package-lock.json`.
  2. It checks that `.env` has `DATABASE_URL`, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. If any is missing or empty, it says which, points to `.env.example`, suggests `npm run dev:local` for working offline, and starts nothing.
  3. It starts the backend with `uv run uvicorn` on `127.0.0.1:8000` and the frontend with Vite on `127.0.0.1:5173`. `BACKEND_PORT` and `FRONTEND_PORT` choose other ports.
  4. If a port can't be used, it says why before starting anything: already in use, or blocked by the system (Windows can reserve whole port ranges). It also says how to pick another port.
  5. It prints the address to open, and that it's using Supabase.
  6. Ctrl+C stops both servers and everything they started.
  7. Vite forwards `/api` to the backend, so the browser only talks to one address for data.
- `RUN-12` **`npm run dev:local`** does the same with `ACCOUNTABLE_LOCAL=1` (`ARC-17`):
  - It uses `data/accountable.db` and the built-in test user, and ignores the Supabase settings even when `.env` has them.
  - It needs no internet connection after the first install, and never contacts Supabase.
  - It prints the address to open and that it's in local mode, signed in as the test user.
  - ui-check uses this one (`RUN-11`).
- `RUN-03` **`npm run seed`** deletes all data except the `users` table and loads the sample data again, in one transaction. It works whether or not the app is running; a running app shows the new data on its next refresh. `npm run seed -- --empty` leaves every table empty, apart from `users`.
  - It resets the database `npm run dev` uses: Supabase when `.env` has `DATABASE_URL`.
  - On Supabase it wipes the team's data, so it does nothing unless given `--yes` (`npm run seed -- --yes`). Without it, it says which database it would reset, how many records it holds, and how to go ahead, then stops with exit code 1.
  - `npm run seed -- --local` resets the local SQLite file `npm run dev:local` uses instead, and needs no `--yes`.
- `RUN-04` **`npm test`** runs every suite in order:
  1. the traceability check
  2. the script tests (`node --test`)
  3. the backend tests (pytest)
  4. the frontend tests (Vitest)
  5. the end-to-end tests (Playwright with the installed Chrome).

  It keeps going after a suite fails, prints a pass or fail summary, and exits with 1 if any suite failed. The end-to-end tests start their own backend and frontend on ports 8100 and 5273, in local mode, with their own database file and the clock fixed to 23 Nov 2026, 14:00. The time is fixed as well as the date, so every screen looks the same on each run, which the light mode screenshot comparison needs.
  - `npm test` and `npm run check` never touch Supabase, whether or not `.env` has its settings, and need no internet connection (`ARC-14`).
  - Every unit test, in pytest and Vitest, runs in under a second on this computer, because CI runs on a much slower machine. A slower test is a failure to fix, not to live with.
- `RUN-05` **The database.**
  - With `npm run dev`, `npm start` and on Render, it's the Postgres database in `DATABASE_URL`.
  - With `npm run dev:local`, it's `data/accountable.db`, which is not committed to git. The environment variable `ACCOUNTABLE_DB` points to another file; the tests use it.
  - When the backend starts, it runs any migrations not yet applied (`ARC-03`). If the database was brand new, it then loads the sample data. A database that already has its tables is never reseeded, so the team's data is safe across restarts and deploys.
- `RUN-13` **Settings.** `.env` at the repo root holds `DATABASE_URL`, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (`ARC-17`). It is ignored by git and the coding agent can't change it (`RUN-09`). `.env.example` is committed, with the three names, empty values and a line on where each comes from in Supabase's dashboard.
- `RUN-14` **`npm run build` and `npm start`** run the app the way Render does, on this computer:
  - `npm run build` builds the frontend into `frontend/dist/`, with the Supabase address and publishable key from the environment or `.env`.
  - `npm start` runs migrations, then serves the API and the built frontend from one uvicorn process on `0.0.0.0` and the port in `PORT` (8000 if unset) (`ARC-18`).
  - Signing in uses Supabase, as with `npm run dev`.
- `RUN-15` **Hosting on Render.** `render.yaml` describes one web service on Render's free plan:
  - It builds with `npm ci` and `npm run build`, and starts with `npm start`, which runs migrations before taking requests.
  - It answers at its `onrender.com` address, over HTTPS.
  - It names `DATABASE_URL`, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` with `sync: false`, so their values are entered in Render's dashboard and never written in the file. It sets `TZ` to the team's time zone (`DEC-12`).
  - On the free plan the service sleeps after about 15 minutes with no visits. The first visit after that waits while it wakes, which can take up to a minute. The one-second rule (`SC-09`) applies once it's awake.
  - People are added in Supabase's dashboard, and Supabase's Auth settings list the `onrender.com` address as the site's address.
- `RUN-07` **The git pre-commit hook** (lefthook, `lefthook.yml`), installed by `npm install`, runs in two steps and stops the commit if either fails:
  1. It formats the staged files (Prettier in `frontend/`, ruff format in `backend/`) and adds the fixes to the commit. Changes that aren't staged stay out of it.
  2. It lints the staged files (ESLint, ruff check), checks the types of the frontend or backend when files of that kind are staged (tsc, ty) and scans what is staged for secrets (gitleaks).

  It runs no tests, so a commit stays quick. `git commit --no-verify` skips it.
- `RUN-08` **When the coding agent finishes a turn**, a Claude Code Stop hook (`.claude/hooks/check-on-stop.mjs`) runs `npm run check:quick`. If it fails, the agent is sent the output of the failed steps and keeps working. It is blocked only once: the next time it stops, it may.
- `RUN-09` **The coding agent can't change `.env`**: a Claude Code PreToolUse hook (`.claude/hooks/protect-env.mjs`) blocks the file-editing tools on `.env` and `.env.*` in any folder, except `.env.example`, and any shell command that names one of those files.
- `RUN-10` **The reviewer subagent** (`.claude/agents/reviewer.md`, on Sonnet) reviews the changes on a branch, a commit or a range against `docs/REVIEW.md`. It makes one pass per section of the policy and reports Important findings and at most five nits, each with a file and line, then a line per pass on what it checked. It has Read, Grep, Glob and Bash, and never changes anything. Its own PreToolUse hook (`.claude/hooks/reviewer-read-only.mjs`) lets its shell run only commands that read: listed git subcommands (`diff`, `log`, `show`, `grep`, `status` and similar, and `branch`, `tag`, `stash`, `remote` and `worktree` only when they list), and `grep`, `rg`, `find`, `cat`, `head`, `ls` and a few more. It denies everything else, redirects into files, `$(...)` and backticks, subshells, the flags that make a reader write or run a program (`find -exec`, `git diff --output` and the like), and PowerShell.
- `RUN-11` **The ui-check subagent** (`.claude/agents/ui-check.md`, on Sonnet) checks the running app in Chrome through the Playwright MCP server, set up for the project in `.mcp.json`. It checks the app started with `npm run dev:local`, never the one on Supabase. It signs in as the built-in test user, then opens each page from `UI-LAY-04` (or the ones it's asked about) at 1280 x 800, takes a full-page screenshot in light and dark mode, checks it against the brand skill and this spec, and reports what's broken and what's off-brand, naming the screenshot. It also checks the sign-in screen, the search dropdown and the menu under your initials. Screenshots go to `.playwright-mcp/`, which git ignores. It has Read, Grep, Glob and the browser tools, and no tool that edits files. It doesn't start the app, save forms, delete, drag cards or tick follow-ups, and it puts the theme choice back as it found it.

`RUN-06` `docs/STATUS.md` explains how to run, seed and test the app, in a few lines, including both ways to run it, the test user's email and password, and the `--yes` on seeding Supabase.
