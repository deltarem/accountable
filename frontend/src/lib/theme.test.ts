import { readFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { currentTheme, readTheme, setTheme, THEME_KEY } from './theme';

// Vitest runs from frontend/, and jsdom's import.meta.url isn't a file: URL.
const INDEX_HTML = readFileSync(path.resolve('index.html'), 'utf8');

/** The plain script in index.html that sets the mode before the app loads. */
function indexScript(): string {
  const match = INDEX_HTML.match(/<script>([\s\S]*?)<\/script>/);
  expect(match, 'index.html has an inline script').not.toBeNull();
  return match![1];
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('readTheme', () => {
  test('nothing saved means light', () => {
    expect(readTheme()).toBe('light');
  });

  test('a saved "dark" means dark, and anything else means light', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    expect(readTheme()).toBe('dark');
    localStorage.setItem(THEME_KEY, 'light');
    expect(readTheme()).toBe('light');
    localStorage.setItem(THEME_KEY, 'purple');
    expect(readTheme()).toBe('light');
  });

  test('storage that throws means light', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readTheme()).toBe('light');
  });
});

describe('setTheme', () => {
  test('dark sets data-theme on <html> and saves it', () => {
    expect(setTheme('dark')).toBe(true);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(currentTheme()).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  });

  test('light removes the attribute and saves it', () => {
    setTheme('dark');
    expect(setTheme('light')).toBe(true);
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(currentTheme()).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
  });

  test('when saving throws, the page still switches and nothing is logged', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const error = vi.spyOn(console, 'error');
    const warn = vi.spyOn(console, 'warn');
    expect(setTheme('dark')).toBe(false);
    expect(currentTheme()).toBe('dark');
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('the script in index.html', () => {
  test('uses the same key as theme.ts', () => {
    expect(indexScript()).toContain(`'${THEME_KEY}'`);
  });

  test('sets dark mode only when "dark" was saved', () => {
    localStorage.setItem(THEME_KEY, 'dark');
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
