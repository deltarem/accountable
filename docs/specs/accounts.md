# Sign-in and users

Part of the [Accountable spec](../spec.md). Signing in, the people who use Accountable, who added and changed each record, and the menu under your initials. The theme choice in that menu is in `docs/specs/theme.md`, and the top bar that holds it is in `docs/specs/screens.md`.

## Decisions

18. `DEC-18` **Where names come from.** Supabase knows who everyone is, but the backend only sees the person making the request. So the backend keeps its own `users` table (`DM-07`):
    - Each time someone uses the app, the backend writes their id, email and name from their sign-in token into `users`, if anything there has changed.
    - A person's name is the display name set for them in Supabase's dashboard, or the part of their email before the @ when there's none.
    - Records point to `users` by id, so every screen can show who added what, including people who aren't signed in right now.
    - Someone can only add or change a record after signing in, so everyone named on a record is in `users`.
    - Removing someone in Supabase's dashboard stops them signing in. Their name stays on what they added.
    - A changed display name shows on every record once they next use the app.
19. `DEC-19` **The built-in test user.** `npm run dev:local`, the end-to-end tests and ui-check sign in without Supabase and without anyone's real password:
    - In local mode the backend accepts one built-in user, "Test User" (`test@example.com`), with the password `accountable`. Both are public, written in `docs/STATUS.md`, and filled in on the sign-in screen.
    - Local mode only runs on SQLite. The backend refuses to start in local mode when `DATABASE_URL` points to Postgres, so the test user can never reach the team's data.
    - Local mode is off unless `npm run dev:local` or the tests turn it on. Nothing in `.env` or `render.yaml` turns it on.
20. `DEC-20` **Several people at once.**
    - Everyone can see, add, change and delete everything. There are no roles.
    - The last save wins. Saving over someone else's change gives no warning.
    - Other people's changes show the next time a screen loads its data: on opening a page, on a refresh, or on coming back to the browser tab. Screens don't update live.
    - Two people dragging cards in the same column at once can't corrupt the order: each move renumbers its columns in one transaction (`ARC-08`).

## Data model

### users `DM-07`

One row per person who has signed in.

| Column | Type | Rules |
|---|---|---|
| id | text | the person's Supabase user id, the primary key. This table has no integer id, unlike the others (`DM-06`). |
| email | text | from the sign-in token |
| name | text | the display name, or the part of the email before the @ (`DEC-18`) |
| created_at, updated_at | datetime | set by the server |

### Who added and changed each record `DM-08`

- Organizations, contacts, deals and activities each have `created_by` and `updated_by`, pointing to `users.id`.
  - Both are set when the record is added. `updated_by` changes on every save, a move on the board, and a status change caused by a win.
  - Logging an activity on a record doesn't count as changing that record.
- Events have `created_by`: the person whose action made the stage or status change. A win that makes a contact a customer records the person who won the deal on both events.
- The server sets these from the signed-in user (`AUTH-01`). The API ignores them in a request body.
- Sample records have empty `created_by` and `updated_by` (`SEED-07`). The screens show "Sample data" for them.

## Signing in

- `AUTH-01` **Every API route needs a signed-in user.**
  - Every route under `/api` checks the request's token before doing anything else. With no token, or one that's expired or not signed by Supabase, it returns 401 with `{"detail": "Sign in to continue"}`.
  - The backend takes the user from the token and nowhere else. A user id in a request body, a query or a header other than the token is ignored.
  - The only exception is `POST /api/local/sign-in` (`API-20`), which exists in local mode only.
  - The built frontend's files are served to anyone, so the sign-in screen can load. They hold no data.
- `AUTH-02` **Checking the token.** People sign in with Supabase Auth using an email and a password. The browser sends Supabase's access token with every API call. The backend checks the token's signature against the public keys Supabase publishes for the project, and its expiry, without asking Supabase on every request. It keeps the keys in memory and fetches them again when a token names a key it doesn't have.
- `AUTH-03` **Staying signed in.**
  - The browser keeps the session, so a refresh or a new tab stays signed in, and renews the token before it expires.
  - If the session can't be renewed, or an API call returns 401, the app shows the sign-in screen with "Your session has ended. Sign in again." Signing in returns to the same page.
  - The browser holds only Supabase's address and the publishable key, never a secret.
- There's no sign-up page, no password reset and no other way to sign in. People are added, and their passwords set, in Supabase's dashboard.

## API

