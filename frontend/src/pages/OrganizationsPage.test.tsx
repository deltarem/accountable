import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';

import { mockFetch } from '../test/utils';
import { columnText, currentPath, failThenAnswer, makeOrganization, renderPage } from '../test/listHelpers';
import { OrganizationsPage } from './OrganizationsPage';

const organizations = [
  makeOrganization(1, {
    name: 'Northwind Traders',
    industry: 'Retail',
    website: 'https://northwind.example/',
    contact_count: 3,
    open_deal_count: 2,
    open_value_cents: 4_500_000,
  }),
  makeOrganization(2, { name: 'Acme Ltd', industry: 'Manufacturing', contact_count: 1, open_value_cents: 120_000 }),
  makeOrganization(3, { name: 'Globex Corp', contact_count: 7, open_deal_count: 1, open_value_cents: 999_900 }),
];

function setup(routes: Record<string, unknown> = {}) {
  return mockFetch({ '/api/organizations': organizations, '/api/industries': ['Retail'], ...routes });
}

const names = () => columnText(0);

async function renderLoaded() {
  renderPage(<OrganizationsPage />, '/organizations');
  await screen.findByText('Northwind Traders');
}

describe('OrganizationsPage', () => {
  test('lists organizations by name with every column (UI-TBL-06)', async () => {
    setup();
    await renderLoaded();
    expect(names()).toEqual(['Acme Ltd', 'Globex Corp', 'Northwind Traders']);
    const row = screen.getByRole('row', { name: 'Open Northwind Traders' });
    expect(
      within(row)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['Northwind Traders', 'Retail', 'northwind.example', '3', '2', '$45.000,00', '']);
    expect(screen.getByText('3 of 3 organizations')).toBeTruthy();
  });

  test('the website opens in a new tab', async () => {
    setup();
    await renderLoaded();
    const link = screen.getByRole('link', { name: 'northwind.example' });
    expect(link.getAttribute('href')).toBe('https://northwind.example/');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(within(screen.getByRole('row', { name: 'Open Acme Ltd' })).queryByRole('link')).toBeNull();
  });

  test('search matches the industry but not the counts (UI-TBL-01)', async () => {
    setup();
    await renderLoaded();
    const search = screen.getByRole('searchbox', { name: 'Search organizations' });
    await userEvent.type(search, 'MANUF');
    expect(names()).toEqual(['Acme Ltd']);
    await userEvent.clear(search);
    await userEvent.type(search, '7');
    expect(screen.getByText('No organizations match "7"')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(names()).toHaveLength(3);
  });

  test('sorting by contacts and open value (UI-TBL-02)', async () => {
    setup();
    await renderLoaded();
    await userEvent.click(screen.getByRole('button', { name: 'Contacts' }));
    expect(names()).toEqual(['Acme Ltd', 'Northwind Traders', 'Globex Corp']);
    await userEvent.click(screen.getByRole('button', { name: 'Open value' }));
    await userEvent.click(screen.getByRole('button', { name: 'Open value' }));
    expect(names()).toEqual(['Northwind Traders', 'Globex Corp', 'Acme Ltd']);
  });

  test('Enter on a row opens the organization (UI-TBL-03)', async () => {
    setup();
    await renderLoaded();
    screen.getByRole('row', { name: 'Open Globex Corp' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(currentPath()).toBe('/organizations/3');
  });

  test('New organization and Edit open the organization form', async () => {
    setup();
    await renderLoaded();
    await userEvent.click(screen.getByRole('button', { name: 'New organization' }));
    expect(await screen.findByRole('dialog', { name: 'New organization' })).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Edit Acme Ltd' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit organization' });
    expect((within(dialog).getByLabelText(/^Name/) as HTMLInputElement).value).toBe('Acme Ltd');
  });

  test('Delete says what happens to the contacts and deals (UI-DEL-01)', async () => {
    setup({ '/api/organizations/1/delete-impact': { name: 'Northwind Traders', contacts: 3, deals: 2 } });
    await renderLoaded();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Northwind Traders' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete Northwind Traders?' });
    expect(within(dialog).getByText(/Its 3 contacts and 2 deals will be kept, with no organization/)).toBeTruthy();
  });

  test('when the delete check fails, says so instead of opening the dialog', async () => {
    setup({
      '/api/organizations/1/delete-impact': () => new Response(JSON.stringify({ detail: 'Nope' }), { status: 500 }),
    });
    await renderLoaded();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Northwind Traders' }));
    expect(await screen.findByText("Couldn't check what deleting would change. Try again.")).toBeTruthy();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  test('with no organizations, says so and offers New organization (UI-EMPTY-01)', async () => {
    setup({ '/api/organizations': [] });
    renderPage(<OrganizationsPage />, '/organizations');
    expect(await screen.findByText('No organizations yet')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'New organization' })).toHaveLength(2);
  });

  test('a failed load shows an error with Try again (UI-ERR-01)', async () => {
    setup({ '/api/organizations': failThenAnswer(1, organizations) });
    renderPage(<OrganizationsPage />, '/organizations');
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain("Couldn't load the organizations.");
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Northwind Traders')).toBeTruthy();
  });
});
