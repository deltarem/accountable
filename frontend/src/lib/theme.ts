// Light, dark and system (UI-THEME-01; docs/specs/theme.md, "Where the theme
// choice is kept" and "Switching between light and dark").
//
// The mode is one attribute on <html>: data-theme="dark", or none for light.
// tokens.css redefines the colours under that attribute, so nothing else in the
// app needs to know the mode. index.html sets the attribute before the app
// loads, using the same key and the same rule as resolveTheme below.

export type ThemeChoice = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark';

export const THEME_KEY = 'accountable-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
const CHOICES: readonly string[] = ['light', 'dark', 'system'];

// The choice for this page, for when the browser blocks storage: it still works
// until the page is closed, and the app starts in light mode next time.
let unsaved: ThemeChoice | null = null;

/** The saved choice. Nothing saved, or anything unknown, means light, the default. */
export function readChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved !== null && CHOICES.includes(saved) ? (saved as ThemeChoice) : 'light';
  } catch {
    // Storage blocked: the choice made on this page, if any.
    return unsaved ?? 'light';
  }
}

function deviceIsDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

/** The mode a choice shows: System follows the device's setting. */
export function resolveTheme(choice: ThemeChoice): Theme {
  if (choice === 'system') return deviceIsDark() ? 'dark' : 'light';
  return choice;
}

/** The mode the page is showing now. */
export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function show(theme: Theme): void {
  if (theme === 'dark') document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
}

/**
 * Show the choice and save it. Returns whether it was saved. If the browser
 * refuses to save it, the page still switches and keeps it until it's closed, as
 * the spec says, so there's nothing to report.
 */
export function chooseTheme(choice: ThemeChoice): boolean {
  unsaved = choice;
  show(resolveTheme(choice));
  try {
    localStorage.setItem(THEME_KEY, choice);
    return true;
  } catch {
    return false;
  }
}

/**
 * With System chosen, a change on the device switches the app at once, with no
 * refresh. Started once, when the app loads; returns a function that stops it.
 */
export function watchSystemTheme(): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(DARK_QUERY);
  const onChange = () => {
    if (readChoice() === 'system') show(resolveTheme('system'));
  };
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
