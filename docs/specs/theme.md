# Light and dark mode

Part of the [Accountable spec](../spec.md). How the app switches between light and dark, and where the choice is kept. The dark colours themselves are in `docs/specs/design.md`.

## Decisions

16. **Where the light or dark choice is kept.** In the browser's localStorage, not in the database.
    - The choice belongs to the browser: a different browser on the same computer starts in light mode.
    - The device's own dark mode setting is ignored. Light mode is the default until the toggle is used.
    - The saved choice is applied before the page first draws, so a page in dark mode never shows light mode first.
    - If the browser blocks localStorage, the toggle still works until the page is closed, and the app starts in light mode next time.

## Screen

- **Light and dark toggle:** a 44px icon button at the foot of the rail, styled like the section buttons.
  - It shows a Lucide moon in light mode and a sun in dark mode.
  - Its accessible name and its tooltip say what it does: "Switch to dark mode" or "Switch to light mode". The tooltip shows on hover and on keyboard focus.
  - Clicking it, or pressing Enter or Space on it, switches the whole app at once: every page, chart, dialog, menu, tooltip and message. Nothing reloads, and an open form keeps what was typed.
  - Light mode is the default, and the choice is kept (see the decision "Where the light or dark choice is kept").

## Architecture

17. **Switching between light and dark.**
    - **Decided:**
      - A few lines of plain script in `frontend/index.html` read the saved choice from localStorage (key `accountable-theme`, value `light` or `dark`). Before the app's code loads, they set `data-theme="dark"` on `<html>` when dark mode was chosen.
      - `index.html` also loads `tokens.css` and `global.css` itself, rather than `main.tsx` importing them, so the page has its colours while the app's code is still loading.
      - The attribute is on `<html>` so that dialogs, menus, tooltips and messages, which Radix draws outside the app's root, pick up the same colours.
      - The toggle switches that attribute and saves the choice.
      - Nothing else reacts to the mode: every component reads the tokens, so the CSS alone changes the colours, with no re-render and no reload.
    - **Why:** the page never shows the wrong mode first, an open form keeps what was typed, and no dependency is needed.
    - **Turned down:**
      - a theme library
      - a React context that passes colours to every component
      - following `prefers-color-scheme`, which the intent leaves out (see the decision "Where the light or dark choice is kept").
