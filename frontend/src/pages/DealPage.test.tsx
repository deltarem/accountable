import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';

import type { DealDetail } from '../api/types';
import { TODAY, entry, notFound, renderRecordPage, serverError } from '../test/recordHelpers';
import { mockFetch } from '../test/utils';
import { DealPage } from './DealPage';

const renewal: DealDetail = {
  id: 20,
  name: 'Northwind renewal',
  organization_id: 1,
  organization_name: 'Northwind Traders',
  contact_id: 9,
  contact_name: 'Maria Lopez',
  stage: 'negotiation',
  value_cents: 1_250_000,
  probability: 75,
  close_date: '2026-11-15',
  position: 0,
  late: true,
  expected_cents: 937_500,
  created_at: '2026-03-04T10:00:00',
  updated_at: '2026-11-01T10:00:00',
  created_by_name: null,
  updated_by_name: null,
  timeline: [
    entry({
      key: 'activity-3',
      id: 3,
      type: 'call',
      description: 'Agreed a two-year term',
      occurred_at: '2026-11-22T16:45:00',
      deal_id: 20,
      follow_up_date: '2026-11-20',
    }),
    entry({
      key: 'event-1',
      kind: 'stage_change',
      id: 1,
      type: null,
      description: null,
      from_value: 'proposal',
      to_value: 'negotiation',
      occurred_at: '2026-11-10T09:00:00',
    }),
  ],
};

const wonAlone: DealDetail = {
  ...renewal,
  id: 21,
  name: 'One-off audit',
  organization_id: null,
  organization_name: null,
  contact_id: null,
  contact_name: null,
  stage: 'won',
  probability: 100,
  close_date: null,
  late: false,
  expected_cents: 1_250_000,
  timeline: [],
};

function renderPage(id = 20) {
  return renderRecordPage(<DealPage />, '/deals/:id', `/deals/${id}`);
}

function common() {
  return {
    '/api/today': TODAY,
    '/api/organizations': [{ id: 1, name: 'Northwind Traders' }],
    '/api/contacts': [
      { id: 9, name: 'Maria Lopez', organization_id: 1, organization_name: 'Northwind Traders', status: 'customer' },
    ],
  };
}

function detail(label: string) {
  const term = screen.getAllByRole('term').find((t) => t.textContent === label);
  return term?.nextElementSibling;
}

