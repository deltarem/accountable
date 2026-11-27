# Plan: products

This plan turns the products intent and the spec, already updated on this branch, into build work: which files change, in what order, what could go wrong and how we'll know it works. IDs such as G5 and K4 are the spec's requirements. The intent wins over the spec and the spec wins over this plan. If the build shows the spec is wrong, fix the spec in the same change and say so in `docs/STATUS.md`.

The change is small enough for one agent working in order, so the work isn't split into parts. The plan ends once the build passes `npm run check`. ui-check, the review and `docs/IMPROVE.md` come after it.

## Files that change

### New dependencies

None. lucide-react already has the `Package`, `Archive` and `ArchiveRestore` icons. Reading typed prices into cents is a few lines of string handling, and the time limit reads timings the test runners already write.

### What the backend and frontend agree on

- `GET /products` gives every product, active and archived: `[{id, name, description, unit_price_cents, active}]`.
- `GET /products/{id}`, and the replies to `POST` and `PATCH`, give one product with `created_at`, `created_by`, `updated_at` and `updated_by`, the same as the other records' single replies.
- `POST /products` takes `{name, description?, unit_price_cents}`. `PATCH /products/{id}` takes any of `name`, `description`, `unit_price_cents` and `active`. `unit_price_cents` is a whole number from 0 to 100,000,000, and `active` a true or false, both strict, so `49.5`, `"4950"` and `"true"` get a 422.
- A name clash gets a 422 with the G7 message on `name`, in the same shape as every other field error.
- `GET /search` gains `products: {count, results}`, with results `{id, name, unit_price_cents}`, active products only.

### Backend

| File | Change |
|---|---|
| `backend/accountable/crm/tables.py` | The `products` table: `name`, `name_key` (unique), `description`, `unit_price_cents` with a check constraint for 0 to 100,000,000, `active` (true by default), the times and who. `MAX_PRICE_CENTS` and `name_key(name)`, the trimmed name with `casefold()`, sit beside it, because the router, the sample data and the stress data all set the key |
| `backend/accountable/migrations/versions/0004_products.py` | New. Creates the table with its constraints and indexes, keeping ids with `sqlite_autoincrement` like every other table, and on Postgres turns on row-level security for it. Adds no rows (M8) |
| `backend/accountable/crm/schemas.py` | `Cents`, a strict whole number from 0 to `MAX_PRICE_CENTS`. `ProductCreate`, `ProductUpdate` with `active` as a `StrictBool`, `Product`, `ProductRow` and `ProductDetail`. Field messages for `unit_price_cents` and `active` |
| `backend/accountable/crm/routers/products.py` | New. List, add, get and edit. Add and edit look for another product with the same `name_key` and raise `FieldError` on `name` with the G7 message for an active or an archived product. A product changing only its own name's case passes. An `IntegrityError` on `name_key`, which only a write from outside the app could cause given the write lock, gets the same 422. Edits go through `who.alterations`, so archiving and restoring count as changes (U10) and a save that alters nothing doesn't. No delete route |
| `backend/accountable/main.py` | The products router in `_signed_in_routes` |
| `backend/accountable/crm/routers/search.py` | A fourth select in the union, active products only, with a typed blank `price` column on the other three kinds and a typed blank `detail` on products, because Postgres won't guess a blank's type. `ProductResult` and the `products` group. The module's docstring names four kinds |
| `backend/accountable/crm/sample_data.py` | `PRODUCTS`, the twelve below, and adding them in `fill`, each put down to a teammate, some changed by another and both archived ones archived by a different teammate (M3, M7, U14) |
| `backend/accountable/cli.py` | `products` in `_counts`, so the question names them, and in `_wipe` (C4) |
| `backend/tests/limits_data.py` | 200 products, for Q1 |

The sample products, in line with the sample deals, which sell software, rollouts, support and training to small businesses:

| Name | Unit price | State |
|---|---|---|
| Platform license, per user per year | $480.00 | Active |
| Group-wide license, per site per year | $9,600.00 | Active |
| Standard support plan, per year | $3,600.00 | Active |
| Priority support plan, per year | $7,200.00 | Active |
| On-site training day | $1,450.00 | Active |
| Online training session, half day | $487.50 | Active |
| Setup and data import | $2,500.00 | Active |
| Integration, per connected system | $4,250.00 | Active |
| Custom report | $649.50 | Active, with no description, so "None" shows |
| Tablet kit for taprooms and counters | $389.99 | Active |
| Basic support plan, per year | $2,400.00 | Archived, replaced by Standard |
| On-site training day, 2025 rate | $1,250.00 | Archived |

