import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';

import { THEME_KEY } from '../../lib/theme';
import { fakeSession, renderSignedIn } from '../../test/session';
import { AccountMenu } from './AccountMenu';

const initials = () => screen.getByRole('button', { name: 'Account menu for Priya Shah' });

async function openMenu() {
  await userEvent.click(initials());
  return screen.getByRole('menu');
}

describe('the menu under your initials (UI-MENU-01)', () => {
  test('shows your initials, with its name for screen readers and as a tooltip', async () => {
    renderSignedIn(<AccountMenu />);
    expect(initials().textContent).toBe('PS');
    await userEvent.hover(initials());
    expect((await screen.findByRole('tooltip')).textContent).toBe('Account menu for Priya Shah');
  });

  test('holds your name and email, the theme choice and Sign out', async () => {
    renderSignedIn(<AccountMenu />);
    const menu = await openMenu();
    expect(within(menu).getByText('Priya Shah')).toBeTruthy();
    expect(within(menu).getByText('priya@company.com')).toBeTruthy();
    expect(within(menu).getByText('Theme')).toBeTruthy();
    expect(
      within(menu)
        .getAllByRole('menuitemradio')
        .map((i) => i.textContent),
    ).toEqual(['Light', 'Dark', 'System']);
    expect(within(menu).getByRole('menuitem', { name: 'Sign out' })).toBeTruthy();
    expect(within(menu).getAllByRole('separator')).toHaveLength(2);
  });

  test('the current theme has the tick; Light until another is chosen', async () => {
    renderSignedIn(<AccountMenu />);
    const menu = await openMenu();
    expect(within(menu).getByRole('menuitemradio', { name: 'Light' }).getAttribute('aria-checked')).toBe('true');
    expect(within(menu).getByRole('menuitemradio', { name: 'Dark' }).getAttribute('aria-checked')).toBe('false');
  });

  test('choosing a theme switches at once, keeps it, and leaves the menu open (UI-THEME-01)', async () => {
    renderSignedIn(<AccountMenu />);
    const menu = await openMenu();
    await userEvent.click(within(menu).getByRole('menuitemradio', { name: 'Dark' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(within(menu).getByRole('menuitemradio', { name: 'Dark' }).getAttribute('aria-checked')).toBe('true');
    await userEvent.click(within(menu).getByRole('menuitemradio', { name: 'Light' }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
  });

  test('Sign out signs out at once, with no confirmation', async () => {
    const session = fakeSession();
    renderSignedIn(<AccountMenu />, { session });
    const menu = await openMenu();
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Sign out' }));
    expect(session.signOut).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('works from the keyboard: the down arrow opens it, Escape closes it and returns focus', async () => {
    renderSignedIn(<AccountMenu />);
    initials().focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menu')).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(initials());
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('menu')).toBeTruthy();
  });

  test('shows nothing when nobody is signed in', () => {
    renderSignedIn(<AccountMenu />, { session: fakeSession({ user: null }) });
    expect(screen.queryByRole('button')).toBeNull();
  });
});