describe('DealPage (UI-REC-04)', () => {
  test('the header shows stage, value, probability, expected revenue and a late close date', async () => {
    mockFetch({ ...common(), '/api/deals/20': renewal });
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Northwind renewal' })).toBeTruthy();
    const summary = screen.getByRole('region', { name: 'Summary' });
    expect(within(summary).getByText('Negotiation')).toBeTruthy();
    expect(summary.textContent).toContain('Value$12.500,00');
    expect(summary.textContent).toContain('Probability75%');
    expect(summary.textContent).toContain('Expected$9.375,00');
    expect(summary.textContent).toContain('Close date15 Nov 2026 Late');
    expect(within(summary).getByText('Late')).toBeTruthy();
  });

  test('the details list links the organization and main contact', async () => {
    mockFetch({ ...common(), '/api/deals/20': renewal });
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Northwind renewal' });
    expect(screen.getAllByRole('term').map((t) => t.textContent)).toEqual([
      'Organization',
      'Main contact',
      'Stage',
      'Value',
      'Probability',
      'Expected revenue',
      'Close date',
    ]);
    expect(
      within(detail('Organization') as HTMLElement)
        .getByRole('link')
        .getAttribute('href'),
    ).toBe('/organizations/1');
    expect(detail('Organization')?.textContent).toBe('Northwind Traders');
    expect(
      within(detail('Main contact') as HTMLElement)
        .getByRole('link')
        .getAttribute('href'),
    ).toBe('/contacts/9');
    expect(detail('Main contact')?.textContent).toBe('Maria Lopez');
    expect(detail('Stage')?.textContent).toBe('Negotiation');
    expect(detail('Expected revenue')?.textContent).toBe('$9.375,00');
    expect(detail('Close date')?.textContent).toBe('15 Nov 2026 Late');
  });

  test('the header ends with who added it and who last changed it, in place of "Created" (UI-WHO-01)', async () => {
    mockFetch({
      ...common(),
      '/api/deals/20': { ...renewal, created_by_name: 'Priya Shah', updated_by_name: 'Sam Lee' },
    });
    renderPage();
    expect((await screen.findByTestId('who')).textContent).toBe(
      'Added by Priya Shah on 4 Mar 2026 · Last changed by Sam Lee on 1 Nov 2026',
    );
  });

  test('sample data reads "Sample data"', async () => {
    mockFetch({ ...common(), '/api/deals/20': renewal });
    renderPage();
    expect((await screen.findByTestId('who')).textContent).toBe('Added by Sample data on 4 Mar 2026');
  });

  test('a closed deal with no organization, contact or close date says so (RULE-07)', async () => {
    mockFetch({ ...common(), '/api/deals/21': wonAlone });
    renderPage(21);
    await screen.findByRole('heading', { level: 1, name: 'One-off audit' });
    const summary = screen.getByRole('region', { name: 'Summary' });
    expect(summary.textContent).toContain('Expected-');
    expect(summary.textContent).toContain('Close dateNot set');
    expect(within(summary).queryByText('Late')).toBeNull();
    expect(detail('Organization')?.textContent).toBe('No organization');
    expect(detail('Main contact')?.textContent).toBe('No main contact');
    expect(detail('Expected revenue')?.textContent).toBe('$0,00');
    expect(detail('Close date')?.textContent).toBe('Not set');
  });

  test('a close date that is not late has no Late badge', async () => {
    mockFetch({ ...common(), '/api/deals/20': { ...renewal, close_date: '2026-12-15', late: false } });
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Northwind renewal' });
    expect(screen.getByRole('region', { name: 'Summary' }).textContent).toContain('Close date15 Dec 2026');
    expect(screen.queryByText('Late')).toBeNull();
  });

  test('the timeline has Log activity at the top, then its activities and stage changes (TL-01)', async () => {
    mockFetch({ ...common(), '/api/deals/20': renewal });
    renderPage();
    expect(await screen.findByRole('form', { name: 'Log activity' })).toBeTruthy();
    const rows = screen.getAllByTestId('timeline-entry');
    expect(rows[0].textContent).toContain('Call: Agreed a two-year term');
    expect(await within(rows[0]).findByText('3 days overdue')).toBeTruthy();
    expect(rows[1].textContent).toContain('Moved from Proposal to Negotiation');
  });

  test('ticking a follow-up done saves it and refreshes the deal', async () => {
    let current: DealDetail = renewal;
    mockFetch({
      ...common(),
      '/api/deals/20': () => current,
      'POST /api/activities/3/done': () => {
        current = { ...renewal, timeline: [{ ...renewal.timeline[0], follow_up_done: true }, renewal.timeline[1]] };
        return { id: 3, follow_up_done: true };
      },
    });
    renderPage();
    const box = (await screen.findByRole('checkbox', { name: 'Done' })) as HTMLInputElement;
    await screen.findByText('3 days overdue');
    await userEvent.click(box);
    expect(box.checked).toBe(true);
    await waitFor(() => expect(screen.queryByText('3 days overdue')).toBeNull());
    expect((screen.getByRole('checkbox', { name: 'Done' }) as HTMLInputElement).checked).toBe(true);
  });

  test('while loading, the header shows placeholders and there is nothing to act on (UI-EMPTY-05)', () => {
    mockFetch({ ...common(), '/api/deals/20': new Promise(() => {}) });
    renderPage();
    const summary = screen.getByRole('region', { name: 'Summary' });
    expect(within(summary).getAllByTestId('skeleton').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('form', { name: 'Log activity' })).toBeNull();
    expect(screen.queryByRole('term')).toBeNull();
  });

  test('a deal that does not exist says so, with a way back', async () => {
    mockFetch({ ...common(), '/api/deals/99': () => notFound('Deal') });
    renderPage(99);
    expect(await screen.findByText("That deal doesn't exist. It may have been deleted.")).toBeTruthy();
    await userEvent.click(screen.getByRole('link', { name: 'Back to the list' }));
    expect(await screen.findByRole('heading', { name: 'Deals list' })).toBeTruthy();
  });

  test('a failed load shows an error with Try again, which loads it (UI-ERR-01)', async () => {
    let calls = 0;
    mockFetch({
      ...common(),
      '/api/deals/20': () => {
        calls += 1;
        return calls === 1 ? serverError() : renewal;
      },
    });
    renderPage();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain("Couldn't load the deal.");
    expect(screen.queryByText("That deal doesn't exist. It may have been deleted.")).toBeNull();
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Northwind renewal' })).toBeTruthy();
  });

  test('the back link returns to the list (UI-REC-01)', async () => {
    mockFetch({ ...common(), '/api/deals/20': renewal });
    renderPage();
    await userEvent.click(screen.getByRole('link', { name: 'Deals' }));
    expect(screen.getByTestId('location').textContent).toBe('/deals');
  });

  test('Edit opens the deal form with its values', async () => {
    mockFetch({ ...common(), '/api/deals/20': renewal });
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Northwind renewal' });
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit deal' });
    expect(within(dialog).getByDisplayValue('Northwind renewal')).toBeTruthy();
  });

  test('Delete says what will happen, then deletes and goes back to the list (UI-DEL-01, UI-DEL-03)', async () => {
    mockFetch({
      ...common(),
      '/api/deals/20': renewal,
      '/api/deals/20/delete-impact': { name: 'Northwind renewal', activities: 5, events: 2 },
      'DELETE /api/deals/20': new Response(null, { status: 204 }),
    });
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Northwind renewal' });
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete Northwind renewal?' });
    expect(dialog.textContent).toContain(
      "Its 5 activities and its stage history will be deleted. This can't be undone.",
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('heading', { name: 'Deals list' })).toBeTruthy();
    expect(screen.getByText('Deal deleted')).toBeTruthy();
  });
});
