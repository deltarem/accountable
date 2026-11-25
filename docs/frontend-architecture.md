# Frontend architecture

How the React app in `frontend/` is put together: its layers, how data moves through it, and the decisions behind the less obvious parts. The requirements live in `docs/spec.md` and its area files in `docs/specs/`, and IDs such as `ARC-10` point there. This document describes the code as built.

## At a glance

- A single-page React 19 app, served by Vite on port 5173 in development, and built into `frontend/dist/` for FastAPI to serve (`npm run build`, `ARC-18`).
- For data it only ever calls `/api/...`. Vite forwards those calls to FastAPI (`BACKEND_PORT`, default 8000), so the browser talks to one address and there's no CORS setup (`ARC-01`). Its only other calls are to Supabase Auth, to sign in and renew the session; in local mode there are none.
- Signed out, every address shows the sign-in screen. Every API call carries the session's token.
- Every business rule lives on the server. The frontend fetches, formats, validates as you type, and shows.

| Concern | Library | Where |
|---|---|---|
| Routing | React Router 7 | `routes.tsx` |
| Server data | TanStack Query 5 | `api/hooks.ts` |
| Tables | TanStack Table 8 | `components/table/DataTable.tsx` |
| Drag and drop | dnd-kit (core 6, sortable 10) | `components/board/` |
| Charts | Recharts 3 | `components/dashboard/` |
| Dialogs, menus, popovers, tooltips, toasts | Radix UI | `FormDialog`, `ConfirmDeleteDialog`, `Timeline`, `RecordSelect`, `RailLink`, `AccountMenu`, `Toaster` |
| Searchable select, the top bar's search | cmdk | `components/RecordSelect.tsx`, `components/topbar/GlobalSearch.tsx` |
| Signing in | `@supabase/supabase-js`, for auth only | `auth/supabase.ts` |
| Forms | React Hook Form 7 with zod 4 | `components/forms/`, `lib/schemas.ts` |
| Icons | lucide-react | throughout |
| Fonts | `@fontsource` (Instrument Sans, Instrument Serif, JetBrains Mono) | `main.tsx` |
| Styling | CSS Modules and CSS variables | `styles/tokens.css`, `*.module.css` |

## Layers

```mermaid
flowchart TD
    subgraph Browser
        SE[auth/session.tsx<br/>signed in or the sign-in screen] --> R
        R[routes.tsx<br/>seven addresses] --> S[AppShell<br/>icon rail, top bar, FormsProvider]
        S --> P[pages/<br/>one per address]
        P --> C[components/<br/>table, board, dashboard, record, forms]
        P --> H[api/hooks.ts<br/>queries and mutations]
        C --> H
        C --> L[lib/<br/>format, money, stages, schemas, board]
        P --> L
        H --> CL[api/client.ts<br/>fetch wrapper, adds the token]
        SE --> CL
    end
    CL -- "/api/..." --> V[Vite dev server :5173<br/>proxy]
    V --> F[FastAPI :8000]
    SE -. "sign in, renew" .-> SB[Supabase Auth]
```

The rules for each layer:

- **Pages** read data through hooks and lay out components. They decide where to go after a delete, and which form to open.
- **Components** are presentational where they can be. The ones that save something (forms, the follow-up checkbox) call mutation hooks themselves.
- **`lib/`** holds pure functions with no React in them. That's where the unit tests concentrate.
- **`api/`** is the only code that knows URLs. Nothing else calls `fetch`; Supabase's client makes its own calls, inside `auth/supabase.ts`.
- **`auth/`** holds the session. Pages and components read it through `useSession()`.

## Folder layout

