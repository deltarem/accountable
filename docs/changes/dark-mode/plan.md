# Plan: dark mode

How the change in `intent.md` gets built and proven. `docs/spec.md` already describes the result: the toggle under Layout, the decisions "Dark surfaces" and "Where the light or dark choice is kept", the architecture decisions on styling and "Switching between light and dark", and the dark values under Design.

The work goes in a fixed order: lock light mode down first, then move every colour into tokens without changing how anything looks, then add the switch, then the dark values. Each phase ends with the light mode comparison passing, so a slip in light mode shows up in the phase that caused it.

## Files that change

### Root

| File | Change |
|---|---|
| `playwright.config.ts` | `ACCOUNTABLE_TODAY` becomes `2026-11-23T14:00:00`, so the clock's time is fixed as well as its date. Without it the sample data, the recent activity list and the "When" field differ with the time of day, and no screenshot comparison can be stable. |

### Frontend (`frontend/`)

| File | Change |
|---|---|
| `index.html` | A few lines of plain script in `<head>` that read `accountable-theme` from localStorage and set `data-theme="dark"` on `<html>` before the app loads. It also loads `tokens.css` and `global.css`, so the colours apply while the app's code is still loading. |
| `src/main.tsx` | No longer imports `tokens.css` and `global.css` (added during the build: imported from here, they only arrived with the app's code, so a held-back app showed an unstyled white page). |
| `src/test/setup.ts` | Points `localStorage` at jsdom's (added during the build: Node 26's own `localStorage` global is undefined in tests and hid jsdom's). |
| `src/components/Badges.test.tsx` | Checks token names instead of colour values (added during the build). |
| `src/styles/tokens.css` | Every colour the app uses, split by role (see Phase 2), and a `:root[data-theme='dark']` block that redefines them, with `color-scheme: dark`. |
| `src/styles/tokens.test.ts` (new) | The contrast of every listed text pair in both modes, and a scan that fails on any colour value outside `tokens.css`. |
| `src/lib/theme.ts` (new) | `readTheme`, `setTheme` (sets the attribute and saves the choice) and the storage key, shared with `index.html`. |
| `src/lib/theme.test.ts` (new) | Its unit tests, including the key matching the one in `index.html`. |
| `src/lib/stages.ts`, `stages.test.ts` | Stage and status colours become `var(--stage-…)` and `var(--status-…)` references instead of hex values. The tests check the token names. |
| `src/components/ThemeToggle.tsx`, `ThemeToggle.test.tsx` (new) | The toggle: moon or sun, its name and tooltip, and switching. |
| `src/components/IconRail.tsx`, `IconRail.module.css`, `IconRail.test.tsx` | The toggle at the foot of the rail. The rail and the mark use the fixed rail tokens. |
| `src/components/RailLink.module.css` | The button look shared with the toggle. Its tooltip uses the tooltip tokens. |
| `src/components/record/Timeline.tsx`, `Timeline.test.tsx` | Icon colours from tokens. The test checks token names instead of hex values. |
| `src/components/dashboard/RevenueChart.tsx`, `WonLostChart.tsx` | Chart colours passed to Recharts as `var(--token)`. |
| CSS Modules with colour values in them | Their hard-coded values become tokens: `Button`, `ConfirmDeleteDialog`, `FormDialog`, `Panel`, `RailLink`, `Skeleton`, `Toaster`, `fields`, `RecordSelect`, `board/BoardTotals`, `board/ColumnHeader`, `board/DealCard`, `dashboard/charts`, `dashboard/FollowUpList`, `dashboard/HeadlinePanel`, `forms/ActivityForm`, `record/FollowUpCheckbox`, `table/DataTable`, `table/SearchBox`, `table/StatusFilter`. |
| `Timeline`, `RecordSelect`, `SuggestField`, `FormDialog`, `ConfirmDeleteDialog` CSS Modules | Dialogs, menus and pop-up lists use `--raised`, and their chosen item `--highlight` (added in Phase 4: black dialogs on black panels had no visible edge). |
| CSS Modules that use `--midnight` or `--ink` for a role that splits | Switched to the right role token (see Phase 2). The ones known today: `Button`, `IconRail`, `RailLink`, `Panel`, `Toaster`, `board/BoardTotals`, `board/DealCard`, `dashboard/FollowUpList`, `dashboard/HeadlinePanel`, `forms/ActivityForm`, `table/StatusFilter`. |

### End-to-end (`e2e/`)

| File | Change |
|---|---|
| `light-mode.spec.ts` (new) | The light mode comparison: every screen and both dialogs against reference screenshots, with the toggle hidden. |
| `light-mode.spec.ts-snapshots/` (new) | The reference screenshots, captured before any styling changes and committed. |
| `hide-theme-toggle.css` (new) | The style the comparison applies while it captures: `visibility: hidden` on the toggle. |
| `dark-mode.spec.ts` (new) | The toggle, the choice kept after a reload, no light flash, every section in dark mode, and storage being blocked. |
| `visual.spec.ts` | Also saves every screen in dark mode to `test-results/screens/`, for review by eye. |

### Docs

| File | Change |
|---|---|
| `docs/spec.md` | `RUN-04`: the end-to-end date and time are fixed to 23 Nov 2026, 14:00. Any detail the build settles differently from what the spec says now. |
| `docs/frontend-architecture.md` | Styling: the role tokens, the dark block, the switch, and the rule that no colour lives outside `tokens.css`. Testing: the new tests. |
| `docs/STATUS.md` | Dark mode done, and how to recreate the light mode reference screenshots. |
| `docs/changes/dark-mode/*.png` | `dashboard-light.png`, `dashboard-dark.png`, `pipeline-light.png`, `pipeline-dark.png`, at 1280px. |

No backend file changes, and no new dependency: localStorage, one attribute on `<html>` and CSS variables cover it.

## Order of work

### Phase 1: lock light mode down

Before any styling changes, so the reference shows light mode as it is today.

1. Fix the end-to-end clock to `2026-11-23T14:00:00` in `playwright.config.ts`. Run the whole end-to-end suite. Any test that relied on the real time of day gets fixed, with the reason in the commit.
2. Write `e2e/light-mode.spec.ts`. At 1280px and 1024px it captures, with `toHaveScreenshot`, each of:
   - the dashboard, the pipeline, the three tables and the three record pages
   - the deal form showing its errors
   - the delete dialog.

   Each capture waits for `settled` and `document.fonts.ready`, turns animations off, and applies `hide-theme-toggle.css`. The style matches the toggle by its name (`button[aria-label^="Switch to"]`), so it hides nothing today and hides the toggle once it exists. The rail's foot is then plain Midnight in both cases, so there's nothing to mask with a box.
3. Run it with `--update-snapshots` on the unchanged app, then twice more without, to prove the captures are stable.
4. Commit the reference screenshots on their own, before Phase 2.

**Done when:** the comparison passes three runs in a row on the unchanged app, and the references are committed.

### Phase 2: every colour into a token, with no visible change

1. **Split the tokens by role.** Today some tokens mean two things, and they must come apart before dark mode can redefine them:
   - `--ink` is body text and also the Midnight text on bright fills: Sea Green buttons, the mark, the stage blocks. Body text flips to Sea Mist in dark mode, but text on bright fills stays Midnight. New token: `--on-bright`.
   - `--midnight` is the rail and headline panels, which stay Midnight, and also the other Midnight fills, which become Sea Mist. New tokens: `--rail` for the rail and the two headline panels, `--fill-strong` and `--on-fill-strong` for the rest.
   - Tooltips (`--tip`, `--on-tip`), messages (`--toast`, `--on-toast`, `--toast-error`, `--on-toast-error`), the dialog overlay, the dialog and pop-up shadows, link text, the placeholder text, chart grid lines and labels, and the hover shades in `Button.module.css` each get a role token.
2. **Move every colour value into `tokens.css`**, with exactly today's value, including the shades the spec doesn't list (`#EDF3F4`, `#F7FAFA`, `#6B858E`, `#0B4A5E`, `#05C491`, `#A81F43`).
3. **Pass colours as `var(--token)` where code hands them to something:** `lib/stages.ts`, the timeline icons, the chart props.
4. **Charts first.** Change one Recharts prop to `var(--sea)` and check the line still draws before converting the rest (see Risks).
5. Add the scan in `tokens.test.ts` that fails on a hex, `rgb(` or `rgba(` value outside `tokens.css`, tests excluded. It must pass at the end of this phase.

**Done when:** the light mode comparison passes unchanged, the scan passes, and `npm test` passes. This phase is a refactor that the feature needs, so it goes in its own commit.

### Phase 3: the switch

1. `lib/theme.ts` with the key `accountable-theme` and the values `light` and `dark`.
   - Reading it: anything else, or storage that can't be read, means light.
   - Saving it: if storage refuses, the attribute still changes and the app carries on for the session. A comment there gives the reason (the spec's decision "Where the light or dark choice is kept"), so the catch isn't a swallowed error.
2. The script in `index.html`: the same key, the same read, and `data-theme` on `<html>`.
   - It goes on `<html>` so Radix portals (dialogs, tooltips, menus, messages) pick up the tokens too.
   - It has to be a plain inline script. A module script runs too late to stop a light flash.
3. `ThemeToggle` at the foot of the rail. It uses Lucide `Moon` and `Sun`, the name "Switch to dark mode" or "Switch to light mode", the rail's tooltip, and the rail button look. The dark block in `tokens.css` is still empty, so switching changes nothing on screen yet.

**Done when:** the unit tests for the theme and the toggle pass, and the light mode comparison passes with the toggle in the rail.

### Phase 4: the dark values

1. Fill `:root[data-theme='dark']` with the values in spec.md, Design: the colour tables, the dark text shades and badge tints, the tooltip, message, dialog and follow-up colours, Negotiation in Sea Mist, and black shadows. Add `color-scheme: dark`.
2. Add the dark pairs to the contrast test in `tokens.test.ts`.
3. Open every screen, dialog, menu, tooltip, message and the dragging state in dark mode, at 1280px and 1024px. Anything that looks wrong is fixed by a token, never by an override in a component.

**Done when:** the contrast test passes for both modes, the light mode comparison still passes, and no screen in dark mode has a part left in light colours.

### Phase 5: proof and docs

1. Write `e2e/dark-mode.spec.ts`, and add the dark screenshots to `visual.spec.ts`.
2. Save the four screenshots to `docs/changes/dark-mode/`.
3. Update `docs/spec.md` (`RUN-04`, and anything the build settled differently), `docs/frontend-architecture.md` and `docs/STATUS.md`.
4. Run `npm run check` and `npm test`, and fix every failure.
5. Use the app by hand in Chrome, the way a salesperson would (`SC-12`), in both modes. Check every section, a drag on the board, a form with errors, a delete, a toast and a follow-up ticked off, with the console clear.

**Done when:** all four success criteria in `intent.md` hold.

## Risks

1. **Unstable screenshots.** The comparison only works if a screen looks exactly the same on every run.
   - Today the end-to-end clock fixes the date but not the time. The sample data's times, the recent activity list and the "When" field all move with the time of day. Phase 1 fixes the time first.
   - Chart animations, font loading and the text cursor are handled by waiting for `settled` and `document.fonts.ready` and turning animations off.
   - Three clean runs are needed before the references count.
2. **The references are for this machine.** Playwright names reference screenshots per platform, and fonts render differently on Mac and Linux. On another computer the comparison has no reference and fails until one is made. There's no CI, so this only matters when someone runs the tests elsewhere. `docs/STATUS.md` will say how to make the references, and that they have to be made from light mode as it was before this change, for example from the Phase 1 commit.
3. **Tokens with two meanings.** `--ink` and `--midnight` are each used for two roles that go different ways in dark mode. If one is missed, the "A" mark, the Sea Green buttons or the stage blocks get Sea Mist text, or the rail turns Sea Mist. Phase 2 splits them before any dark value exists, and the Phase 4 walk-through checks each fill.
4. **Recharts and `var()`.** Browsers accept `var()` in SVG colour attributes, but if Recharts computes anything from a colour string itself, that part would break. Phase 2 tests one prop first. If it fails, the fallback is a small hook that reads the token's value and re-reads it when the mode changes. That would mean changing the spec's architecture decision on switching, so I'd raise it with you before building it.
5. **Light mode changing by accident.** Phase 2 touches about twenty CSS Modules. Each value moves with exactly today's colour, and the comparison runs at the end of every phase. A difference is fixed in the token, and the reference is never updated to make it pass.
6. **Two copies of the storage read.** The `index.html` script can't import `lib/theme.ts`, so the key and the read rule live in both. A unit test checks that `index.html` uses the same key, and the end-to-end test checks the two agree after a reload.
7. **Blocked storage and the console rule.** Every end-to-end test fails on a console warning, and the standards don't allow swallowed errors. If saving fails, the toggle keeps working without logging, and a comment gives the reason. A test covers it.
8. **A refactor inside a feature.** The standards keep refactors separate. Phase 2 can't be skipped, so it gets its own commit, proven by the unchanged light mode comparison. If you'd rather it were its own branch and pull request, it can be, since it changes nothing visible.
9. **The spec's light values differ from the code.** The spec gives pipeline cards as `#F3F7F8`, but the code uses `#EDF3F4` for one card state. Light mode must not change, so the code's values win. Phase 5 corrects the spec where they differ.

## Proof

### Unit tests (Vitest)

**`src/styles/tokens.test.ts`**
- In light mode and dark mode, each text pair meets its minimum contrast, worked out from the values in `tokens.css`:
  - ink and muted ink on page, panel and card (4.5:1)
  - each text shade on panel and card, and on its badge tint (4.5:1)
  - Midnight on each bright fill and on the dark Midnight fill (4.5:1)
  - white on the darker Cerulean, Midnight and dark Raspberry (4.5:1)
  - the toast and tooltip text on their backgrounds (4.5:1)
  - the headline panel labels on Midnight (4.5:1).
- Light mode's values equal today's, listed in the test. This catches an accidental change before the screenshots run.
- Every token the dark block sets is also set in light mode, and the colours meant to stay the same (brand fills, the text on them, the delete button, the rail and headline panels) aren't redefined.
- No file under `src/` other than `tokens.css` holds a colour value (hex, `rgb(` or `rgba(`), test files excluded.

**`src/lib/theme.test.ts`**
- Reading with nothing saved gives light. A saved `dark` gives dark, and anything else gives light.
- Setting dark sets `data-theme="dark"` on `<html>` and saves `dark`. Setting light removes the attribute and saves `light`.
- When saving throws, the attribute still changes and nothing is logged.
- When reading throws, the result is light.
- `index.html` contains the same key as `theme.ts`.

**`src/components/ThemeToggle.test.tsx`**
- In light mode it shows the moon, and its name is "Switch to dark mode".
- Clicking it switches to dark: the attribute is set, the sun shows, and its name becomes "Switch to light mode". A second click switches back.
- Enter and Space switch it too.
- Its tooltip shows its name on hover and on keyboard focus.
- It starts in the saved mode.

**`src/components/IconRail.test.tsx`**
- The toggle is the last button in the rail, after the five sections.

**`src/lib/stages.test.ts`, `src/components/record/Timeline.test.tsx`**
- The same checks as now, against token names instead of hex values. The behaviour is unchanged; only where the colours live changes.

### End-to-end tests (Playwright with Chrome)

**`e2e/light-mode.spec.ts`**
- At 1280px and 1024px, each screen matches its reference screenshot from before the change, with the toggle hidden: the dashboard, the pipeline, the three tables, the three record pages, the deal form with errors and the delete dialog.

**`e2e/dark-mode.spec.ts`**
- A fresh browser starts in light mode: no `data-theme`, a page background of `#F0F4F5`, and the toggle named "Switch to dark mode".
- Clicking the toggle turns the page background `#04232E` and the panels black, and renames the toggle "Switch to light mode".
- After a reload it's still dark. With the app's script held back by a delayed route, the page is already dark before the app loads, which proves there's no light flash.
- In dark mode, every section has the toggle at the foot of the rail and stays dark: dashboard, pipeline, deals, contacts, organizations and a record page.
- Dialogs, tooltips and messages are dark too: the deal form and the delete dialog use the Raised colour, a rail tooltip is Sea Mist, and a "Deal saved" message is Sea Mist.
- Text typed in the Log activity form is still there after switching modes.
- Switching back to light also lasts through a reload.
- A second browser context starts in light mode while the first is dark.
- With localStorage set to throw, the toggle still switches the page, and the console stays clear.
- Like every end-to-end test, it fails on any console error or warning.

**`e2e/visual.spec.ts`**
- Every screen and both dialogs also saved in dark mode, at 1280px and 1024px, in `test-results/screens/`, for review by eye. The four in `docs/changes/dark-mode/` come from here.

### Checks

- `npm run check` passes: formatting, lint, types, secrets, traceability and every test suite.
- By hand, in Chrome, in both modes, as described in Phase 5.
