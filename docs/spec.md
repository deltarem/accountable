# Spec: Accountable

This spec describes Accountable as it stands today: the problem it solves, how it behaves, how it looks and how it's built. Read this file first. It summarises the whole product, and its index says which file in `docs/specs/` holds the detail for each area. Then read only the area files a change touches.

A change starts in its own folder, `docs/changes/<branch name>/`:
- `intent.md` says what the change should achieve.
- `plan.md` says how it will be built and tested.

When the change is finished, this file and the area files it affects are updated so they describe the product with the change in it. Older change folders are history.

The look follows the brand skill (`.claude/skills/brand/SKILL.md`), and the stack follows `docs/TECH_STACK.md`. How the code is organised is in `docs/frontend-architecture.md` and `docs/backend-architecture.md`.

## The problem

A small business keeps track of its customers and sales in spreadsheets, inboxes and people's heads. Nobody can see at a glance:
- which companies we deal with
- who our contacts are
- what's in the sales pipeline
- what happened last with a customer
- what needs doing next.

## What Accountable is

Accountable is a business management system: a sales CRM that will grow into a full Business OS, including ERP. Today it is a complete sales CRM that a small team shares on the web. Everyone signs in, works on the same organizations, contacts and deals, and can see who added each record and who made each change. It does the everyday CRM essentials well, and it is meant to feel sharp, modern and professional.

It has five sections:
- **Dashboard**, the landing page after signing in: how sales are going at a glance.
- **Pipeline**: the deals as cards on a board, one column per stage.
- **Deals**, **Contacts** and **Organizations**: a searchable, sortable table of each, with a page for every record.

Every page has a slim top bar:
- **Search** on the left finds any organization, contact or deal by part of its name, from anywhere.
- **Your initials** on the right open a menu with the theme (light, dark or system) and signing out.

It has four kinds of record:
- **Organization**: a company we do business with.
- **Contact**: a person we deal with. A lead is simply a contact with the lead status.
- **Deal**: a potential sale, with a stage, a value in US dollars, a probability of close and a close date.
- **Activity**: a note, call or email logged on a contact or a deal, optionally with a follow-up date.

It comes with realistic sample data, so every screen looks alive the first time it starts. Sample records show "Sample data" as who added them.

### How it answers the problem

- **Which companies we deal with:** the Organizations table, and each organization's page with its contacts, deals and timeline.
- **Who our contacts are:** the Contacts table, filtered by lead, qualified or customer.
- **What's in the sales pipeline:** the Pipeline board with its totals and expected revenue, and the dashboard's headline figures, funnel and pipeline by stage.
- **What happened last with a customer:** each contact's and organization's timeline, newest first, with deal activity rolled up, and the dashboard's recent activity.
- **What needs doing next:** follow-ups on the dashboard, overdue first, and late deals marked in the table and on the board.
- **Who did what:** each record's page says who added it and who last changed it, and each timeline entry says who made it.

## Who uses it

- A small sales team sharing one Accountable on the web, each person signing in with their own email and password. For now it's a course project, built to show a polished, complete product rather than to run a live business yet.
- Everyone can do everything: there are no roles or permissions.
- People are added by whoever runs the Supabase project, in Supabase's dashboard. There's no sign-up page.
- No other systems are involved, apart from Supabase, which holds the data and handles sign-in, and Render, which hosts the app.

## Constraints

- The technology in `docs/TECH_STACK.md`, with the data in Postgres on Supabase and sign-in through Supabase Auth.
- It runs on this computer with one documented command that works on Mac, Linux and Windows: `npm run dev`, against Supabase, or `npm run dev:local`, offline on SQLite with a built-in test user.
- `npm run dev` and the hosted app need an internet connection, for Supabase. `npm run dev:local` and the tests don't.
- It is hosted as one web service on Render's free plan, at its `onrender.com` address.
- The browser holds only Supabase's publishable key, and the backend takes the user from the sign-in token on every request.
- Every change is kept: it's still there after a browser refresh, and every time the app starts it shows every change made before.
- One documented command resets the data to the sample data. On Supabase it asks for `--yes` first, because it wipes the team's data.
- The tests never touch Supabase, need no internet connection, and CI needs no secrets.
- It handles a few hundred of each kind of record comfortably. Paging or virtual scrolling for thousands of records isn't needed.

### Not in the product

- roles and permissions
- a sign-up page, a password reset, or signing in with Google or a magic link
- moving the data in a local SQLite file to Supabase
- screens that update live while someone else makes changes
- a layout for phones
- AI features
- email, calendar or phone integrations
- currencies other than US dollars
- reports beyond the dashboard
- tags or custom fields
- changing the pipeline stages or their usual probabilities
- importing or exporting data.

### Later

- **Roles and permissions.** Every record already says who added it and who last changed it, and every request knows who is signed in, so limiting who can change or delete what needs no change to the data.
- **A fuller history of changes.** The `events` table records stage and status changes with who made them. It is the place where a history of other changes would grow.

## Success criteria

The product meets these today. A change must keep them true, or say in its intent which one it changes.