```
frontend/src/
  main.tsx              fonts, follows the device for System, mounts <App/> (index.html sets
                        the theme and loads the global styles)
  App.tsx               providers: query client, tooltips, toasts, session; the sign-in gate
  routes.tsx            the seven addresses under AppShell
  auth/
    config.ts           the Supabase address, publishable key and local flag, from the build
    session.tsx         SessionProvider and useSession(): status, user, signIn, signOut
    service.ts          what a way of signing in provides, and its two error messages
    local.ts            the built-in test user, through POST /api/local/sign-in (local mode)
    supabase.ts         Supabase Auth, email and password (loaded only outside local mode)
  api/
    client.ts           fetch wrapper; adds the token, reports a 401; ApiError with per-field errors
    hooks.ts            one hook per endpoint, query keys, invalidation, optimistic move
    auth.ts             GET /api/me and the local sign-in
    search.ts           useSearch: the top bar's search
    types.ts            response types, matching the backend's JSON
  lib/
    format.ts           dates, money, percentages, relative dates (DES-05)
    money.ts            parseMoney for form input (DEC-04)
    stages.ts           stage and status tables, colours, isLate, totals (RULE-06, RULE-07)
    schemas.ts          zod payload schemas, form value types, form resolvers (ARC-11)
    board.ts            board state as stage -> ordered ids; applyMove
    deleteText.ts       the delete dialog's wording (UI-DEL-01)
    today.ts            today and now from the server (DEC-12)
    theme.ts            Light, Dark and System: read, choose, follow the device
    who.ts              "Added by ... · Last changed by ...", and "Sample data"
    search.ts           the matching part of a result's name, for the highlight
  components/
    AppShell, IconRail, RailLink, PageHeader, Panel, Button, Badges,
    EmptyState, Skeleton, LoadError, Toaster, FormDialog,
    ConfirmDeleteDialog, fields, RecordSelect, SuggestField
    table/              DataTable, SearchBox, SortableHeader, RowActions, StatusFilter
    forms/              FormsProvider, useSubmit, Organization/Contact/Deal/ActivityForm
    record/             RecordParts (header, facts, linked lists, columns),
                        Timeline (+ entries), FollowUpCheckbox
    board/              Board, StageColumn, ColumnHeader, DealCard, BoardTotals, keyboard
    dashboard/          HeadlinePanel, RevenueChart, FunnelChart, PipelineByStage,
                        WonLostChart, FollowUpList, ActivityFeed
    topbar/             TopBar, GlobalSearch, AccountMenu
  pages/                Dashboard, Pipeline, Deals, Contacts, Organizations,
                        Deal, Contact, Organization, NotFound, SignIn, recordShared
  styles/               tokens.css, global.css
  test/                 setup.ts (jsdom shims), utils.tsx (providers, mock fetch),
                        session.tsx (a signed-in session for tests)
```

## Providers and routing

The providers wrap the app in this order, outermost first:

```mermaid
flowchart LR
    Q[QueryClientProvider] --> T[Tooltip.Provider] --> TO[Toaster<br/>toast context] --> SP[SessionProvider]
    SP --> G{signed in?}
    G -- no --> SI[SignInPage]
    G -- yes --> RP[RouterProvider]
    RP --> AS[AppShell<br/>rail, top bar] --> FP[FormsProvider<br/>form + delete dialogs] --> O[Outlet: the page]
```

- `FormsProvider` sits inside the router, so the forms can use router hooks. It sits inside `Toaster`, so saves can confirm with a message.
- The query client retries a failed read once. Data counts as fresh for 5 seconds, and queries load again when the browser tab comes back into focus, so other people's changes show up without a refresh (`DEC-20`).

### Signing in

- `SessionProvider` picks the way of signing in from the build (`auth/config.ts`, filled in by `vite.config.ts` from the root `.env` or the environment): the built-in test user in local mode, Supabase otherwise. Supabase's client is imported only outside local mode, so local mode never loads it.
- While it checks for a kept session the app draws nothing; signed out it shows `SignInPage` at whatever address was asked for, without touching the router. Signing in mounts the router, which still holds that address, so the page that was asked for opens (`UI-AUTH-02`).
- `connectSession` gives `api/client.ts` the token getter and a callback for a 401. A 401, or a Supabase session that can't be renewed, ends the session: the sign-in screen says "Your session has ended. Sign in again." Signing out, or a session ending, clears every query (`ARC-10`). Signing out also returns the router to `/`.
- `App` takes an optional router, so tests can start at an address with a memory router.