### Frontend

| File | Change |
|---|---|
| `frontend/src/lib/money.ts` | `cents(value)`, giving `$1,200.00` from 120000 with integer division and the remainder, and `readPrice(text)`, giving whole cents or which G5 message applies, by reading the digits. Its maximum comes from one constant |
| `frontend/src/components/DataTable.tsx` | Takes either `onDelete`, as now, or `rowAction`, a label, an icon and a handler for each row, in Delete's place. Takes an optional message for a filter with nothing in it and no search, so Products can say "No archived products." and "No active products." The three existing tables don't change |
| `frontend/src/components/FilterGroup.tsx` | New. The filter buttons with counts that Contacts draws inline today, moved out now that Products needs the same. Contacts uses it, and looks and behaves as before |
| `frontend/src/crm/pages/Contacts.tsx` | Uses `FilterGroup` |
| `frontend/src/crm/RecordLayout.tsx` | `RecordHeader` takes a second button that isn't Delete, for Archive and Restore. The other three record pages don't change |
| `frontend/src/crm/queries.ts` | `ProductRow`, `ProductDetail`, `useProducts`, `useProduct`, `useSaveProduct` and `useSetProductActive`, which invalidate everything after a write as the other saves do. The search reply's `products` group |
| `frontend/src/crm/forms/ProductForm.tsx` | New. Name, Unit price with `$` before the box, and Description in a textarea. The Zod schema uses `readPrice`. Server field errors through `showSaveError`. "Product saved." on a save |
| `frontend/src/crm/pages/Products.tsx` | New. The table (G2), the Active, Archived and All filter through `?show=archived` and `?show=all`, with no setting meaning Active (G3), the Archived chip, and Archive and Restore on each row with their messages (G8) |
| `frontend/src/crm/pages/Product.tsx` | New. The header, the Details panel with Unit price and Description, the R6 lines, Edit, and Archive or Restore (G10). A missing product shows N4's page |
| `frontend/src/components/Chip.tsx` | An `archived` tone: muted ink on the page color |
| `frontend/src/App.tsx` | `/products` and `/products/:id` |
| `frontend/src/components/Shell.tsx` | The sixth section, with lucide-react's `Package` icon. `SECTIONS` takes any icon, since this one isn't from the design's own set. Spacing changes if it doesn't fit at 1280px (Risk 3) |
| `frontend/src/crm/Search.tsx` | The Products group after Deals, the price as its detail in JetBrains Mono, "See all 12 products" opening `/products?q=`, the four-kind label and no-match message |

### Tests

