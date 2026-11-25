import { readFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { chooseTheme, currentTheme, readChoice, resolveTheme, THEME_KEY, watchSystemTheme } from './theme';

// Vitest runs from frontend/, and jsdom's import.meta.url isn't a file: URL.
const INDEX_HTML = readFileSync(path.resolve('index.html'), 'utf8');

/** The plain script in index.html that sets the mode before the app loads. */
function indexScript(): string {
  const match = INDEX_HTML.match(/<script>([\s\S]*?)<\/script>/);
  expect(match, 'index.html has an inline script').not.toBeNull();
  return match![1];
}

/** A device whose light or dark setting the test controls (jsdom has no matchMedia). */
function emulateDevice(dark: boolean) {
  const listeners = new Set<(event: { matches: boolean }) => void>();
  const query = {
    get matches() {
      return dark;
    },
    addEventListener: (_: string, listener: (event: { matches: boolean }) => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: (event: { matches: boolean }) => void) => listeners.delete(listener),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query),
  );
  return {
    set(next: boolean) {
      dark = next;
      for (const listener of listeners) listener({ matches: next });
    },
    listeners,
  };
}

beforeEach(() => {
  emulateDevice(false);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  chooseTheme('light');
  localStorage.clear();
});

describe('readChoice', () => {
  test('nothing saved means light', () => {
    expect(readChoice()).toBe('light');
  });

  test('light, dark and system are kept; anything else means light', () => {
    for (const choice of ['light', 'dark', 'system'] as const) {
      localStorage.setItem(THEME_KEY, choice);
      expect(readChoice()).toBe(choice);
    }
    localStorage.setItem(THEME_KEY, 'purple');
    expect(readChoice()).toBe('light');
  });
});

describe('resolveTheme', () => {
  test('light and dark are themselves; system follows the device', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
    expect(resolveTheme('system')).toBe('light');
    emulateDevice(true);
    expect(resolveTheme('system')).toBe('dark');
  });
});

describe('chooseTheme (UI-THEME-01)', () => {
  test('dark sets data-theme on <html> and saves the choice', () => {
    expect(chooseTheme('dark')).toBe(true);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  });

  test('light removes the attribute and saves the choice', () => {
    chooseTheme('dark');
    chooseTheme('light');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
  });

  test('system shows what the device prefers, and saves "system"', () => {
    emulateDevice(true);
    chooseTheme('system');
    expect(currentTheme()).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('system');
  });

  test('when storage is blocked, the choice still works until the page closes, and nothing is logged', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const error = vi.spyOn(console, 'error');
    expect(chooseTheme('dark')).toBe(false);
    expect(currentTheme()).toBe('dark');
    expect(readChoice()).toBe('dark');
    expect(error).not.toHaveBeenCalled();
  });
});

describe('watchSystemTheme', () => {
  test('with System chosen, a change on the device switches at once', () => {
    const device = emulateDevice(false);
    chooseTheme('system');
    const stop = watchSystemTheme();
    expect(currentTheme()).toBe('light');
    device.set(true);
    expect(currentTheme()).toBe('dark');
    device.set(false);
    expect(currentTheme()).toBe('light');
    stop();
    expect(device.listeners.size).toBe(0);
  });

  test('with Light or Dark chosen, the device is ignored', () => {
    const device = emulateDevice(false);
    chooseTheme('light');
    const stop = watchSystemTheme();
    device.set(true);
    expect(currentTheme()).toBe('light');
    stop();
  });
});

describe('the script in index.html', () => {
  test('uses the same key as theme.ts', () => {
    expect(indexScript()).toContain(`'${THEME_KEY}'`);
  });

  test('sets dark mode when Dark was chosen, or System on a dark device', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    new Function(indexScript())();
    expect(currentTheme()).toBe('dark');

    delete document.documentElement.dataset.theme;
    localStorage.setItem(THEME_KEY, 'system');
    new Function(indexScript())();
    expect(currentTheme()).toBe('light');
    emulateDevice(true);
    new Function(indexScript())();
    expect(currentTheme()).toBe('dark');

    delete document.documentElement.dataset.theme;
    localStorage.setItem(THEME_KEY, 'purple');
    new Function(indexScript())();
    expect(currentTheme()).toBe('light');
  });

  test('leaves light mode when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => new Function(indexScript())()).not.toThrow();
    expect(currentTheme()).toBe('light');
  });
});