| Address | Page | Main components |
|---|---|---|
| `/` | `DashboardPage` | `HeadlinePanel` (`RevenueChart`), `FunnelChart`, `PipelineByStage`, `WonLostChart`, `FollowUpList`, `ActivityFeed` |
| `/pipeline` | `PipelinePage` | `BoardTotals`, `Board` > `StageColumn` > `ColumnHeader`, `DealCard` |
| `/deals`, `/contacts`, `/organizations` | `DealsPage`, `ContactsPage`, `OrganizationsPage` | `DataTable`, `RowActions`, `StatusFilter` (contacts) |
| `/deals/:id`, `/contacts/:id`, `/organizations/:id` | `DealPage`, `ContactPage`, `OrganizationPage` | `RecordHeader`, `FactList`, `LinkedList`, `Timeline`, `LogActivityForm` |
| anything else | `NotFoundPage` | `EmptyState` |

Every page sits under the top bar (`components/topbar/TopBar.tsx`, `UI-LAY-05`): the search (`GlobalSearch`) on the left, the initials and their menu (`AccountMenu`) on the right.

The rail marks the current page with `useMatch` rather than `NavLink`'s `className` function. Radix's `Slot`, used by the tooltip trigger, can't merge a function `className`, and with it the rail lost its styles.

## Data layer

### Reads

Every read is a TanStack Query hook in `api/hooks.ts`, keyed as below. Lists come whole: search, sorting and filtering run in the browser (`ARC-09`).

| Hook | Key | Endpoint |
|---|---|---|
| `useToday` | `['today']` | `GET /api/today` (refetched on window focus) |
| `useOrganizations`, `useOrganization(id)` | `['organizations']`, `['organization', id]` | `GET /api/organizations[/id]` |
| `useContacts`, `useContact(id)` | `['contacts']`, `['contact', id]` | `GET /api/contacts[/id]` |
| `useDeals`, `useDeal(id)` | `['deals']`, `['deal', id]` | `GET /api/deals[/id]` |
| `useDashboard` | `['dashboard']` | `GET /api/dashboard`, refetched every time the dashboard opens (`UI-DASH-08`) |
| `useIndustries` | `['industries']` | `GET /api/industries` |

A record page's detail response already carries its linked records and its timeline, so each page makes one request.

### Saves and invalidation

Each save is a mutation. On success it invalidates every key that the kind of record touches (`ARC-10`). Only queries currently on screen refetch; the rest refetch when next shown.

| A save of | Invalidates |
|---|---|
| an organization | organizations, organization, contacts, contact, deals, deal, dashboard, industries |
| a contact | contacts, contact, organizations, organization, deals, deal, dashboard |
| a deal (form or board) | deals, deal, organizations, organization, contacts, contact, dashboard |
| an activity, or a follow-up ticked done | deal, contact, organization, dashboard |

When a record is deleted, its own detail query is removed before invalidating, so an open record page doesn't refetch into a 404.

### Errors

`api/client.ts` turns every failure into an `ApiError`:

- **Network failure** (status 0): "Couldn't reach the server. Check that Accountable is running."
- **401**: the session ends (see Signing in).
- **422**: `fieldErrors`, one message per field. The forms put them on their fields.
- **Anything else**: the server's `detail` text.

What the screens do with these (`UI-ERR-01`):
- A list that fails to load shows `LoadError` with a "Try again" button, instead of a blank page.
- A save that fails shows "Couldn't save the deal. Try again." at the bottom right, and the form stays open with what was typed.

### Today comes from the server

The browser's clock is never used (`DEC-12`). Late deals, relative follow-up dates, the activity form's default "now", and the close date filled in when a deal is won all read `useTodayValue()`. That way the end-to-end tests can fix the date on the server with `ACCOUNTABLE_TODAY`.

## Forms

```mermaid
sequenceDiagram
    participant U as User
    participant F as Form (React Hook Form)
    participant R as payloadResolver
    participant Z as zod payload schema
    participant M as mutation (api/hooks)
    participant S as server (Pydantic)
    U->>F: types, presses Enter
    F->>R: typed values (money as "12.500,50")
    R->>R: toPayload: parse money to cents, blanks to null, add https://
    R->>Z: safeParse(payload)
    Z-->>F: errors by field, or the payload
    F->>M: payload
    M->>S: POST or PUT
    S-->>M: 201/200, or 422 with errors by field
    M-->>F: setError on each field (focus the first), or close and toast "Deal saved"
```

