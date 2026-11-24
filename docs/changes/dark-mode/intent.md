# Intent: dark mode

## Problem

Accountable only has a light mode, and some people prefer a dark screen.

## Proposed outcome

A dark mode with a toggle on every page, across every section.

- The toggle is a 44px icon button (moon in light mode, sun in dark mode) at the bottom of the icon rail. Like the other rail buttons, it has an accessible name and a tooltip on hover and keyboard focus.
- Dark mode uses the brand's dark surfaces: page background `#04232E`, black panels and cards.

## Constraints

- Light mode stays the default, and the app remembers the choice.
  - The choice is saved in the browser (localStorage), with no backend or database change. A different browser starts in light mode.
  - It is applied before the first paint, so a page in dark mode never flashes light first.
- Light mode looks exactly as it does today, apart from the toggle.
- Colors stay in one place, as tokens, with no scattered overrides.
- Text in dark mode meets the same contrast rules as spec.md.
- Charts, dialogs and messages follow the mode too.
- No new dependencies unless the plan makes the case for one.

## Not in this change

- Following the device's own dark mode setting.
- A layout for phones.

## Success criteria

1. npm run check passes.
2. A new end-to-end test proves that the toggle works and is remembered after a reload.
3. Screenshots of the dashboard and the pipeline in both modes are saved in docs/changes/dark-mode/.
4. Light mode is proven unchanged by a screenshot comparison: every screen is captured in light mode before the change, and an end-to-end check compares the light mode after the change against those captures, with the toggle's area masked.