1. `SC-01` Someone non-technical can start Accountable with the one documented command and open it in a browser. They sign in first, then land on the dashboard, with sample data on every screen. With `npm run dev:local` the built-in test user signs in, still with no internet connection.
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
9. `SC-09` With the sample data, every screen loads and every action responds in under a second. On Render's free plan this holds once the service is awake; the first visit after it sleeps waits for it to wake (`RUN-15`).
10. `SC-10` Every table, timeline and chart still looks right with no data in it, for example after deleting everything.
11. `SC-11` Every screen is sharp, modern and professional, and follows the brand. The dashboard is visually stunning, with a line chart, a bar chart and a visual of the pipeline.
12. `SC-12` Before a change is called done, someone has used it end to end in a real browser, the way a salesperson would: every section and action it touches, each screen checked by eye, with no errors in the browser's console. Passing tests is necessary, but it isn't enough.
13. The theme choice in the menu under your initials (Light, Dark or System) switches every screen, chart, dialog and message between light and dark mode.
    - Light mode is the default, and it looks as it did before dark mode was added, apart from the top bar and the rail's empty foot.
    - The choice is still there after a refresh and after a restart.
    - System follows the device's setting, and changes with it while the app is open.
    - Dark mode text meets the same contrast rules as light mode (`DEC-06`).
14. Signed out, every page shows the sign-in screen and every API route refuses. Signed in, everything works as before.
15. Every record and activity shows who added it, and every stage and status change shows who made it. Sample data shows "Sample data".
16. The search in the top bar finds an organization, a contact and a deal by part of a name, in any case, and opens it with the keyboard or a click.
17. The built app runs on this computer the way Render runs it, signed in against Supabase, and `npm test` and `npm run check` never touch Supabase, with or without its settings in `.env`.

## Requirement IDs

Each requirement in this spec carries an ID in code style, such as `DEC-07`.

| Prefix | What it covers |
|---|---|
| `SC` | Success criteria |
| `DEC` | Decisions |
| `RUN` | How it runs |
| `ARC` | Architecture, Decisions |
| `DM`, `RULE`, `TL` | Data model: tables, stage rules, timelines |
| `AUTH` | Signing in and checking the token |
| `API` | API |
| `UI-LAY`, `UI-DASH`, `UI-TBL`, `UI-REC`, `UI-PIPE`, `UI-FORM`, `UI-DEL`, `UI-EMPTY`, `UI-ERR` | Screens: layout, dashboard, tables, record pages, pipeline, forms, deleting, empty and loading states, errors |
| `UI-AUTH`, `UI-MENU`, `UI-WHO`, `UI-SRCH`, `UI-THEME` | Screens: sign-in, the menu under your initials, who added what, search, the theme choice |
| `DES` | Design |
| `SEED` | Sample data |

The index below says which file holds each ID.

The rules for IDs:
- An ID never changes meaning. A requirement that changes keeps its ID; a new requirement gets a new ID.
- A change's `plan.md` has a Traceability table: each ID the change adds or touches, the phase that builds it, and the test or check that proves it.
- `scripts/check-trace.mjs` runs first in `npm test`. It reads the IDs listed in this file's index. It fails if an ID here has no row in the plan, or a row names an ID this spec doesn't have.

## Index

The detail lives in one file per area. Decisions (`DEC`) settle questions where a simpler reading of the product would be wrong or unclear, and each sits in the area file it belongs to. The rest of the spec follows them.

| File | What it holds |
|---|---|
| [`docs/specs/dashboard.md`](specs/dashboard.md) | the dashboard: headline figures, charts, follow-ups and recent activity, and the decisions on the funnel and on which follow-ups show |
| [`docs/specs/pipeline.md`](specs/pipeline.md) | the pipeline board: totals strip, columns, cards, adding and dragging, keyboard moves |
| [`docs/specs/deals.md`](specs/deals.md) | deals: the table, the stage rules, close dates, undoing a win, deals with no organization, the deals table, page and form |
| [`docs/specs/contacts.md`](specs/contacts.md) | contacts: the table, status changes, the contacts table and page |
| [`docs/specs/organizations.md`](specs/organizations.md) | organizations: the table, industries, the organizations table, page and form |
| [`docs/specs/activities.md`](specs/activities.md) | activities, follow-ups, stage and status events, timelines, logging an activity |
| [`docs/specs/accounts.md`](specs/accounts.md) | sign-in and users: the users table, who added and changed each record, checking the token, the built-in test user, several people at once, the sign-in screen, the menu under your initials |
| [`docs/specs/search.md`](specs/search.md) | the search in the top bar: what it matches, its API, the dropdown and its keyboard use |
| [`docs/specs/screens.md`](specs/screens.md) | the look, the layout, rail and top bar, shared table, record page, form and delete behaviour, empty and loading states, errors, and the shared wireframes |
| [`docs/specs/theme.md`](specs/theme.md) | light, dark and system: the choice in the menu, where it's kept, how the switch works |
| [`docs/specs/design.md`](specs/design.md) | colours, contrast, fonts, shapes, dark mode colours, money and date formats, tone |
| [`docs/specs/architecture.md`](specs/architecture.md) | the layers, the code layout, the architecture decisions, settings, migrations, hosting, the rules every table and API route follows, "today" |
| [`docs/specs/running.md`](specs/running.md) | npm run dev and dev:local, seed, test, build and start, the database, settings, hosting on Render, the git hook, the coding agent's hooks and subagents |
| [`docs/specs/sample-data.md`](specs/sample-data.md) | the sample data |
| [`docs/specs/testing.md`](specs/testing.md) | what each test suite covers |

