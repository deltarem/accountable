import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';

import { mockFetch } from '../test/utils';
import { TODAY, columnText, currentPath, failThenAnswer, makeContact, renderPage } from '../test/listHelpers';
import { ContactsPage } from './ContactsPage';

const contacts = [
  makeContact(1, {
    name: 'Maria Lopez',
    organization_name: 'Acme Ltd',
    job_title: 'Head of IT',
    email: 'maria@acme.example',
    phone: '+1 555 0100',
    status: 'customer',
  }),
  makeContact(2, { name: 'Tom Becker', organization_name: 'Globex Corp', status: 'lead' }),
  makeContact(3, { name: 'Aisha Khan', status: 'qualified' }),
  makeContact(4, { name: 'Zoe Adams', organization_name: 'Globex Corp', status: 'lead' }),
];

function setup(routes: Record<string, unknown> = {}) {
  return mockFetch({
    '/api/contacts': contacts,
    '/api/organizations': [],
    '/api/today': TODAY,
    ...routes,
  });
}

const names = () => columnText(0);
const chip = (name: RegExp) => screen.getByRole('button', { name });

async function renderLoaded() {
  renderPage(<ContactsPage />, '/contacts');
  await screen.findByText('Maria Lopez');
}

describe('ContactsPage', () => {
  test('lists contacts by name with every column (UI-TBL-07)', async () => {
    setup();
    await renderLoaded();
    expect(names()).toEqual(['Aisha Khan', 'Maria Lopez', 'Tom Becker', 'Zoe Adams']);
    const maria = screen.getByRole('row', { name: 'Open Maria Lopez' });
    expect(
      within(maria)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['Maria Lopez', 'Acme Ltd', 'Head of IT', 'maria@acme.example', '+1 555 0100', 'Customer', '']);
    expect(within(maria).getByRole('link', { name: 'maria@acme.example' }).getAttribute('href')).toBe(
      'mailto:maria@acme.example',
    );
    expect(within(screen.getByRole('row', { name: 'Open Aisha Khan' })).getByText('No organization')).toBeTruthy();
    expect(screen.getByText('4 of 4 contacts')).toBeTruthy();
  });

  test('the status buttons show their counts and filter the list (UI-TBL-07)', async () => {
    setup();
    await renderLoaded();
    expect(chip(/^All/).textContent).toBe('All 4');
    expect(chip(/^Lead/).textContent).toBe('Lead 2');
    expect(chip(/^Qualified/).textContent).toBe('Qualified 1');
    expect(chip(/^Customer/).textContent).toBe('Customer 1');

    await userEvent.click(chip(/^Lead/));
    expect(chip(/^Lead/).getAttribute('aria-pressed')).toBe('true');
    expect(names()).toEqual(['Tom Becker', 'Zoe Adams']);
    expect(screen.getByText('2 of 4 contacts')).toBeTruthy();

    await userEvent.click(chip(/^Customer/));
    expect(names()).toEqual(['Maria Lopez']);

    await userEvent.click(chip(/^All/));
    expect(names()).toHaveLength(4);
  });

  test('the status filter combines with the search', async () => {
    setup();
    await renderLoaded();
    await userEvent.click(chip(/^Lead/));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search contacts' }), 'zoe');
    expect(names()).toEqual(['Zoe Adams']);
    expect(screen.getByText('1 of 4 contacts')).toBeTruthy();
    await userEvent.click(chip(/^Qualified/));
    expect(screen.getByText('No contacts match "zoe"')).toBeTruthy();
  });

  test('a status with no contacts says so', async () => {
    setup({ '/api/contacts': contacts.filter((c) => c.status !== 'customer') });
    renderPage(<ContactsPage />, '/contacts');
    await screen.findByText('Tom Becker');
    await userEvent.click(chip(/^Customer/));
    expect(screen.getByText('No contacts here')).toBeTruthy();
  });

  test('sorting by status goes Lead, Qualified, Customer (UI-TBL-02)', async () => {
    setup();
    await renderLoaded();
    await userEvent.click(screen.getByRole('button', { name: 'Status' }));
    expect(columnText(5)).toEqual(['Lead', 'Lead', 'Qualified', 'Customer']);
    await userEvent.click(screen.getByRole('button', { name: 'Status' }));
    expect(columnText(5)).toEqual(['Customer', 'Qualified', 'Lead', 'Lead']);
  });

  test('clicking a row opens the contact, but the email link does not (UI-TBL-03)', async () => {
    setup();
    await renderLoaded();
    const link = screen.getByRole('link', { name: 'maria@acme.example' });
    link.addEventListener('click', (event) => event.preventDefault());
    await userEvent.click(link);
    expect(currentPath()).toBe('/contacts');
    await userEvent.click(screen.getByText('Tom Becker'));
    expect(currentPath()).toBe('/contacts/2');
  });

  test('New contact and Edit open the contact form', async () => {
    setup();
    await renderLoaded();
    await userEvent.click(screen.getByRole('button', { name: 'New contact' }));
    expect(await screen.findByRole('dialog', { name: 'New contact' })).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Edit Tom Becker' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit contact' });
    expect((within(dialog).getByLabelText(/^Name/) as HTMLInputElement).value).toBe('Tom Becker');
  });

  test('Delete asks what will happen first (UI-DEL-01)', async () => {
    setup({ '/api/contacts/2/delete-impact': { name: 'Tom Becker', activities: 1, deals: 0 } });
    await renderLoaded();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Tom Becker' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete Tom Becker?' });
    expect(
      within(dialog).getByText("1 activity logged with this contact will be deleted. This can't be undone."),
    ).toBeTruthy();
  });

  test('with no contacts, says so and offers New contact (UI-EMPTY-01)', async () => {
    setup({ '/api/contacts': [] });
    renderPage(<ContactsPage />, '/contacts');
    expect(await screen.findByText('No contacts yet')).toBeTruthy();
    expect(chip(/^All/).textContent).toBe('All 0');
  });

  test('a failed load shows an error with Try again (UI-ERR-01)', async () => {
    setup({ '/api/contacts': failThenAnswer(1, contacts) });
    renderPage(<ContactsPage />, '/contacts');
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain("Couldn't load the contacts.");
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Maria Lopez')).toBeTruthy();
  });
});