- **One frame for every form.** `FormsProvider` owns a single `FormDialog` and a single `ConfirmDeleteDialog`. Any screen opens them through `useForms()`:
  - `openForm({ kind: 'deal', record?, defaults? })`
  - `confirmDelete({ kind: 'deals', id, onDeleted? })`

  Pipeline columns, table rows, record pages and the organization page's "New" buttons all share the same forms that way. The form is keyed by how many times it has been opened, so its default values reset each time.
- **Form fields share the payload's names** (`value_cents`, `organization_id`, ...), so an error from zod or from the server lands on the right field with no mapping. Money and probability are text while being typed, and become numbers in `toPayload`.
- **One set of rules, checked twice.** The zod payload schemas in `lib/schemas.ts` copy the Pydantic rules word for word. `shared/validation-cases.json` is run against both, by `schemas.test.ts` and by `test_validation_cases.py` (`ARC-11`). The form resolver is a small function of our own, `payloadResolver`, rather than `@hookform/resolvers`, because it has to convert money before validating.
- **`useSubmit`** handles the three outcomes in one place:
  - success: a message, then `onSaved`
  - a 422: an error on each field, with focus on the first
  - any other failure: an error message, with the form left open.
- **Keyboard** (`UI-FORM-01`):
  - The dialog focuses its first field when it opens.
  - Enter submits, as a native form does.
  - In a text area, Enter starts a new line.
  - In the searchable select and the industry suggestions, Enter picks the highlighted option.
  - Escape closes the open popover first, then the dialog.
- **Custom fields:**
  - `RecordSelect` is a Radix Popover with cmdk inside. It can group options, which is how the deal form lists the chosen organization's contacts first (`UI-FORM-03`).
  - `SuggestField` is a combobox with an inline list of industries already in use (`UI-FORM-06`).

## The pipeline board

The board is the most involved component. Its state while dragging is a plain map from stage to ordered deal ids (`lib/board.ts`). Positions are worked out by the server; the client only keeps the order.

```mermaid
sequenceDiagram
    participant U as User
    participant B as Board (dnd-kit)
    participant Q as Query cache ['deals']
    participant S as POST /api/deals/{id}/move
    U->>B: pick up a card (mouse, or Space)
    B->>B: dragColumns = columns from the deals list
    U->>B: move over another column
    B->>B: onDragOver: move the id between columns in dragColumns
    U->>B: drop (mouse up, or Space)
    B->>B: onDragEnd: final stage and index
    B->>Q: onMutate: applyMove (stage, probability, close date, positions)
    Note over Q,B: totals and the card update at once
    B->>S: { stage, index }
    alt the server refuses
        S-->>Q: error: put back the previous list
        Q-->>U: the card goes back, a message says why
    else ok
        S-->>Q: invalidate deals, deal, dashboard and the rest
    end
```

- **One `DndContext`, one `SortableContext` per column.** Each column is also a `useDroppable`, so an empty column still accepts a drop (`UI-PIPE-08`).
- **Sensors:**
  - Pointer, with a 5px activation distance, so a click still opens the deal.
  - Keyboard: Space picks up and drops, the arrows move, and Escape cancels. Enter is left free to open the deal.
- **Keyboard movement** uses `components/board/keyboard.ts` rather than dnd-kit's default. The default compares rectangles, and the dragged card's 2-degree tilt made cards in its own column look "to the right". The board's version moves left and right between neighbouring columns, and up and down within the column.
- **The look while dragging** (`DES-04`):
  - The drag overlay is a white card with a stronger shadow and the tilt.
  - The card's place in the column becomes a gap tinted with the column's stage colour, with a 2px ring.
- **Totals** come from `lib/stages.ts` `totals()`. It adds up open deals only and rounds half up once, at the end. `BoardTotals` and each `ColumnHeader` work their figures out from the same list, so they move together (`UI-PIPE-01`, `UI-PIPE-03`).
- **After a drop**, the board keeps its dropped order until the deals list changes (the optimistic update, or the rollback). Without that, the card would flick back for a frame.

