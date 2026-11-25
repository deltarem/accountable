import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';

import { renderWithProviders } from '../test/utils';
import { IconRail } from './IconRail';

const SECTION_NAMES = ['Dashboard', 'Pipeline', 'Deals', 'Contacts', 'Organizations'];

function current() {
  const rail = screen.getByRole('navigation', { name: 'Sections' });
  return within(rail)
    .getAllByRole('link')
    .filter((link) => link.getAttribute('aria-current') === 'page')
    .map((link) => link.getAttribute('aria-label'));
}

describe('IconRail (UI-LAY-01)', () => {
  test('the mark links to the dashboard, followed by five named section buttons', () => {
    renderWithProviders(<IconRail />);
    const links = within(screen.getByRole('navigation', { name: 'Sections' })).getAllByRole('link');
    expect(links.map((l) => l.getAttribute('aria-label'))).toEqual([
      'Accountable, go to the dashboard',
      ...SECTION_NAMES,
    ]);
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/',
      '/',
      '/pipeline',
      '/deals',
      '/contacts',
      '/organizations',
    ]);
  });

  test.each([
    ['/', 'Dashboard'],
    ['/pipeline', 'Pipeline'],
    ['/deals', 'Deals'],
    ['/deals/7', 'Deals'],
    ['/contacts/4', 'Contacts'],
    ['/organizations', 'Organizations'],
  ])('on %s only %s is marked as the current page', (route, section) => {
    renderWithProviders(<IconRail />, { route });
    expect(current()).toEqual([section]);
  });

  test('the dashboard button is not current on other pages, and nothing is current on an unknown address', () => {
    renderWithProviders(<IconRail />, { route: '/nowhere' });
    expect(current()).toEqual([]);
  });

  test('the current button looks different from the others', () => {
    renderWithProviders(<IconRail />, { route: '/pipeline' });
    const pipeline = screen.getByRole('link', { name: 'Pipeline' });
    const deals = screen.getByRole('link', { name: 'Deals' });
    expect(pipeline.className).not.toBe(deals.className);
  });

  test('a tooltip with the section name shows on keyboard focus', async () => {
    renderWithProviders(<IconRail />);
    act(() => screen.getByRole('link', { name: 'Contacts' }).focus());
    expect((await screen.findByRole('tooltip')).textContent).toBe('Contacts');
  });

  test('holds the mark and the five sections, and nothing at its foot (UI-THEME-01)', () => {
    renderWithProviders(<IconRail />);
    const rail = screen.getByRole('navigation', { name: 'Sections' });
    const controls = Array.from(rail.querySelectorAll('a, button')).map((el) => el.getAttribute('aria-label'));
    expect(controls).toEqual(['Accountable, go to the dashboard', ...SECTION_NAMES]);
  });

  test('a tooltip also shows on hover', async () => {
    renderWithProviders(<IconRail />);
    await userEvent.hover(screen.getByRole('link', { name: 'Organizations' }));
    expect((await screen.findByRole('tooltip', {}, { timeout: 2000 })).textContent).toBe('Organizations');
  });
});
