import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';

import type { OrganizationDetail } from '../api/types';
import { TODAY, entry, notFound, renderRecordPage, serverError } from '../test/recordHelpers';
import { mockFetch } from '../test/utils';
import { OrganizationPage } from './OrganizationPage';

const org: OrganizationDetail = {
  id: 1,
  name: 'Northwind Traders',
  website: 'https://northwind.example/',
  industry: 'Logistics',
  notes: 'Prefers email.\nQuarterly review in March.',
  contact_count: 2,
  open_deal_count: 1,
  open_value_cents: 1_250_000,
  created_at: '2026-01-10T09:00:00',
  updated_at: '2026-11-01T09:00:00',
  contacts: [
    { id: 10, name: 'Maria Lopez', job_title: 'Head of Ops', status: 'customer' },
    { id: 11, name: 'Tom Becker', job_title: null, status: 'lead' },
  ],
  deals: [{ id: 20, name: 'Northwind renewal', stage: 'proposal', value_cents: 1_250_000 }],
  timeline: [
    entry({
      key: 'activity-2',
      id: 2,
      type: 'call',
      description: 'Agreed a two-year term',
      occurred_at: '2026-11-22T16:45:00',
      deal_id: 20,
      source: { kind: 'deal', id: 20, name: 'Northwind renewal' },
    }),
    entry({
      key: 'activity-1',
      id: 1,
      type: 'email',
      description: 'Sent the brochure',
      occurred_at: '2026-11-18T11:00:00',
      deal_id: null,
      contact_id: 10,
      source: { kind: 'contact', id: 10, name: 'Maria Lopez' },
    }),
  ],
};

const bare: OrganizationDetail = {
  ...org,
  id: 2,
  name: 'Initech',
  website: null,
  industry: null,
  notes: null,
  open_value_cents: 0,
  contacts: [],
  deals: [],
  timeline: [],
};

function renderPage(id = 1) {
  return renderRecordPage(<OrganizationPage />, '/organizations/:id', `/organizations/${id}`);
}

function common() {
  return {
    '/api/today': TODAY,
    '/api/industries': ['Logistics'],
    '/api/organizations': [org, bare],
    '/api/contacts': [],
  };
}

