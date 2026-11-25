# Testing

Part of the [Accountable spec](../spec.md). What the test suites cover. How to run them is under `RUN-04` in `docs/specs/running.md`.

`npm test` must pass before any change is called done (`RUN-04`). Each change's `plan.md` lists the tests it adds. No suite touches Supabase or the internet, and every unit test runs in under a second on this computer (`ARC-14`, `RUN-04`). Between them, the suites cover:

- **Backend (pytest):**
  - every endpoint, against a temporary database, signed in with a test token
  - sign-in: every route refusing a missing, expired, wrongly signed or tampered token with a 401; the user taken from the token and never from the body; `users` kept up to date and names falling back to the email; local mode refusing to start on Postgres; the local sign-in route missing outside local mode
  - who added and changed each record and activity, and who made each stage and status change, with two different users
  - search: part of a name, any case, accented letters, `%` and `_` as plain characters, the order, and at most 5 per group
  - the migrations on an empty SQLite database and on a file from before them, keeping its data
  - `npm run seed` refusing a Postgres `DATABASE_URL` without `--yes`, tested without connecting to it
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
  - the theme choice in the menu, including System following the device, and the contrast of every text pair listed for dark mode under Design (`docs/specs/design.md`)
  - the sign-in form and its errors, initials from a name, the account menu, and the search dropdown's groups, keyboard use and empty state
  - a 401 from the API showing the sign-in screen.
- **End to end (Playwright with Chrome), for each success criterion that can be automated:**
  - starting signed out, signing in as the test user and landing on the dashboard, and nothing fetched from the internet
  - every address showing the sign-in screen when signed out, and the asked-for page opening after signing in
  - signing out, and the API refusing requests afterwards
  - searching from the top bar and opening an organization, a contact and a deal with the keyboard and the mouse
  - who added a record showing on its page and its timeline
  - adding, searching, sorting, editing and deleting each kind of record, and checking it all after a reload and a restart
  - dragging a card within its column and to another column, with the mouse and the keyboard, then reloading
  - logging an activity and following it into the contact's and organization's timelines
  - follow-ups on the dashboard, and winning a deal and seeing the contact become a customer
  - form errors and failed saves
  - keyboard-only creation of a contact
  - speed, the empty states, and screenshots of every screen at 1280px and 1024px
  - switching between Light, Dark and System in the menu, with the choice kept after a reload, and System following an emulated device setting
  - light mode compared against reference screenshots, retaken for the top bar and the rail without its toggle.

  Each test signs in as the built-in test user, in local mode. Each test also fails if the browser's console logs an error or a warning.

Two checks stay manual after the tests pass:
- `SC-12`, a person using the change end to end by eye.
- Signing in against the real Supabase project, with `npm run dev` and with `npm run build` and `npm start`, and once on Render after a deploy. The tests can't do this without secrets, which CI doesn't have.