## The dashboard

`DashboardPage` makes one request, `GET /api/dashboard`. The server works out every figure; the page only lays them out and formats them.

| Panel | Built with | Notes |
|---|---|---|
| Headline (Midnight) | HTML and `RevenueChart` (Recharts `LineChart`) | round axis ticks from `niceTicks`; the current month's dot is larger and labelled; a white tooltip with the full figure |
| Sales funnel | HTML columns | heights relative to New; the stage name and value under each column |
| Pipeline by stage | HTML buttons | solid stage colours; each row opens `/pipeline` |
| Won and lost | Recharts `BarChart`, `stackOffset="sign"` | won above the line, lost below; a hidden table gives screen readers the numbers |
| Follow-ups | `FollowUpList` | Overdue, Today, Next 7 days, as the server grouped them; ticking a box marks the follow-up done |
| Recent activity | `ActivityFeed` | shares `entryText` and `entryIcon` with the record timelines |

While the request is out, every panel shows grey placeholders in its own place, so nothing jumps (`UI-EMPTY-05`). With no data, every panel shows its own empty line (`UI-EMPTY-02`, `UI-EMPTY-04`).

## Tables

`DataTable` is one generic component used by all three list pages:

- **Search:** TanStack's global filter, over the text columns only. Columns marked `mono` (money, counts) are left out.
- **Sorting:** names A to Z by default. A heading click sorts ascending, then descending, with `aria-sort` set.
- **Extra filter:** an optional `filterRows`, which the contacts page uses for the status buttons.
- **Footer and states:** the "12 of 25 contacts" count, placeholder rows while loading, an empty state, and a "no matches" state with Clear search.
- **Rows:** each row can be focused with Tab and opens on Enter or click. A click on a link or button inside the row isn't treated as opening the row.

The rows handed to TanStack Table are memoized, and its auto-reset is turned off. A new array on every render made it reset its state on every render, and the page froze as soon as a dialog opened.

## Styling

- `styles/tokens.css` defines every colour, font, radius, spacing step and shadow as a CSS variable, named by role (`--page`, `--muted`, `--raspberry-text`...) (`ARC-15`, `DES-01`). No colour lives anywhere else: `styles/tokens.test.ts` fails on a hex, `rgb()` or `rgba()` value in any other file under `src/`. Code that hands a colour to a library or an inline style passes `var(--token)`, as `lib/stages.ts`, the timeline icons and the Recharts props do.
- **Light and dark mode.** Light values are on `:root`. Dark mode redefines the same tokens under `:root[data-theme='dark']`, with `color-scheme: dark`. Nothing in React knows the mode:
  - `index.html` has a small inline script that sets `data-theme="dark"` on `<html>` from localStorage (`accountable-theme`: `light`, `dark` or `system`) before anything draws, the sign-in screen included. System follows `prefers-color-scheme`. It also loads `tokens.css` and `global.css` itself, so the colours apply while the app's code is still loading.
  - `lib/theme.ts` reads and sets the choice, and `watchSystemTheme()`, started once in `main.tsx`, switches the mode when the device changes while System is chosen. The choice is in the menu under your initials (`components/topbar/AccountMenu.tsx`, `UI-THEME-01`).
  - The attribute is on `<html>`, so Radix portals (dialogs, menus, tooltips, toasts) follow the mode too.
- **Tokens by role, not by colour.** A colour that plays two parts gets two tokens, because the parts go different ways in dark mode:
  - `--ink` is body text, while `--on-bright` is the Midnight text on Sea Green, Marigold, Coral and grey fills.
  - `--dark-panel` is the rail and the two headline panels, which stay Midnight. `--strong` and `--on-strong` are the other Midnight fills (main action buttons, initials, chosen filters, tooltips on cards, messages), which turn Sea Mist.
  - `--raised` is dialogs, menus and pop-up lists, and `--highlight` is the chosen item in them.
