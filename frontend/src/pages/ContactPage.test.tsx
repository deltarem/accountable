import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';

import type { ContactDetail, TimelineEntry } from '../api/types';
import { TODAY, entry, notFound, renderRecordPage, serverError } from '../test/recordHelpers';
import { mockFetch } from '../test/utils';
import { ContactPage } from './ContactPage';

const maria: ContactDetail = {
  id: 9,
  name: 'Maria Lopez',
  email: 'maria@northwind.example',
  phone: '+1 555 0100',
  job_title: 'Head of Ops',
  organization_id: 1,
  organization_name: 'Northwind Traders',
  status: 'customer',
  created_at: '2026-02-01T09:00:00',
  updated_at: '2026-11-01T09:00:00',
  created_by_name: null,
  updated_by_name: null,
  deals: [
    {
      id: 20,
      name: 'Northwind renewal',
      stage: 'negotiation',
      value_cents: 1_250_000,
      organization_name: 'Northwind Traders',
    },
    { id: 21, name: 'Side project', stage: 'new', value_cents: 300_000, organization_name: null },
  ],
  timeline: [
    entry({
      key: 'activity-3',
      id: 3,
      type: 'call',
      description: 'Agreed a two-year term',
      occurred_at: '2026-11-22T16:45:00',
      deal_id: 20,
      source: { kind: 'deal', id: 20, name: 'Northwind renewal' },
    }),
    entry({
      key: 'status-1',
      kind: 'status_change',
      id: 1,
      type: null,
      description: null,
      from_value: 'qualified',
      to_value: 'customer',
      occurred_at: '2026-11-20T09:00:00',
      deal_id: null,
      contact_id: 9,
    }),
  ],
};

const aisha: ContactDetail = {
  ...maria,
  id: 12,
  name: 'Aisha Khan',
  email: null,
  phone: null,
  job_title: null,
  organization_id: null,
  organization_name: null,
  status: 'lead',
  deals: [],
  timeline: [],
};

function renderPage(id = 9) {
  return renderRecordPage(<ContactPage />, '/contacts/:id', `/contacts/${id}`);
}

function common() {
  return {
    '/api/today': TODAY,
    '/api/organizations': [{ id: 1, name: 'Northwind Traders' }],
    '/api/contacts': [maria, aisha],
  };
}