| ID | Method and path | Purpose |
|---|---|---|
| `API-19` | `GET /api/me` | the signed-in person: id, email, name and initials |
| `API-20` | `POST /api/local/sign-in` | local mode only: body `{email, password}`; signs in the built-in test user (`DEC-19`) and returns a token the backend accepts in local mode. Any other email or password gets "Email or password is wrong". Outside local mode the route doesn't exist (404). |

Names and initials of the people who added or changed a record come back inside that record, its timeline entries and the dashboard's recent activity, as `created_by_name` and `updated_by_name`.

## Screens

### Sign-in screen

`UI-AUTH-01` The only screen with no rail and no top bar.

```
                     page background

              +---------------------------------+
              |  [A]                            |
              |                                 |
              |  Sign in to Accountable         |
              |                                 |
              |  Email                          |
              |  [ name@company.com           ] |
              |                                 |
              |  Password                       |
              |  [ ********                   ] |
              |  ! Email or password is wrong   |
              |                                 |
              |  [          Sign in           ] |
              |                                 |
              |  New here? Ask your team to add |
              |  you to Accountable.            |
              +---------------------------------+
               about 400px wide, centred, white panel
```

- A white panel, centred on the page background, with the Accountable mark, the title "Sign in to Accountable" in 28px semibold, the two fields and a full-width Sea Green "Sign in" button with Midnight text.
- The email field has focus. Enter signs in. The button reads "Signing in..." and can't be pressed twice while it waits.
- Errors show under the password field, in Raspberry with an icon, as form errors do (`UI-FORM-02`):
  - a missing field: "Enter your email" or "Enter your password"
  - wrong details: "Email or password is wrong"
  - Supabase can't be reached: "Couldn't reach the sign-in service. Check your connection and try again."
- A Muted line at the foot: "New here? Ask your team to add you to Accountable."
- In local mode the fields come filled in with the test user's email and password, and a Muted line above the button says "Local mode: you're signing in as the built-in test user."
- It follows the theme choice (`UI-THEME-01`), with the Panel colour in dark mode.

`UI-AUTH-02` **Signed out, every address shows the sign-in screen.**
- The address stays as it is, so after signing in the page that was asked for opens. From `/deals/12` that's the deal; from `/` it's the dashboard.
- No page, data or record name shows before signing in, not even while loading.
- Signing out returns to the sign-in screen at `/`, and clears every piece of data the app had loaded.

### The menu under your initials

`UI-MENU-01` On the right of the top bar (`UI-LAY-05`) is a 36px circle with your initials, in the Midnight fill (Sea Mist with Midnight text in dark mode).
- Initials are the first letters of the first and last words of your name, or the first two letters of a one-word name, in capitals: "Priya Shah" gives PS, "priya" gives PR.
- Its accessible name and its tooltip are "Account menu for Priya Shah".
- Clicking it, or pressing Enter, Space or the down arrow on it, opens a Radix dropdown menu, aligned to its right edge:

```
                          +----------------------------+
                          | Priya Shah                 |
                          | priya@company.com          |
                          |----------------------------|
                          | THEME                      |
                          | (o) Light                  |
                          | ( ) Dark                   |
                          | ( ) System                 |
                          |----------------------------|
                          | [->] Sign out              |
                          +----------------------------+
                           about 240px wide, Raised colour
```

- Your name in semibold and your email in Muted ink, which aren't buttons.
- **Theme:** Light, Dark and System as a radio group, with a Lucide sun, moon and monitor icon, and a tick on the current one (`UI-THEME-01`). Choosing one changes the theme at once and keeps the menu open.
- **Sign out**, with a Lucide log-out icon. It signs out at once, with no confirmation.
- The arrow keys move through the items, Enter or Space picks one, and Escape closes the menu and returns focus to the initials.
- The lines between groups are inside the menu, never on the page.

### Who added and changed a record

- `UI-WHO-01` **Record pages:** the header panel ends with a line in Muted ink, under the key facts: "Added by Priya Shah on 2 Mar 2026 · Last changed by Sam Lee on 20 Nov 2026". When nobody has changed it since, only the first half shows. Sample records read "Added by Sample data on 2 Mar 2026". The deal page's "Created" fact gives way to this line.
- `UI-WHO-02` **Timelines and the dashboard's recent activity:** each entry ends its date line with who made it: "15 Nov 2026, 16:40 · Priya Shah", for an activity, a stage change and a status change alike. Sample entries end with "· Sample data". An activity's entry names who added it, not who last edited it.
- Tables and pipeline cards don't show who added a record.
