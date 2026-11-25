# Shared screens

Part of the [Accountable spec](../spec.md). The look, the layout and the parts every screen shares: the rail and top bar, tables, record pages, forms, deleting, empty and loading states, errors, and their wireframes. Each area's own columns, page and form are in its area file. The sign-in screen and the menu under your initials are in `docs/specs/accounts.md`, and the search in the top bar is in `docs/specs/search.md`.

Colours named in the screen sections, in this file and in the area files, are light mode's. In dark mode each one takes its dark value from Design in `docs/specs/design.md` (`DES-01`, `DES-02` and "Dark mode"); layout and behaviour stay the same.

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
  - The foot of the rail is empty. The theme choice is in the menu under your initials (`UI-MENU-01`).
- `UI-LAY-05` **Top bar:** a slim bar, 56px tall, across the top of the main area on every page, above the title row. It scrolls away with the page.
  - On the left, the search box (`UI-SRCH-01`).
  - On the right, the circle with your initials, which opens the menu (`UI-MENU-01`).
  - It sits straight on the page background, with no panel, no fill and no line under it, so it never reads as a border across the top of the page. The space below it separates it from the title row.
- `UI-LAY-02` **Main area:** the page background is `#F0F4F5`. Each page has a title row, under the top bar:
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

  Signed out, every address, an unknown one included, shows the sign-in screen instead (`UI-AUTH-02`). Signing in has no address of its own.

### Tables (Organizations, Contacts, Deals)

All three use TanStack Table in a white panel, with the same behaviour:

- `UI-TBL-01` **Search:** a search box above the table. It matches any text column, ignores case, and filters as you type.
- `UI-TBL-02` **Sorting:** clicking a heading sorts by that column, ascending then descending. An arrow shows the current sort. Names sort A to Z by default.
- `UI-TBL-03` **Opening a record:** clicking a row, or pressing Enter on it, opens the record's page. Links inside a row (a website, an email address) do their own thing instead.
- `UI-TBL-04` **Row actions:** each row ends with Edit and Delete icon buttons, which have text labels for screen readers ("Edit Acme Ltd").
- `UI-TBL-03` **Keyboard:** Tab reaches the search box, the headings, each row and the row buttons.
- `UI-TBL-05` **Records:** the panel's footer shows how many records are showing out of the total, for example "12 of 25 contacts".

### Record pages

`UI-REC-01` Each page starts with a "< Deals" (or Contacts, Organizations) link back to its list, then a header panel with the record's name, its key facts, and Edit and Delete buttons. The header ends with who added the record and who last changed it (`UI-WHO-01`). Below it are two columns: linked records on the left (about 40%) and the timeline on the right (about 60%). Below 1100px wide the two columns stack.

A record that doesn't exist, for example after it was deleted elsewhere, shows "That deal doesn't exist. It may have been deleted." with a way back to the list.

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
- `UI-FORM-05` **After saving:** the dialog closes, a short message confirms it ("Deal saved") at the bottom right, and the list or page shows the change.

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

A 401 is the exception: the session has ended, so the app shows the sign-in screen instead of a message (`AUTH-03`). An open form loses what was typed then. Renewing the token before it expires keeps this rare.

`UI-ERR-02` The browser's console stays free of errors and warnings during normal use.

## Screen structures

These wireframes show where everything sits on each screen. They show structure only: colours, type and spacing come from Design in `docs/specs/design.md`, and behaviour from the screen sections above and in the area files. Each one ends with the components it's built from, as named in `frontend/src/components/` and `frontend/src/pages/`. Figures are examples. The dashboard's and the pipeline's are in their own files.

### App shell

Every page sits inside this shell.

```
+------+-----------------------------------------------------------------+
| [A]  |  [Q Search organizations, contacts and deals ]          (PS)    |
|      |                                                                 |
| [#]  |  ACCOUNTABLE                                   [ Main action ]  |
|  #   |  Page title                                                     |
|  #   |                                                                 |
|  #   |  +-----------------------------------------------------------+  |
|  #   |  |  Panel (20px corners)                                     |  |
|      |  |                                                           |  |
|      |  +-----------------------------------------------------------+  |
|      |                                                                 |
|      |  +-----------------------------------------------------------+  |
|      |  |  Panel                                                    |  |
|      |  +-----------------------------------------------------------+  |
|      |                                            +-----------------+  |
|      |                                            | Message (toast) |  |
|      |                                            +-----------------+  |
+------+-----------------------------------------------------------------+
 Rail,    Main area: page background, 32px padding (24px below 1320px)
 72px,
 Midnight
```

- **Built from:** `AppShell`, `IconRail`, `RailLink` (icon button with tooltip), `TopBar`, `GlobalSearch` (the search box and its dropdown), `AccountMenu` (the initials and the menu, with the theme choice), `PageHeader` (eyebrow, title, action slot), `Panel`, `Toaster`, and `FormsProvider`, which hosts the form and delete dialogs for every page. `RequireSignIn` wraps the shell and shows `SignInPage` when signed out.
- **Notes:**
  - The rail stays fixed and the main area, top bar included, scrolls.
  - `[A]` is the brand mark, `#` is a Lucide icon, and `[#]` is the current page's button, filled Sea Green.
  - `[Q ...]` is the search box and `(PS)` the circle with your initials. The top bar has no line under it.

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
| Added by Priya Shah on 2 Mar 2026 · Last changed by Sam Lee on 20 Nov 2026|
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
|                             | |                                          |
|                             | | (o) Moved from Proposal to Negotiation   |
|                             | |     18 Nov 2026, 10:12 · Sam Lee         |
|                             | | (o) Call: agreed on a 2-year term    ... |
|                             | |     15 Nov 2026, 16:40 · Priya Shah      |
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
