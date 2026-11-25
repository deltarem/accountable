# How it runs

Part of the [Accountable spec](../spec.md). Starting the app, the database file, seeding, the test command, the git hook and the coding agent's hooks and subagents.

## Decisions

3. `DEC-03` **"One command" and installing.** `npm run dev` runs a small Node script with no dependencies of its own. On the first run it installs what's missing (`npm install`; uv sets up Python and the backend packages by itself), then starts both servers.
   - The only things to install beforehand are Node 24 or later and uv.
   - The first run needs an internet connection to download packages; after that, none.

## Commands and tooling

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

  It keeps going after a suite fails, prints a pass or fail summary, and exits with 1 if any suite failed. The end-to-end tests start their own backend and frontend on ports 8100 and 5273, with their own database file and the clock fixed to 23 Nov 2026, 14:00. The time is fixed as well as the date, so every screen looks the same on each run, which the light mode screenshot comparison needs.
- `RUN-05` **The database** is `data/accountable.db`, which is not committed to git. The environment variable `ACCOUNTABLE_DB` points to another file; the tests use it. When the backend starts and the file doesn't exist, it creates the tables and loads the sample data. An existing file is never reseeded.
- `RUN-07` **The git pre-commit hook** (lefthook, `lefthook.yml`), installed by `npm install`, runs in two steps and stops the commit if either fails:
  1. It formats the staged files (Prettier in `frontend/`, ruff format in `backend/`) and adds the fixes to the commit. Changes that aren't staged stay out of it.
  2. It lints the staged files (ESLint, ruff check), checks the types of the frontend or backend when files of that kind are staged (tsc, ty) and scans what is staged for secrets (gitleaks).

  It runs no tests, so a commit stays quick. `git commit --no-verify` skips it.
- `RUN-08` **When the coding agent finishes a turn**, a Claude Code Stop hook (`.claude/hooks/check-on-stop.mjs`) runs `npm run check:quick`. If it fails, the agent is sent the output of the failed steps and keeps working. It is blocked only once: the next time it stops, it may.
- `RUN-09` **The coding agent can't change `.env`**: a Claude Code PreToolUse hook (`.claude/hooks/protect-env.mjs`) blocks the file-editing tools on `.env` and `.env.*` in any folder, except `.env.example`, and any shell command that names one of those files.
- `RUN-10` **The reviewer subagent** (`.claude/agents/reviewer.md`, on Sonnet) reviews the changes on a branch, a commit or a range against `docs/REVIEW.md`. It makes one pass per section of the policy and reports Important findings and at most five nits, each with a file and line, then a line per pass on what it checked. It has Read, Grep, Glob and Bash, and never changes anything. Its own PreToolUse hook (`.claude/hooks/reviewer-read-only.mjs`) lets its shell run only commands that read: listed git subcommands (`diff`, `log`, `show`, `grep`, `status` and similar, and `branch`, `tag`, `stash`, `remote` and `worktree` only when they list), and `grep`, `rg`, `find`, `cat`, `head`, `ls` and a few more. It denies everything else, redirects into files, `$(...)` and backticks, subshells, the flags that make a reader write or run a program (`find -exec`, `git diff --output` and the like), and PowerShell.
- `RUN-11` **The ui-check subagent** (`.claude/agents/ui-check.md`, on Sonnet) checks the running app in Chrome through the Playwright MCP server, set up for the project in `.mcp.json`. It opens each page from `UI-LAY-04` (or the ones it's asked about) at 1280 x 800, takes a full-page screenshot in light and dark mode, checks it against the brand skill and this spec, and reports what's broken and what's off-brand, naming the screenshot. Screenshots go to `.playwright-mcp/`, which git ignores. It has Read, Grep, Glob and the browser tools, and no tool that edits files. It doesn't start the app, save forms, delete, drag cards or tick follow-ups, and it puts the light or dark choice back as it found it.

`RUN-06` `docs/STATUS.md` explains how to run, seed and test the app, in a few lines.