describe('ContactPage (UI-REC-03)', () => {
  test('shows the status, organization link, job title, email and phone', async () => {
    mockFetch({ ...common(), '/api/contacts/9': maria });
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Maria Lopez' })).toBeTruthy();
    const summary = screen.getByRole('region', { name: 'Summary' });
    expect(within(summary).getByText('Customer')).toBeTruthy();
    expect(within(summary).getByRole('link', { name: 'Northwind Traders' }).getAttribute('href')).toBe(
      '/organizations/1',
    );
    expect(summary.textContent).toContain('Job titleHead of Ops');
    expect(within(summary).getByRole('link', { name: 'maria@northwind.example' }).getAttribute('href')).toBe(
      'mailto:maria@northwind.example',
    );
    expect(summary.textContent).toContain('Phone+1 555 0100');
  });

  test('lists the deals where they are the main contact', async () => {
    mockFetch({ ...common(), '/api/contacts/9': maria });
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Maria Lopez' });
    const deals = screen.getByRole('region', { name: 'Deals as main contact' });
    expect(
      within(deals)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Northwind renewalNorthwind TradersNegotiation$12.500,00', 'Side projectNo organizationNew$3.000,00']);
    expect(within(deals).getByRole('link', { name: 'Side project' }).getAttribute('href')).toBe('/deals/21');
  });

  test('the timeline has Log activity at the top and shows rolled-up deal entries (TL-02)', async () => {
    mockFetch({ ...common(), '/api/contacts/9': maria });
    renderPage();
    expect(await screen.findByRole('form', { name: 'Log activity' })).toBeTruthy();
    const rows = screen.getAllByTestId('timeline-entry');
    expect(rows[0].textContent).toContain('Call: Agreed a two-year term');
    expect(within(rows[0]).getByRole('link', { name: 'Northwind renewal' }).getAttribute('href')).toBe('/deals/20');
    expect(rows[1].textContent).toContain('Status changed from Qualified to Customer');
  });

  test('a contact with only a name shows "No organization" and leaves out the rest (UI-EMPTY-04)', async () => {
    mockFetch({ ...common(), '/api/contacts/12': aisha });
    renderPage(12);
    await screen.findByRole('heading', { level: 1, name: 'Aisha Khan' });
    const summary = screen.getByRole('region', { name: 'Summary' });
    expect(summary.textContent).toContain('OrganizationNo organization');
    expect(within(summary).getByText('Lead')).toBeTruthy();
    for (const label of ['Job title', 'Email', 'Phone']) expect(summary.textContent).not.toContain(label);
    expect(screen.getByText('No deals with this contact yet')).toBeTruthy();
    expect(screen.getByText('Nothing here yet. Log a call, email or note to start the history.')).toBeTruthy();
  });

  test('logging an activity adds it to the top of the timeline (UI-REC-05)', async () => {
    let current: ContactDetail = { ...maria };
    let posted: Record<string, unknown> | null = null;
    mockFetch({
      ...common(),
      '/api/contacts/9': () => current,
      'POST /api/activities': (init?: RequestInit) => {
        posted = JSON.parse(String(init?.body));
        const logged: TimelineEntry = entry({
          key: 'activity-50',
          id: 50,
          type: 'note',
          description: 'Asked for the price list',
          occurred_at: '2026-11-23T14:05:00',
          deal_id: null,
          contact_id: 9,
        });
        current = { ...maria, timeline: [logged, ...maria.timeline] };
        return { id: 50 };
      },
    });
    renderPage();
    const form = await screen.findByRole('form', { name: 'Log activity' });
    await waitFor(() =>
      expect((within(form).getByLabelText(/When/) as HTMLInputElement).value).toBe('2026-11-23T14:05'),
    );
    await userEvent.type(within(form).getByLabelText(/What happened/), 'Asked for the price list');
    await userEvent.click(within(form).getByRole('button', { name: 'Log it' }));
    await waitFor(() => expect(screen.getAllByTestId('timeline-entry')).toHaveLength(3));
    expect(screen.getAllByTestId('timeline-entry')[0].textContent).toContain('Note: Asked for the price list');
    expect(posted).toMatchObject({ contact_id: 9, deal_id: null, description: 'Asked for the price list' });
  });

  test('while loading, it shows placeholders and no buttons or form (UI-EMPTY-05)', () => {
    mockFetch({ ...common(), '/api/contacts/9': new Promise(() => {}) });
    renderPage();
    const summary = screen.getByRole('region', { name: 'Summary' });
    expect(within(summary).getAllByTestId('skeleton').length).toBeGreaterThan(0);
    expect(within(summary).queryByRole('button')).toBeNull();
    expect(screen.queryByRole('button', { name: 'New deal with this contact' })).toBeNull();
    expect(screen.queryByRole('form', { name: 'Log activity' })).toBeNull();
  });

  test('while loading, the deals list does not claim to be empty (UI-EMPTY-05)', () => {
    mockFetch({ ...common(), '/api/contacts/9': new Promise(() => {}) });
    renderPage();
    expect(screen.queryByText('No deals with this contact yet')).toBeNull();
  });

  test('a contact that does not exist says so, with a way back', async () => {
    mockFetch({ ...common(), '/api/contacts/99': () => notFound('Contact') });
    renderPage(99);
    expect(await screen.findByText("That contact doesn't exist. It may have been deleted.")).toBeTruthy();
    await userEvent.click(screen.getByRole('link', { name: 'Back to the list' }));
    expect(await screen.findByRole('heading', { name: 'Contacts list' })).toBeTruthy();
  });

  test('a failed load shows an error with Try again, which loads it (UI-ERR-01)', async () => {
    let calls = 0;
    mockFetch({
      ...common(),
      '/api/contacts/9': () => {
        calls += 1;
        return calls === 1 ? serverError() : maria;
      },
    });
    renderPage();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain("Couldn't load the contact.");
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Maria Lopez' })).toBeTruthy();
  });

  test('the back link returns to the list (UI-REC-01)', async () => {
    mockFetch({ ...common(), '/api/contacts/9': maria });
    renderPage();
    await userEvent.click(screen.getByRole('link', { name: 'Contacts' }));
    expect(screen.getByTestId('location').textContent).toBe('/contacts');
  });

  test('Edit opens the contact form with its values', async () => {
    mockFetch({ ...common(), '/api/contacts/9': maria });
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Maria Lopez' });
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit contact' });
    expect(within(dialog).getByDisplayValue('maria@northwind.example')).toBeTruthy();
  });

  test('New deal starts the form with this contact and their organization filled in', async () => {
    mockFetch({ ...common(), '/api/contacts/9': maria });
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Maria Lopez' });
    await userEvent.click(screen.getByRole('button', { name: 'New deal with this contact' }));
    const dialog = await screen.findByRole('dialog', { name: 'New deal' });
    await waitFor(() => {
      expect(within(dialog).getByRole('combobox', { name: 'Organization' }).textContent).toContain('Northwind Traders');
      expect(within(dialog).getByRole('combobox', { name: 'Main contact' }).textContent).toContain('Maria Lopez');
    });
  });

  test('Delete says what will happen, then deletes and goes back to the list (UI-DEL-01, UI-DEL-03)', async () => {
    mockFetch({
      ...common(),
      '/api/contacts/9': maria,
      '/api/contacts/9/delete-impact': { name: 'Maria Lopez', activities: 4, deals: 2 },
      'DELETE /api/contacts/9': new Response(null, { status: 204 }),
    });
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Maria Lopez' });
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete Maria Lopez?' });
    expect(dialog.textContent).toContain(
      "4 activities logged with this contact will be deleted. 2 deals will be kept, with no main contact. This can't be undone.",
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('heading', { name: 'Contacts list' })).toBeTruthy();
    expect(screen.getByText('Contact deleted')).toBeTruthy();
  });
});