New and changed tests are listed in [Proof](#proof). The files: `backend/tests/test_products.py` (new), `test_search.py`, `test_sample_data.py`, `test_cli.py`, `test_migrations.py`, `test_limits.py` and `conftest.py` only if a fixture needs products; `frontend/src/lib/money.test.ts`, `components/DataTable.test.tsx`, `components/Shell.test.tsx`, `crm/Search.test.tsx`, `crm/pages/Products.test.tsx` (new), `crm/pages/Product.test.tsx` (new), `crm/forms/forms.test.tsx`, `crm/pages/Contacts.test.tsx`, `test-utils.tsx` if `mockApi` needs product replies; `scripts/test-report.mjs` and `scripts/test-report.test.mjs`; `e2e/products.spec.ts` (new), `search.spec.ts`, `data.spec.ts`, `start.spec.ts`, `menu.spec.ts`, `quality.spec.ts` and `stress.spec.ts`.

### Docs

| File | Change |
|---|---|
| `docs/STATUS.md` | Progress after each step of [Order of work](#order-of-work), the tests that were over a second and what was done about each, and how to clear the sample products in Supabase's SQL editor (C11) |
| `docs/specs/*.md`, `docs/spec.md` | Anything the build shows is wrong, such as the top bar's spacing or the search box's width if Risk 3 changes them |
| `docs/changes/products/plan.md` | This plan, if the build changes it |

## Order of work

Each step ends with `npm run check:quick` passing. Steps 1, 5 and 6 end with `npm run check`.

1. **The time limit, first,** so every test written after it is held to it. Run `npm run check` and read the slow-test list, then run each listed test on its own to see its own time. Speed up every test over 300ms in a full run. Find why each is slow before changing it: STATUS.md already names a test that paid for loading the whole app and one that paid psycopg's first import. Then make `test-report.mjs` fail a layer with a unit test of a second or more, apart from under `CI`, with its tests. Run `npm run check` twice in a row and confirm it passes both times.
2. **Backend.** `tables.py` and migration `0004`, with `test_migrations.py`. Then `schemas.py`, the products router and `main.py`, with `test_products.py`. Then search, with `test_search.py`. Then sample data, `cli.py` and the stress data, with their tests.
3. **Frontend building blocks.** `money.ts` with its tests. Then `DataTable`, `FilterGroup` with Contacts moved onto it, `RecordHeader` and the chip, with the existing tests still passing and new ones for the new props.
4. **Frontend products.** `queries.ts`, the form, the two pages, the routes and the section in `Shell.tsx`. Then the search group. Unit tests for each as it lands.
5. **End to end.** `products.spec.ts`, then the changes to the existing specs. Run the local copy on a temporary database, `ACCOUNTABLE_DB=<scratchpad>/accountable.db npm run dev`, and look at the top bar at 1280px and 1440px in both modes. Fix the fit if needed (Risk 3), with the spec changed to match.
6. **Finish.** Bring `docs/STATUS.md` and the spec up to date with what was built. Run `npm run check`. Go through the intent's success criteria by hand on the temporary database, as set out under [By hand](#by-hand). Stop the servers and check their ports are free.

Done when `npm run check` passes and the by-hand checks find nothing.

## Risks

Most damaging first.

1. **The owner's data.** Migration `0004` only adds a table, so it can't change existing rows, but it runs on whatever database the app starts on and nothing takes it back. No agent starts the app on `data/accountable.db`: every by-hand run uses `ACCOUNTABLE_DB` in the scratchpad. On Supabase, the row-level security check refuses to start if `0004` forgets to turn it on for `products`, and the offline Postgres SQL test checks that it does. Steps 2 and 5.
2. **The time limit makes `npm run check` fail at random.** In a full check every unit layer runs at once, and STATUS.md records two tests at 1.0 and 1.1 seconds there that take 310 and 378ms on their own, so a full run is about three times slower. Another worktree's checks running alongside slow it further. A limit with no margin would fail a run that changed nothing. That's why step 1 aims for 300ms in a full run, not just under a second, and runs the check twice. Vitest's JSON `duration` may or may not count `beforeEach` and `afterEach`. Check the installed version, because a slow hook that isn't counted would slip past the limit. If the limit still fails on runs that changed nothing, stop and ask the owner rather than raise it. Step 1.
3. **Six sections don't fit the top bar at 1280px.** A rough sum of the bar's parts at today's spacing comes to about 1,320px. If the measure in step 5 agrees, fix it in this order, stopping when it fits: smaller gaps between the bar's groups and inside each section link, then a narrower search box, 240px to 200px. Each changes the spec (Shell, Search box and results), and the owner has the final say on how it looks. Never cut the labels or wrap the bar. `quality.spec.ts` checks the bar fits at 1280px. Step 5.
4. **A price is off by a cent.** `0.29 * 100` is `28.999999999999996` in JavaScript, and `Math.round` hides it only some of the time. `readPrice` never multiplies: it splits the text at the decimal point and reads the two parts as whole numbers. `cents` formats with integer division. Both are tested with `0.29`, `0.07`, `1.005` refused for its third decimal, `1,200.00` and the maximum. The API refuses anything that isn't a whole number, so a bug that sent `49.5` fails loudly. Steps 2 and 3.
5. **Unique names don't hold.** Three ways they could slip: the check compares the raw name rather than the trimmed, casefolded key; an edit that keeps its own name clashes with itself; or a row written with no `name_key`, such as by the sample data. The key is set in one place, `name_key()` in `tables.py`, and the column is `NOT NULL`, so a row without one fails at once. `test_products.py` covers each case, including the constraint refusing a second copy written straight to the table. Step 2.
6. **Search breaks on Postgres.** The union gains a column, and every blank needs its type cast, as the existing ones are, or Postgres refuses the query that SQLite accepts. Tests run only on SQLite, so check this in the offline SQL if possible and by hand on Supabase later. Search still takes one query (K8). Step 2.
7. **Generalizing `DataTable` and `RecordHeader` breaks the three existing tables and pages.** Both keep their current props, so existing callers don't change, and their existing tests must pass untouched. The new props get their own tests. Step 3.
8. **Existing tests are tied to five sections.** `start.spec.ts`, `menu.spec.ts`, `quality.spec.ts` and `Shell.test.tsx` list the sections or count Tab presses through them. Each needs Products added. Search tests that name the three groups, the label or the no-match message need the fourth. Steps 4 and 5.
9. **Q1 slips with 200 more rows to search.** Search adds a fourth select to the same query. The stress test runs it at the limits with products in. Step 5.

## Proof

`npm run check` runs everything below except the by-hand checks, and fails if anything fails. The existing tests must still pass, with only the changes listed in [Tests](#tests).

The intent's success criteria:

1. `npm run check` passes: the whole suite, in step 6.
2. A product can be added, edited, found with the search box, archived and restored: `test_products.py`, `Products.test.tsx`, `Product.test.tsx` and `products.spec.ts`.
3. Prices show in dollars and cents everywhere they appear: `money.test.ts` for the formatting, then the table, the page and the search results in `Products.test.tsx`, `Product.test.tsx`, `Search.test.tsx` and `products.spec.ts`.
4. Two products can't share a name, whatever the case, through the page or the API: `test_products.py` for the API and the database, `forms.test.tsx` and `products.spec.ts` for the page.
5. The sample data has products, and `npm run empty` clears them: `test_sample_data.py`, `test_cli.py` and `data.spec.ts`.
6. A unit test that takes more than a second fails `npm test`: `test-report.test.mjs`, and step 1's two clean runs.

### Unit tests: backend (pytest)

| File | What it proves | Requirements |
|---|---|---|
| `test_products.py` | Add, get, list with archived ones included, edit. A save that alters nothing leaves `updated_at` and `updated_by` alone. Archiving and restoring through `active`, each recorded as a change by whoever made it. A body naming someone changes nothing. Prices of 0 and 100,000,000 cents are kept, and -1, 100,000,001, `49.5`, `"4950"` and a missing price each get a 422 on `unit_price_cents`. `active: "true"` gets a 422. A blank or spaces-only name gets "Enter a name", and spaces at the ends are dropped. Name clashes: the same name, another case, "Straße" against "STRASSE", spaces at the ends, and an archived product's name, each with its G7 message. A product keeping its own name or changing only its case is fine. A second row with an existing `name_key`, written straight to the table, is refused by the database. `DELETE /products/{id}` gets a 405. A missing product gets a 404 | G4, G5, G7, G8, G9, U10 |
| `test_search.py` | Products are found by part of a name in any case, after the other three groups, with their price, counted and limited to 5 like the others. Archived products aren't found. Still one query | K1, K4, K5, K8, G11 |
| `test_sample_data.py` | Twelve products with unique names, prices from about $100 to $10,000, at least 3 with cents that aren't `.00`, exactly 2 archived, each put down to a teammate and some changed by another, including seeded on the 1st of a month | M3, M7, U14 |
| `test_cli.py` | `empty` removes every product and `seed` puts the twelve back. The question counts products | C4 |
| `test_migrations.py` | The migrations still build the same tables as `tables.py`, `products` included. A `0003` database with data upgrades to an empty `products` table, with every other row kept. Written out for Postgres, `0004` turns on row-level security for `products` | M8, Security, Data model |
| `test_every_route.py` | No change to the file. It takes routes from the app, so the products routes get the token and bad-input checks by themselves | U7, Security |
| `test_limits.py` | The stress data has 200 products | Q1 |

### Unit tests: frontend (Vitest)

| File | What it proves | Requirements |
|---|---|---|
| `lib/money.test.ts` | `cents`: 0, 29, 4950, 120000 and 100,000,000 as `$0.00`, `$0.29`, `$49.50`, `$1,200.00` and `$1,000,000.00`. `readPrice`: `49.50`, `49.5`, `49`, `$49`, `1200`, `1,200.00`, ` 49.50 `, `0.29` as 29 and `0.07` as 7. Blank, `1.005`, `-1`, `abc` and `1,000,000.01` each give their G5 message. The existing tests for whole dollars still pass | G5, G6 |
| `components/DataTable.test.tsx` | A table given `rowAction` shows that button in Delete's place, labeled for screen readers, and calls its handler. The filter message shows when a filter is empty and the search box isn't | G2, G3 |
| `crm/pages/Contacts.test.tsx` | No change to the file. The filter still works after moving to `FilterGroup` | T6 |
| `crm/pages/Products.test.tsx` | The columns, with prices in dollars and cents, right-aligned. Sorting by price goes by amount, so $389.99 comes before $1,250.00. Search finds a word in a description. The filter starts on Active with each count, Archived and All show the right rows, the choice goes in the address, and the Archived chip shows in All. "No archived products." and "No active products." Archive and Restore on a row send the right `PATCH`, show their messages, and put back nothing when they fail. A press twice in a row sends once. Clicking a row opens the product's page | G2, G3, G6, G8 |
| `crm/pages/Product.test.tsx` | The name, price and description, "None" with no description, the R6 lines, the Archived chip and Restore on an archived product, Archive on an active one, Edit opening the form, and N4's message for a missing product | G6, G8, G10, R6, N4 |
| `crm/forms/forms.test.tsx` | The product form: both required fields, each G5 message, the price sent as whole cents, a saved price shown as `49.50` when editing, a name clash from the server shown beside the name with the dialog still open, and a save sent once however fast it's pressed | G4, G5, G7, F10 |
| `crm/Search.test.tsx` | The four groups in order, the Products group with its price, "See all 12 products" and its address, the four-kind label and no-match message | K4, K5, K7, G11 |
| `components/Shell.test.tsx` | Six sections, in order, ending with Products | N1, G1 |
| `scripts/test-report.test.mjs` | A unit test of a second or more fails its layer, by name, with `CI` unset. With `CI` set, it's listed and the layer passes. A test just under a second passes. The existing slow-list tests still pass | Q5 |

### End-to-end tests (Playwright Test)

All run on the local copy, with the existing fixtures, so each one also fails on any console error it didn't expect and on any request that leaves the computer.

| File | Test | Requirements |
|---|---|---|
| `products.spec.ts` | Products in the top bar opens the table, with the sample products and their prices in dollars and cents | G1, G2, G6, M3 |
| | Add a product with a price of `49.5`, which shows as $49.50 in the table and on its page, with "Added by" and the signed-in name | G4, G5, G6, R6 |
| | Edit its name and price. The page shows the change and "Last changed by" | G4, U10 |
| | Add a second product with the first one's name in another case: the message shows beside the name, and the dialog stays open with what was typed | G7 |
| | Archive it from its row: the message names it, it leaves the Active view, it's under Archived with its chip, and the search box no longer finds it. Restore it from its page, and the search box finds it again | G3, G8, G10, G11 |
| | Adding a product with an archived product's name gives the archived message | G7 |
| | A product's address that doesn't exist shows "This product no longer exists" | N4 |
| `search.spec.ts` | A product found by part of its name in another case, with its price, opened by click and by keyboard. "See all" for products opens the table with the search | K1, K4 to K6, G11 |
| `data.spec.ts` | After `npm run empty`, Products invites the first product. After `npm run seed`, the twelve are back | C4, C5 |
| `start.spec.ts` | The top bar links to the six sections | N1 |
| `menu.spec.ts` | The menu is on Products too, and the Tab count through the sections includes it | L1, Q3 |
| `quality.spec.ts` | At 1280px, the whole top bar is on one line with nothing cut off. The Tab counts with the sixth section, and the products table's and page's controls reached by Tab with a focus ring | N3, Q3 |
| `stress.spec.ts` | At the Q1 limits, with 200 products, the Products table opens in under a second, its search keystroke updates within 100ms, and the top bar's search still answers within 300ms | Q1 |

### By hand

- **The success criteria in the app,** on a temporary database through `ACCOUNTABLE_DB`, never `data/accountable.db`: add, edit, find, archive and restore a product, two names that differ only by case, prices with and without cents, and `npm run empty` then `npm run seed` against the same temporary database.
- **The top bar** at 1280px and 1440px, in light mode and dark mode, with all six sections, the search box, the date and the menu on one line.
- **The Archived chip** on a hovered row, where the row takes the page color too. If it disappears, give it a backing that stands out from both the panel and the page, with the spec changed to match and its contrast checked.

## Changed during the build

- **Step 1** found far more slow tests than the two the Mac had shown: on the Windows laptop the build ran on, about 390 unit tests took a second or more with every layer at once. The project owner chose to keep the limit at a second, to run the backend and frontend unit tests one after the other, and to fix the tests over it, mainly through shared helpers and fewer rows where the count doesn't matter. Vitest also runs on a quarter of the threads outside CI. `docs/STATUS.md` has the causes and the numbers.
- **The Archived chip** is muted ink on the grid color, not the page color, because a hovered row takes the page color and the chip lost its shape there, which the plan's by-hand check was there to catch.
- **The top bar at 1280px** needed 27px more for the date. Smaller gaps between its groups and inside each section link gave 40px, so the search box keeps its width.