### Requirement IDs by file

Every ID in an area file is listed here under its file. The traceability check reads IDs from this file only, so a new ID goes into its area file and into this list in the same change.

- `docs/specs/dashboard.md`: `DEC-10`, `DEC-11`, `API-15`, `UI-DASH-01`, `UI-DASH-02`, `UI-DASH-03`, `UI-DASH-04`, `UI-DASH-05`, `UI-DASH-06`, `UI-DASH-07`, `UI-DASH-08`
- `docs/specs/pipeline.md`: `DEC-14`, `API-11`, `UI-PIPE-01`, `UI-PIPE-02`, `UI-PIPE-03`, `UI-PIPE-04`, `UI-PIPE-05`, `UI-PIPE-06`, `UI-PIPE-07`
- `docs/specs/deals.md`: `DEC-01`, `DEC-07`, `DEC-08`, `DM-03`, `RULE-01`, `RULE-02`, `RULE-03`, `RULE-04`, `RULE-05`, `RULE-06`, `RULE-07`, `API-08`, `API-09`, `API-10`, `UI-TBL-08`, `UI-REC-04`, `UI-FORM-04`
- `docs/specs/contacts.md`: `DEC-09`, `DM-02`, `API-05`, `API-06`, `API-07`, `UI-TBL-07`, `UI-REC-03`
- `docs/specs/organizations.md`: `DM-01`, `API-01`, `API-02`, `API-03`, `API-04`, `API-16`, `UI-TBL-06`, `UI-REC-02`, `UI-FORM-06`, `UI-FORM-07`
- `docs/specs/activities.md`: `DM-04`, `DM-05`, `TL-04`, `TL-01`, `TL-02`, `TL-03`, `API-12`, `API-13`, `API-14`, `UI-REC-05`, `UI-REC-06`, `UI-EMPTY-04`
- `docs/specs/accounts.md`: `DEC-18`, `DEC-19`, `DEC-20`, `DM-07`, `DM-08`, `AUTH-01`, `AUTH-02`, `AUTH-03`, `API-19`, `API-20`, `UI-AUTH-01`, `UI-AUTH-02`, `UI-MENU-01`, `UI-WHO-01`, `UI-WHO-02`
- `docs/specs/search.md`: `DEC-21`, `API-21`, `UI-SRCH-01`, `UI-SRCH-02`, `UI-SRCH-03`, `UI-EMPTY-06`
- `docs/specs/screens.md`: `UI-LAY-01`, `UI-LAY-02`, `UI-LAY-03`, `UI-LAY-04`, `UI-LAY-05`, `UI-TBL-01`, `UI-TBL-02`, `UI-TBL-03`, `UI-TBL-04`, `UI-TBL-05`, `UI-REC-01`, `UI-FORM-01`, `UI-FORM-02`, `UI-FORM-03`, `UI-FORM-05`, `UI-DEL-01`, `UI-DEL-04`, `UI-DEL-02`, `UI-DEL-03`, `UI-EMPTY-01`, `UI-EMPTY-02`, `UI-EMPTY-03`, `UI-PIPE-08`, `UI-EMPTY-04`, `UI-EMPTY-05`, `UI-ERR-01`, `UI-ERR-02`, `UI-REC-07`
- `docs/specs/theme.md`: `UI-THEME-01`
- `docs/specs/design.md`: `DEC-02`, `DEC-04`, `DEC-05`, `DEC-06`, `DES-01`, `DES-02`, `DES-03`, `DES-04`, `DES-05`, `DES-06`
- `docs/specs/architecture.md`: `DEC-12`, `ARC-01`, `ARC-02`, `ARC-03`, `ARC-04`, `ARC-05`, `ARC-06`, `ARC-07`, `ARC-08`, `ARC-09`, `ARC-10`, `ARC-11`, `ARC-12`, `ARC-13`, `ARC-14`, `ARC-15`, `ARC-16`, `ARC-17`, `ARC-18`, `ARC-19`, `ARC-20`, `DM-06`, `API-17`, `API-18`
- `docs/specs/running.md`: `DEC-03`, `DEC-22`, `RUN-01`, `RUN-02`, `RUN-12`, `RUN-03`, `RUN-04`, `RUN-05`, `RUN-13`, `RUN-14`, `RUN-15`, `RUN-07`, `RUN-08`, `RUN-09`, `RUN-10`, `RUN-11`, `RUN-06`
- `docs/specs/sample-data.md`: `DEC-13`, `SEED-07`, `SEED-01`, `SEED-03`, `SEED-02`, `SEED-06`, `SEED-04`, `SEED-05`
- `docs/specs/testing.md`: none yet
