import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';

import { railLink, renderRoutes } from '../test/shellHelpers';
import { mockFetch } from '../test/utils';
import { AppShell } from './AppShell';
import { useForms } from './forms/FormsProvider';

function Page({ title }: { title: string }) {
  return <h1>{title}</h1>;
}

/** A page that opens the shared delete dialog, to show the shell provides the forms. */
function PageWithDelete() {
  const { confirmDelete } = useForms();
  return (
    <button type="button" onClick={() => confirmDelete({ kind: 'deals', id: 7 })}>
      Delete deal
    </button>
  );
}

const tree = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Page title="Dashboard page" /> },
      { path: 'pipeline', element: <Page title="Pipeline page" /> },
      { path: 'deals', element: <Page title="Deals page" /> },
      { path: 'contacts', element: <Page title="Contacts page" /> },
      { path: 'organizations', element: <PageWithDelete /> },
    ],
  },
];

describe('AppShell', () => {
  test('the page sits in the main area beside the rail, under the top bar (UI-LAY-05)', () => {
    renderRoutes(tree, '/deals');
    const main = screen.getByRole('main');
    const [bar, page] = Array.from(main.children) as HTMLElement[];
    expect(bar.getAttribute('data-testid')).toBe('top-bar');
    expect(within(bar).getByRole('combobox', { name: 'Search everything' })).toBeTruthy();
    expect(within(bar).getByRole('button', { name: 'Account menu for Priya Shah' })).toBeTruthy();
    expect(page.textContent).toBe('Deals page');
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeTruthy();
  });

  test('clicking rail buttons changes the page and moves the current marker', async () => {
    const { currentPath } = renderRoutes(tree, '/');
    expect(screen.getByRole('heading', { name: 'Dashboard page' })).toBeTruthy();

    await userEvent.click(railLink('Pipeline'));
    expect(currentPath()).toBe('/pipeline');
    expect(screen.getByRole('heading', { name: 'Pipeline page' })).toBeTruthy();
    expect(railLink('Pipeline').getAttribute('aria-current')).toBe('page');
    expect(railLink('Dashboard').getAttribute('aria-current')).toBeNull();

    await userEvent.click(railLink('Accountable, go to the dashboard'));
    expect(currentPath()).toBe('/');
    expect(railLink('Dashboard').getAttribute('aria-current')).toBe('page');
  });

  test('pages inside the shell can open the shared dialogs', async () => {
    mockFetch({ '/api/deals/7/delete-impact': { name: 'Booking engine', activities: 0, events: 0 } });
    renderRoutes(tree, '/organizations');
    await userEvent.click(screen.getByRole('button', { name: 'Delete deal' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toContain('Delete Booking engine?');
  });
});
