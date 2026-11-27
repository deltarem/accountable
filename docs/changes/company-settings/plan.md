# Plan: company settings

This plan turns the company-settings intent and the spec, already updated on this branch, into build work: which files change, in what order, what could go wrong and how we'll know it works. IDs such as B7 and M8 are the spec's requirements, most of them in [company-settings.md](../../specs/company-settings.md). The intent wins over the spec and the spec wins over this plan. If the build shows the spec is wrong, fix the spec in the same change and say so in `docs/STATUS.md`.

There's no new dependency. The tax rate's exact arithmetic uses Python's own `decimal` module on the backend and plain string handling on the frontend. React Hook Form already does the two awkward parts of the form: sending only what changed (B8), and keeping what's typed when a refetch arrives (B9), through `formState.dirtyFields` and the `values` option with `resetOptions: { keepDirtyValues: true }`.

## Files that change

### Docs

| File | Change |
|---|---|
| `docs/spec.md`, `docs/specs/*.md` | Already updated on this branch. Changes only if the build shows they're wrong, apart from the three below |
| `docs/specs/architecture.md` | `fields.py` added to the file tree, and `server-errors.ts` moved to `lib/` (Phase 1) |
| `docs/specs/running.md` | C4: `npm run seed` also says the company settings will go back to the sample company's (Phase 2) |
| `docs/STATUS.md` | Company settings added to what's done. The steps for clearing the shared app's sample data say they leave the company settings in place. A line on where the settings are and that anyone can change them. At the end |

### Backend: existing files

| File | Change |
|---|---|
| `backend/accountable/crm/schemas.py` | `Request`, `_is_storable`, `_blank_to_none`, `OptionalText`, `EMAIL`, `_email`, `Email`, `_with_z`, `UtcTime` and `Now` move out to the new `fields.py`, and are imported back from there. Nothing else changes |
| `backend/accountable/main.py` | Includes `company.router` among the signed-in routes |
| `backend/accountable/crm/sample_data.py` | `FIELDSTONE`, B11's values, and `fill()` writes them through `company.replace()`, put down to one of the made-up teammates, three days before the day of seeding |
| `backend/accountable/cli.py` | Seed's question also says "The company settings will go back to the sample company's." Empty's doesn't change. `_wipe` stays as it is, so empty leaves the settings (B13) |

### Backend: new files

| File | What it holds |
|---|---|
| `backend/accountable/fields.py` | What every area's requests and replies share, moved from `crm/schemas.py`: the `Request` base model that refuses text a database can't store, blank text to null, the email check, times sent with a `Z`, and `Now` |
| `backend/accountable/company.py` | The `company_settings` table, on `db.metadata` with `TABLE_OPTIONS` and a check constraint that `id` is 1, written as a SQLAlchemy expression. The B3 and B4 rules as Pydantic validators that each raise `ValueError` with B3's message, so the existing 422 handler shows it for any bad value, a wrong type or `null` included. Tax rate parsing: a string of digits with at most three after the point, 0 to 100, turned into thousandths of a percent with `Decimal`, and back to the shortest string for replies. `replace(conn, values, user_id, now)` for the sample data. `GET /settings` and `PATCH /settings`. A save writes only the fields whose tidied value differs from what's stored, and sets `updated_by` and `updated_at` only if there is one (B7) |
| `backend/accountable/migrations/versions/0004_company_settings.py` | Creates `company_settings`, adds its one row with B12's values and nobody recorded through `op.bulk_insert`, and on Postgres turns on row-level security for it. Holds its own copy of B12's values, so it never changes when `company.py` does. The downgrade drops the table |
| `shared/company-settings-cases.json` | Values for each field with whether they pass and the message, and for the tax rate the stored thousandths and the reply's string. Both unit test suites read it |

### Frontend: existing files

| File | Change |
|---|---|
| `frontend/src/App.tsx` | The `/settings` route, for the Company settings page |
| `frontend/src/components/UserMenu.tsx` | A Company settings item just above Sign out, in the same group, with no icon, that goes to `/settings` and closes the menu |
| `frontend/src/crm/forms/server-errors.ts` and its test | Move to `frontend/src/lib/`, unchanged, so `company/` can use them without importing `crm/`. The four CRM forms import them from there |
| `frontend/src/lib/validate.ts` | Nothing new. The page uses its `isEmail` and `EMAIL_MESSAGE` |
| `frontend/src/layout.test.ts` | Also checks that `company/` never imports `crm/` |

