# Intent: sign-in, search and a user menu

## Problem

Accountable runs on one computer for one person. A team can't share it, nobody signs in, and there's no quick way to find a record.

## Proposed outcome

A small team shares one Accountable on the web. Everyone signs in and works on the same organizations, contacts and deals, and each record shows who added it. A search box in the top bar finds any organization, contact or deal. A menu under your initials holds the theme, light, dark or system, and signing out.

- **The top bar** is a slim bar above the title row on every page, with the search box on the left and your initials on the right.
- **Search** shows a dropdown as you type, grouped under Organizations, Contacts and Deals, up to 5 of each. The arrow keys and Enter, or a click, open a record. The search boxes above the tables stay.
- **Names** come from the display name set for each person in Supabase's dashboard, or the part of their email before the @ when there's none. Sample records show "Sample data" as who added them.

## Constraints

- The data lives in Postgres on Supabase, still through SQLAlchemy Core. The tests keep their own SQLite databases.
- Sign-in uses Supabase Auth with an email and password. The browser holds only the publishable key. The backend checks the token on every request and takes the user from it, never from the request.
- There's no sign-up page. People are added in Supabase's dashboard.
- The settings live in .env as DATABASE_URL, SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.
- Each organization, contact, deal and activity records who added it and who last changed it. Stage and status changes in timelines record who made them.
- The end-to-end tests and ui-check sign in without anyone's real password and never touch Supabase. CI needs no secrets.
- Two ways to run it on this computer:
  - `npm run dev` uses Supabase and real sign-in when .env has the settings.
  - `npm run dev:local` runs offline on SQLite with a built-in test user. ui-check uses this one.
- `npm run seed` won't touch Supabase unless given `--yes`, because it would wipe the team's data.
- Search ignores case and works the same on SQLite and Postgres.
- The theme moves from the dark mode button into the menu. System follows the device's setting.
- Accountable now needs an internet connection, for Supabase. The tests still run without one.
- The app deploys to Render's free plan as one web service: FastAPI serves the built frontend and the API, migrations run when it starts, and it answers at its onrender.com address. A render.yaml describes it, with the Supabase settings entered in Render, not written in the file.
- Every unit test, old and new, runs in under a second on this computer, because CI runs on a much slower machine.
- No new dependencies unless the plan makes the case for one.

## Not in this change

- Roles and permissions: everyone can do everything.
- Moving the data in the local SQLite file to Supabase. Supabase starts with the sample data.
- Signing in with Google, magic links or a password reset.

## Changes to the spec's success criteria

- `SC-01`: after starting it and opening it in a browser, you sign in first, then land on the dashboard. With `npm run dev:local` the test user signs in, still without an internet connection.
- Criterion 13 (light and dark): the toggle at the foot of the rail is replaced by the theme choice in the menu, which adds System. Light mode stays the default, the choice is still kept, and dark mode keeps the same contrast rules.
- The spec's constraint that Accountable needs no internet connection no longer holds for `npm run dev` or the hosted app, because they need Supabase. `npm run dev:local` and the tests still run offline.

## Success criteria

1. npm run check passes and never touches Supabase, with or without the settings in .env.
2. Signed out, every page shows the sign-in screen and every API route refuses. Signed in, everything works as before.
3. Every record and activity shows who added it, and every stage and status change shows who made it.
4. Search finds an organization, a contact and a deal by part of a name, in any case.
5. The menu's theme choice is remembered, and System follows the device's setting.
6. The built app runs on this computer the way Render runs it, signed in against Supabase.