- Each component has its own CSS Module. `styles/global.css` holds only the reset, the focus ring and a few utility classes (`mono`, `visually-hidden`, `muted-text`, `late-text`, `pre-line`).
- Inline styles are used only for values that come from data: a stage's colour, a funnel column's height, a skeleton's size.
- **Breakpoints:**
  - Below 1360px, pipeline column headers move the count beside the expected revenue.
  - Below 1320px, the main area's padding and the board's gaps shrink, so all six columns fit at 1280px.
  - Below 1280px, the headline panel stacks and the dashboard rows become two columns.
  - Below 1000px, the dashboard rows become one column.
- **Brand rules kept:** no gradients, no lines on one edge of a panel, 20px panels, 14px cards and rows, 12px controls, and a 2px Sea Green focus ring with a 2px gap (`DES-04`).

## Formatting

All formatting lives in `lib/format.ts`, with its own unit tests (`DES-05`):

- Dates arrive as ISO text and are split by hand, so the browser's time zone can never shift a day.
- Money is integer cents everywhere and is only turned into text for display:
  - `formatMoney`: `$12.500,00`
  - `formatMoneyWhole`: `$412.500`
  - `formatMoneyShort`: `$86k`, `$1,2M`

`lib/money.ts` `parseMoney` reads what people type. It accepts `12500`, `12.500`, `12.500,50` and `$12.500,00`. It turns down anything unclear, such as `12.5`, with a message rather than guessing.

## Accessibility

- **Names for icon-only controls.** Every icon button has an accessible name: the rail links, row actions ("Edit Acme Ltd"), the timeline menus, the contact initials on cards, the account menu ("Account menu for Priya Shah") and the search's clear button.
- **The search** is cmdk's combobox: the arrows move through the results across the groups, and `aria-activedescendant` tells screen readers which one is highlighted.
- **Dialogs** use Radix. On the delete dialog, Cancel has focus.
- **Live messages.** Toasts are Radix live regions, and the table footer is `aria-live`.
- **Board.** dnd-kit's screen reader instructions and announcements are written in the app's own words.
- **Charts.** Every coloured mark has a text label beside it. The won and lost chart also has a hidden data table.

## Testing

| Level | Where | What |
|---|---|---|
| Unit (Vitest, jsdom) | next to the code, `*.test.ts(x)` | `lib/` (formats, money, stages, schemas with the shared cases, who, search, theme), `DataTable`, `DealForm`, `ConfirmDeleteDialog`, `Board` totals, `DashboardPage` placeholders, the session and the sign-in screen, the search dropdown, the account menu, and the tokens (contrast in both modes, light values unchanged, no colour outside `tokens.css`) |
| End to end (Playwright, Chrome) | `e2e/` | every screen against a real backend on ports 8100 and 5273, in local mode, signed in as the built-in test user (`e2e/fixtures.ts`), with the clock fixed to 23 Nov 2026, 14:00; signing in and out, search, who added what; light mode compared pixel for pixel against reference screenshots (`light-mode.spec.ts`); Light, Dark and System (`theme.spec.ts`); fails on any console error or warning |

`test/setup.ts` points `localStorage` at jsdom's, because Node 25 and later define their own, which is undefined in tests and hides jsdom's, and clears it after each test. `test/utils.tsx` gives component tests the real providers and a fake `fetch` keyed by `"METHOD /api/path"`; `test/session.tsx` adds a signed-in session. Vitest builds in local mode with no Supabase settings, whatever `.env` holds (`ARC-14`). `npm test` runs both levels along with the backend tests (see `AGENTS.md`).

## Adding to it

- **A new endpoint:**
  1. Add its response type in `api/types.ts`.
  2. Add a hook in `api/hooks.ts` with a key.
  3. If it saves, add its scope to the invalidation table there.
- **A new form field:**
  1. Add it to the zod payload schema and the form's value type in `lib/schemas.ts`.
  2. Add its good and bad cases to `shared/validation-cases.json`.
  3. Add the field to the form with a `Field` wrapper.
- **A new screen:**
  1. Add a page in `pages/`.
  2. Add a route in `routes.tsx`, and a `RailLink` in `IconRail` if it's a section.
  3. Build it from `PageHeader` and `Panel`.
  4. Give each panel a placeholder, an empty state and a `LoadError`.
