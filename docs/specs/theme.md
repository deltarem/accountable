# Light and dark mode

Part of the [Accountable spec](../spec.md). How the app switches between light and dark, and where the choice is kept. The dark colours themselves are in `docs/specs/design.md`, and the menu that holds the choice is in `docs/specs/accounts.md`.

## Decisions

16. **Where the theme choice is kept.** In the browser's localStorage, not in the database.
    - The choice belongs to the browser, not to the person: a different browser, or another person on the same browser, starts in light mode.
    - There are three choices: Light, Dark and System. Light is the default until another is chosen.
    - System follows the device's own setting, and changes with it while the app is open.
    - The saved choice is applied before the page first draws, so a page in dark mode never shows light mode first. That includes the sign-in screen.
    - Signing out keeps the choice.
    - If the browser blocks localStorage, the choice still works until the page is closed, and the app starts in light mode next time.

## Screen

`UI-THEME-01` **The theme choice** is in the menu under your initials (`UI-MENU-01`), as a radio group: Light, Dark and System, with a tick on the current one.
- Choosing one switches the whole app at once: every page, chart, dialog, menu, tooltip and message. Nothing reloads, and an open form keeps what was typed.
- With System chosen, changing the device between light and dark switches the app at once, with no refresh.
- Light is the default, and the choice is kept (see the decision "Where the theme choice is kept").
- The rail no longer has a light and dark toggle.

## Architecture

17. **Switching between light and dark.**
    - **Decided:**
      - A few lines of plain script in `frontend/index.html` read the saved choice from localStorage (key `accountable-theme`, value `light`, `dark` or `system`). Before the app's code loads, they set `data-theme="dark"` on `<html>` when dark mode was chosen, or when System was chosen and the device prefers dark (`prefers-color-scheme: dark`).
      - `index.html` also loads `tokens.css` and `global.css` itself, rather than `main.tsx` importing them, so the page has its colours while the app's code is still loading.
      - The attribute is on `<html>` so that dialogs, menus, tooltips and messages, which Radix draws outside the app's root, pick up the same colours.
      - Choosing in the menu sets that attribute and saves the choice. With System, the app listens for changes to `prefers-color-scheme` and sets the attribute again when it changes.
      - Nothing else reacts to the mode: every component reads the tokens, so the CSS alone changes the colours, with no re-render and no reload.
    - **Why:** the page never shows the wrong mode first, an open form keeps what was typed, and no dependency is needed.
    - **Turned down:**
      - a theme library
      - a React context that passes colours to every component
      - CSS that follows `prefers-color-scheme` on its own, which would give two places that decide the mode instead of one attribute.
