// Light and dark mode (spec: "Where the light or dark choice is kept" and
// "Switching between light and dark").
//
// The mode is one attribute on <html>: data-theme="dark", or none for light.
// tokens.css redefines the colours under that attribute, so nothing else in the
// app needs to know the mode. index.html sets the attribute before the app
// loads, using the same key and the same rule as readTheme below.

export type Theme = 'light' | 'dark';

export const THEME_KEY = 'accountable-theme';

/** The saved choice. Anything other than "dark", or storage that can't be read, means light. */
export function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    // Storage can be blocked by the browser. Light is the default the spec asks for.
    return 'light';
  }
}

/** The mode the page is showing now. */
export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/**
 * Show the mode and save it. Returns whether the choice was saved. If the
 * browser refuses to save it, the page still switches and keeps the mode until
 * it's closed, as the spec says, so there's nothing to report.
 */
export function setTheme(theme: Theme): boolean {
  if (theme === 'dark') document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
    return true;
  } catch {
    return false;
  }
}
