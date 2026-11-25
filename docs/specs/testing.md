# Testing

Part of the [Accountable spec](../spec.md). What the test suites cover. How to run them is under `RUN-04` in `docs/specs/running.md`.

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
  - the light and dark toggle, and the contrast of every text pair listed for dark mode under Design (`docs/specs/design.md`).
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