`Shell.tsx` needs no change: its links are `NavLink`s, and none matches `/settings`, so no section shows as current (B2). `Field.tsx`, `LoadFailed.tsx` and `PageHeader.tsx` are used as they are.

### Frontend: new files

| File | What it holds |
|---|---|
| `frontend/src/company/settings.ts` | Named so, not `companySettings.ts`, because Windows doesn't tell file names apart by case and it would clash with `CompanySettings.tsx`. The settings type as the API sends it, the Zod schema with B3's rules and messages, turning the reply into form values and the changed fields into a `PATCH` body, and `useCompanySettings` and `useSaveCompanySettings` on TanStack Query. A save invalidates everything, as every write does |
| `frontend/src/company/CompanySettings.tsx` | The page in [the spec's screen](../../specs/company-settings.md#company-settings-page): the three groups, Save settings, the B7 line, "Settings saved.", `LoadFailed` in place of the form when the read fails (B10) |
| `frontend/src/company/settings.test.ts`, `CompanySettings.test.tsx` | See [Proof](#proof) |

### End-to-end tests

| File | Change |
|---|---|
| `e2e/settings.spec.ts` | New. See [Proof](#proof) |
| `e2e/menu.spec.ts` | The menu test expects Company settings above Sign out. The keyboard test's arrow presses to reach Sign out go up by one. `/settings` joins the screens in "the menu is on every screen" and in the contrast sweep, in both modes |
| `e2e/quality.spec.ts` | `/settings` joins the screens checked for the console, the layout at 1280px and Tab with a focus ring |
| `e2e/data.spec.ts` | The `npm run empty` test also opens `/settings` and finds the settings still there |
| `e2e/helpers.ts` | A `SAMPLE_SETTINGS` constant with B11's values, if more than one file needs them |

### Backend tests

| File | Change |
|---|---|
| `backend/tests/test_company.py` | New. See [Proof](#proof) |
| `backend/tests/test_migrations.py` | Upgrading from 0003 adds B12's row with nobody recorded and keeps every other row. The offline Postgres SQL turns on row-level security for `company_settings`. The check constraint matches between the migration and `company.py` |
| `backend/tests/test_cli.py` | Seed puts back B11's settings after a change. Empty leaves a changed set alone. Seed's question mentions the settings |
| `backend/tests/test_sample_data.py` | M8: the sample settings are B11's, put down to a made-up teammate, dated before the day of seeding |
| `backend/tests/test_every_route.py` | `test_the_routes_were_found` also expects `("GET", "/api/settings")` and `("PATCH", "/api/settings", "company_name")` among the routes and body fields, so the generic checks are proved to reach them |
| `backend/tests/test_layout.py` | Nothing new. Its existing rules already keep `company.py` and `fields.py` from naming `crm/` |

## Order of work

Four phases. Each ends with `npm run check:quick` passing, and the last ends with `npm run check`. The project owner commits, so each phase ends at a point worth committing.

Run the app only on a temporary database: `ACCOUNTABLE_DB=<scratchpad>/accountable.db npm run dev`. Migration 0004 upgrades whatever database the app starts on, and nothing takes it back.

### Phase 1: move what both areas share, with no change in behavior

1. Create `backend/accountable/fields.py` from the pieces of `crm/schemas.py` listed above, and import them back into `schemas.py`, so every other import still works.
2. Move `server-errors.ts` and its test to `frontend/src/lib/`, and point the four CRM forms at the new place.
3. Update the file tree in `architecture.md`.

Done when `npm run check:quick` passes with no test changed apart from the moved test's import path.

### Phase 2: the backend

1. Write `company.py`: the table, the validators, the tax rate conversion, `replace()` and the two routes. Include its router in `main.py`.
2. Write `shared/company-settings-cases.json`, then the rule tests in `test_company.py` that read it, and get them passing.
3. Write migration 0004. Run `test_migrations.py` and add its cases.
4. Add `FIELDSTONE` and the call in `sample_data.fill()`. Add seed's line to `cli.py` and update C4 in `running.md`.
5. Write the rest of `test_company.py`, and the cases in `test_cli.py`, `test_sample_data.py` and `test_every_route.py`.
6. Check by hand on a temporary database: start the app on a new one and read `GET /api/settings`, then start it on a copy of a database made at 0003 and read B12's settings.

Done when the pytest suite passes, with every new test under a second.

### Phase 3: the page

1. Write `settings.ts` and `settings.test.ts` against the shared cases.
2. Write `CompanySettings.tsx` and add the route in `App.tsx`.
3. Add Company settings to `UserMenu.tsx`.
4. Add `layout.test.ts`'s new rule.
5. Write `CompanySettings.test.tsx` and the new `UserMenu.test.tsx` case.
6. Walk the page in Chrome on a temporary database, in light and dark mode, at 1440 by 900 and 1280 by 720, against the spec's screen and the brand skill: no lines between the groups, no edge borders, the main button in Sea Green with Midnight text, numbers and prefixes in JetBrains Mono, errors in the Raspberry text color.

Done when the unit tests pass and the walk-through finds nothing.

### Phase 4: end-to-end tests and the finish

1. Write `e2e/settings.spec.ts`.
2. Update `menu.spec.ts`, `quality.spec.ts` and `data.spec.ts`.
3. Update `docs/STATUS.md`.
4. Run `npm run check` until it passes.

## Risks

Most damaging first.

1. **The migration changes the team's database for good.** 0004 runs on the next deploy against Supabase, and adds a table and a row that nothing takes back. On SQLite, `test_migrations.py` upgrades a database made at 0003 and checks every row survives. On Postgres, the offline SQL test checks what would run, and the project owner's `npm start` against an empty Supabase project proves it runs. The by-hand check that the team's own database gets B12's settings happens only when the change is deployed, never earlier from this computer. Phases 2 and 4.
2. **The owner's `data/accountable.db` gets upgraded or reseeded.** Starting `npm run dev` on it runs 0004 on their records, and `npm run seed` would replace them. Every run in this plan uses `ACCOUNTABLE_DB` with a temporary file, and the end-to-end tests use their own databases already. Phases 2 to 4.
3. **The tax rate loses precision.** 8.875 as a float is 8.87499999…, and a round trip could save 8874 or show 8.874999. The rate stays a string from the input box to the API, becomes an integer of thousandths through `Decimal` on the backend, and goes back to a string the same way. The shared cases include 8.875, 0.001, 99.999, 100 and 0, checked as stored values and as reply strings on both sides. Phase 2.
4. **A wrong type gets the generic "Check this field".** The 422 handler uses B3's message only for a `ValueError`. Pydantic's own type errors, such as a string for payment terms, a number for the tax rate or `null` for the company name, would fall through to the generic message. Every company field's validator runs before Pydantic's type check and raises `ValueError` itself. `test_company.py` sends each wrong type and checks the message. Phase 2.
5. **The move in Phase 1 breaks an import.** `fields.py` and `lib/server-errors.ts` take code out of `crm/`. Phase 1 does nothing else, and `crm/schemas.py` imports the moved names back, so the existing tests prove nothing changed before any new code arrives. Phase 1.
6. **A refetch wipes what someone's typing.** TanStack Query refetches when the window regains focus. Filling the form from `defaultValues` once would miss a teammate's change, and resetting on every reply would throw away typing. The form takes `values` from the query with `keepDirtyValues`, so untouched fields follow the server and touched ones stay. `CompanySettings.test.tsx` changes a field, delivers a new reply, and checks both halves. Phase 3.
7. **A save that changes nothing still records a change.** The form sends only dirty fields, but a field typed and typed back, or "8.875 " with a trailing space, still counts as dirty. The backend compares tidied values with what's stored and writes `updated_by` only if one differs. The rule that a save which alters nothing isn't a change now lives in `crm/who.py` and in `company.py`, as one line each. It's a single comparison, which isn't worth moving `who.py` out of `crm/` for. Phase 2.
8. **The row goes missing.** The check constraint keeps the table to one row, but a `delete` typed in Supabase's SQL editor could remove it, and then `GET /settings` would have nothing to send. `company.py` answers that with a 500 and a plain message rather than inventing settings. STATUS.md's clearing steps never touch the table. This isn't worth more code, since nothing in the app deletes the row. Phase 2.
9. **End-to-end tests leak settings into each other.** Each Playwright worker keeps one database for all its tests. A test that saves settings leaves them changed for the next test in that worker, which might expect B11's. Every test in `settings.spec.ts` that saves puts the sample data back afterwards with `resetToSampleData()`. Phase 4.
10. **Existing menu tests depend on the menu's items.** The keyboard test in `menu.spec.ts` presses the arrow keys a set number of times to reach Sign out, and the menu test lists what the menu holds. Both change with the new item, and Phase 4 updates them rather than loosening them. Phase 4.
11. **Two things are called settings.** `backend/accountable/settings.py` and `backend/tests/test_settings.py` are about which copy runs (C8). The new code uses `company` in every file name and `CompanySettings` in type names, and only the address and the route say `settings`. Phases 2 and 3.
12. **Unit tests slow down.** Migration upgrade tests build a database at 0003 first, which is the slowest kind of test here. Keep each case to one upgrade, and the rule cases as one parametrized test per case, which are fast. `npm test`'s summary names any unit test of a second or more. Phases 2 and 3.

## Proof

`npm run check` runs everything below and fails if anything fails.

The intent's success criteria:

1. `npm run check` passes, at the end of Phase 4.
2. The settings can be changed and saved, and everyone who signs in sees the same ones: `e2e/settings.spec.ts`, "saved settings are what every teammate sees".
3. Values out of range are refused with a clear message, through the page or the API: `test_company.py`'s rule cases, `settings.test.ts`, and the two refusal tests in `e2e/settings.spec.ts`.
4. The page shows who last changed the settings and when: `e2e/settings.spec.ts`, the first two tests, and `CompanySettings.test.tsx`.

### Unit tests: backend (pytest)

| File | What it proves | Requirements |
|---|---|---|
| `test_company.py`, rules | Every case in `shared/company-settings-cases.json` through `PATCH /settings`: a tax rate of 150, 100.001, 8.8751, -1, `1e2` and blank refused, and 0, 0.001, 8.875, " 8.5 " and 100 accepted; payment terms of 400, -1, 30.5 and "30" refused, and 0, 30 and 365 accepted; prefixes of 11 characters, with a space, with an underscore, with an accented letter, and blank, refused, and QT-, INV-, inv-2026 accepted; a blank company name refused and an email that doesn't look like one refused. Each refusal is a 422 with B3's message beside the field. `null` for a required field and a wrong type each get B3's message, not "Check this field" | B3, B5 |
| `test_company.py`, tidying | Spaces at the ends go from every field, and blank lines from the ends of the address, with the line breaks inside it kept. A blank optional field is stored as null. A prefix keeps its case. The tax rate is stored as thousandths and sent back as the shortest string: 8.875, 8.5, 20, 0 | B4 |
| `test_company.py`, who and when | A save that alters a field records the person from the token and the time. A save of the same values, or of values that only differ before tidying, leaves both alone. A body naming someone else as `updated_by` changes nothing. `GET /settings` names nobody on settings nobody has changed | B7 |
| `test_company.py`, only what's sent | A `PATCH` of one field leaves the others as they were, so two saves of different fields both stick | B8 |
| `test_company.py`, one set for everyone | Settings saved as one teammate are what another teammate's `GET /settings` returns | B1 |
| `test_migrations.py` | Upgrading a database made at 0003 keeps every row and adds one `company_settings` row with B12's values and nobody recorded. A new database's tables match `company.py`, including the check constraint. The offline Postgres SQL turns on row-level security for `company_settings` | B12, Security |
| `test_sample_data.py` | The sample settings are B11's, last changed by a made-up teammate before the day of seeding | B11, M8 |
| `test_cli.py` | After a change, seed puts B11's settings back and empty leaves the changed ones. Seed's question mentions the settings | B13, C4 |
| `test_every_route.py` | The two new routes are found, so they get every existing check: no token, bad tokens, bodies a website could send unasked, bodies that aren't records, and text a database can't store in each field | Security, U7 |

### Unit tests: frontend (Vitest)

| File | What it proves | Requirements |
|---|---|---|
| `company/settings.test.ts` | The Zod schema passes and refuses each case in the shared file with the same message as the backend. The `PATCH` body holds only the changed fields, with the tax rate as the string typed. A reply turns into form values with blank optional fields as empty text | B3, B4, B8 |
| `company/CompanySettings.test.tsx` | The fields in their three groups, filled from the API. Each B3 message shows beside its field, and nothing is sent. A save sends only the changed fields once however fast it's clicked, shows "Settings saved." and the reply's values. A 422 from the API puts its messages beside their fields. A failed save keeps what was typed and says so. A new reply arriving while a field has unsaved changes keeps that field and updates the others and the B7 line. A failed read shows Try again and no form. "Last changed by Dana Whitfield on Nov 20, 2026" and "Nobody has changed these yet." each show when they should. Enter in a one-line field saves, and Enter in the address adds a line | B3, B5 to B10 |
| `components/UserMenu.test.tsx` | Company settings is in the menu above Sign out, with or without a name read, and choosing it goes to `/settings` and closes the menu | N7, B2 |
| `lib/server-errors.test.ts` | Moved, unchanged, still passing | |
| `layout.test.ts` | `company/` never imports `crm/` | Layout rules |

The existing tests must still pass after the Phase 1 moves.

### End-to-end tests (Playwright Test)

All new tests are in `e2e/settings.spec.ts`. They use the existing fixtures, so each one also fails on a console error it didn't name and on any request outside the computer. Tests that save put the sample data back afterwards.

| Test | What it proves | Requirements |
|---|---|---|
| The menu opens the Company settings page with the sample company | Company settings in the menu goes to `/settings`, no section shows as current, and the page shows B11's values and a "Last changed by" line naming a made-up teammate. A reload stays on the page | B2, B7, B11, M8, N2 |
| Saved settings are what every teammate sees | Alex changes the name, address over two lines, tax rate to 8.875 and payment terms to 45, and saves. "Settings saved." shows, the line says "Last changed by Alex Rivera" with today's date, and a reload shows the same values with the line breaks kept. Dana, signed in on a new page, sees the same values and the same line | B1, B4, B6, B7 |
| The page refuses values out of range | A tax rate of 150, payment terms of 400, a prefix with a space and a blank company name each show their message beside the field, no `PATCH` goes out, and the saved settings are unchanged after a reload | B3, B5 |
| The API refuses values out of range | `PATCH /api/settings` with a tax rate of "150" and payment terms of 400 gets a 422 with both messages, and `GET /api/settings` still shows the old values | B5 |
| A save with nothing changed leaves who and when alone | Dana saves, then Alex opens the page and presses Save settings without changing anything. The line still names Dana | B7 |
| Typing survives a teammate's save | Alex types a new phone number without saving. Dana changes the email through the API. When Alex's window is used again, the email shows Dana's value, the phone keeps what Alex typed, and the line names Dana | B8, B9 |
| A failed read shows Try again and no form | With `GET /api/settings` failing, the page shows the failed-read panel and no fields. Try again, once it answers, shows the form | B10, N6 |
| The page works by keyboard | The menu reaches Company settings by arrow keys and Enter. Tab reaches every field and Save settings in order, each with the focus ring. Enter in the tax rate field saves | Q3 |

Changes to existing end-to-end tests:

- `menu.spec.ts`: the menu lists Company settings above Sign out, the keyboard test reaches Sign out one press later, the menu works on `/settings`, and the contrast sweep covers `/settings` in both modes (L1, L5, N7).
- `quality.spec.ts`: `/settings` has no console errors, fits at 1280px, and every control is reached by Tab with a focus ring (N3, Q2, Q3).
- `data.spec.ts`: after `npm run empty`, `/settings` still shows the settings (B13, C5).

### By hand

- **Phase 2:** `GET /api/settings` on a new temporary database returns B11's values, and on a temporary copy of a database made at 0003 returns B12's with nobody recorded.
- **Phase 3:** the page in Chrome at 1440 by 900 and 1280 by 720, in light and dark mode, against the spec's screen and the brand skill.
- **The shared app** is checked by the project owner as `testing.md` sets out: `npm start` against an empty Supabase project, then saving the settings as one person and seeing them as another. The team's own database gets B12's settings on the deploy, and the owner checks that the page shows them with "Nobody has changed these yet."
