import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test } from 'vitest';

import { THEME_KEY } from '../lib/theme';
import { renderWithProviders } from '../test/utils';
import { ThemeToggle } from './ThemeToggle';

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

function isDark() {
  return document.documentElement.dataset.theme === 'dark';
}

describe('ThemeToggle (spec: Layout, light and dark toggle)', () => {
  test('in light mode it shows the moon and offers dark mode', () => {
    renderWithProviders(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Switch to dark mode' });
    expect(button.querySelector('.lucide-moon')).not.toBeNull();
    expect(isDark()).toBe(false);
  });

  test('clicking switches to dark, shows the sun, and saves the choice; a second click switches back', async () => {
    renderWithProviders(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    const button = screen.getByRole('button', { name: 'Switch to light mode' });
    expect(button.querySelector('.lucide-sun')).not.toBeNull();
    expect(isDark()).toBe(true);
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');

    await userEvent.click(button);
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeTruthy();
    expect(isDark()).toBe(false);
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
  });

  test.each(['{Enter}', ' '])('the keyboard switches it too (%s)', async (key) => {
    renderWithProviders(<ThemeToggle />);
    act(() => screen.getByRole('button', { name: 'Switch to dark mode' }).focus());
    await userEvent.keyboard(key);
    expect(isDark()).toBe(true);
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeTruthy();
  });

  test('it starts in the mode the page is already showing', () => {
    document.documentElement.dataset.theme = 'dark';
    renderWithProviders(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeTruthy();
  });

  test('a tooltip with its name shows on keyboard focus', async () => {
    renderWithProviders(<ThemeToggle />);
    act(() => screen.getByRole('button', { name: 'Switch to dark mode' }).focus());
    expect((await screen.findByRole('tooltip')).textContent).toBe('Switch to dark mode');
  });

  test('a tooltip also shows on hover', async () => {
    renderWithProviders(<ThemeToggle />);
    await userEvent.hover(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect((await screen.findByRole('tooltip', {}, { timeout: 2000 })).textContent).toBe('Switch to dark mode');
  });
});