describe('OrganizationPage (UI-REC-02)', () => {
  test('shows the name, facts, contacts, deals and timeline', async () => {
    mockFetch({ ...common(), '/api/organizations/1': org });
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Northwind Traders' })).toBeTruthy();

    const summary = screen.getByRole('region', { name: 'Summary' });
    expect(summary.textContent).toContain('IndustryLogistics');
    const website = within(summary).getByRole('link', { name: 'northwind.example' });
    expect(website.getAttribute('href')).toBe('https://northwind.example/');
    expect(website.getAttribute('target')).toBe('_blank');
    expect(summary.textContent).toContain('Open value$12.500,00');
    expect(within(summary).getByText(/Prefers email\./).textContent).toBe('Prefers email.\nQuarterly review in March.');

    const contacts = screen.getByRole('region', { name: 'Contacts' });
    expect(
      within(contacts)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Maria LopezHead of OpsCustomer', 'Tom BeckerLead']);
    expect(within(contacts).getByRole('link', { name: 'Maria Lopez' }).getAttribute('href')).toBe('/contacts/10');

    const deals = screen.getByRole('region', { name: 'Deals' });
    expect(within(deals).getByRole('listitem').textContent).toBe('Northwind renewalProposal$12.500,00');
    expect(within(deals).getByRole('link', { name: 'Northwind renewal' }).getAttribute('href')).toBe('/deals/20');

    expect(screen.getByText('Activity on its contacts and deals')).toBeTruthy();
  });

  test('its timeline says which contact or deal each entry came from, with no log form (TL-03, UI-REC-07)', async () => {
    mockFetch({ ...common(), '/api/organizations/1': org });
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Northwind Traders' });
    const rows = screen.getAllByTestId('timeline-entry');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Call: Agreed a two-year term');
    expect(rows[0].textContent).toContain('on deal Northwind renewal');
    expect(rows[1].textContent).toContain('Email: Sent the brochure');
    expect(rows[1].textContent).toContain('with Maria Lopez');
    expect(screen.queryByRole('form', { name: 'Log activity' })).toBeNull();
  });

  test('facts that are not set say so, and empty lists say they are empty (UI-EMPTY-04)', async () => {
    mockFetch({ ...common(), '/api/organizations/2': bare });
    renderPage(2);
    await screen.findByRole('heading', { level: 1, name: 'Initech' });
    const summary = screen.getByRole('region', { name: 'Summary' });
    expect(summary.textContent).toContain('IndustryNot set');
    expect(summary.textContent).toContain('WebsiteNot set');
    expect(summary.textContent).toContain('Open value$0,00');
    expect(summary.textContent).not.toContain('Notes');
    expect(within(screen.getByRole('region', { name: 'Contacts' })).getByText('No contacts yet')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Deals' })).getByText('No deals yet')).toBeTruthy();
    expect(screen.getByText('Nothing here yet. Log a call, email or note to start the history.')).toBeTruthy();
  });

  test('while loading, it shows placeholders and no buttons (UI-EMPTY-05)', () => {
    mockFetch({ ...common(), '/api/organizations/1': new Promise(() => {}) });
    renderPage();
    const summary = screen.getByRole('region', { name: 'Summary' });
    expect(within(summary).getAllByTestId('skeleton').length).toBeGreaterThan(0);
    expect(within(summary).queryByRole('button')).toBeNull();
    expect(screen.queryByRole('button', { name: 'New contact at this organization' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'New deal with this organization' })).toBeNull();
    expect(screen.queryByTestId('timeline-entry')).toBeNull();
  });

  test('while loading, the linked lists do not claim to be empty (UI-EMPTY-05)', () => {
    mockFetch({ ...common(), '/api/organizations/1': new Promise(() => {}) });
    renderPage();
    expect(screen.queryByText('No contacts yet')).toBeNull();
    expect(screen.queryByText('No deals yet')).toBeNull();
  });

  test('the back link returns to the list (UI-REC-01)', async () => {
    mockFetch({ ...common(), '/api/organizations/1': org });
    renderPage();
    await userEvent.click(screen.getByRole('link', { name: 'Organizations' }));
    expect(await screen.findByRole('heading', { name: 'Organizations list' })).toBeTruthy();
  });

  test('an organization that does not exist says so, with a way back', async () => {
    mockFetch({ ...common(), '/api/organizations/99': () => notFound('Organization') });
    renderPage(99);
    expect(await screen.findByText("That organization doesn't exist. It may have been deleted.")).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Summary' })).toBeNull();
    await userEvent.click(screen.getByRole('link', { name: 'Back to the list' }));
    expect(screen.getByTestId('location').textContent).toBe('/organizations');
  });

  test('a failed load shows an error with Try again, which loads it (UI-ERR-01)', async () => {
    let calls = 0;
    mockFetch({
      ...common(),
      '/api/organizations/1': () => {
        calls += 1;
        return calls === 1 ? serverError() : org;
      },
    });
    renderPage();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain("Couldn't load the organization.");
    expect(screen.getByRole('link', { name: 'Organizations' })).toBeTruthy();
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Northwind Traders' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('Edit opens the organization form with its values', async () => {
    mockFetch({ ...common(), '/api/organizations/1': org });
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Northwind Traders' });
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit organization' });
    expect(within(dialog).getByDisplayValue('Northwind Traders')).toBeTruthy();
  });

  test('New contact and New deal start the form with this organization filled in', async () => {
    mockFetch({ ...common(), '/api/organizations/1': org });
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Northwind Traders' });

    await userEvent.click(screen.getByRole('button', { name: 'New contact at this organization' }));
    let dialog = await screen.findByRole('dialog', { name: 'New contact' });
    await waitFor(() =>
      expect(within(dialog).getByRole('combobox', { name: 'Organization' }).textContent).toContain('Northwind Traders'),
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await userEvent.click(screen.getByRole('button', { name: 'New deal with this organization' }));
    dialog = await screen.findByRole('dialog', { name: 'New deal' });
    await waitFor(() =>
      expect(within(dialog).getByRole('combobox', { name: 'Organization' }).textContent).toContain('Northwind Traders'),
    );
  });

  test('Delete says what will happen, then deletes and goes back to the list (UI-DEL-01, UI-DEL-03)', async () => {
    const fetch = mockFetch({
      ...common(),
      '/api/organizations/1': org,
      '/api/organizations/1/delete-impact': { name: 'Northwind Traders', contacts: 2, deals: 1 },
      'DELETE /api/organizations/1': new Response(null, { status: 204 }),
    });
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Northwind Traders' });
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete Northwind Traders?' });
    expect(
      within(dialog).getByText("Its 2 contacts and 1 deal will be kept, with no organization. This can't be undone."),
    ).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('heading', { name: 'Organizations list' })).toBeTruthy();
    expect(screen.getByText('Organization deleted')).toBeTruthy();
    expect(fetch.mock.calls.some(([url, init]) => url === '/api/organizations/1' && init?.method === 'DELETE')).toBe(
      true,
    );
  });
});
