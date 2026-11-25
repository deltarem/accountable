import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';

import { TODAY, entry, renderWithForms } from '../../test/recordHelpers';
import { mockFetch, renderWithProviders } from '../../test/utils';
import { RecordLink, Timeline, entryIcon, entryText } from './Timeline';

const call = entry({ key: 'activity-1', id: 1, type: 'call', description: 'Agreed a two-year term' });
const email = entry({ key: 'activity-2', id: 2, type: 'email', description: 'Sent the contract' });
const note = entry({ key: 'activity-3', id: 3, type: 'note', description: 'Prefers mornings' });
const stageChange = entry({
  key: 'event-1',
  kind: 'stage_change',
  id: 1,
  type: null,
  description: null,
  from_value: 'proposal',
  to_value: 'negotiation',
});
const statusChange = entry({
  key: 'status-1',
  kind: 'status_change',
  id: 2,
  type: null,
  description: null,
  from_value: 'qualified',
  to_value: 'customer',
});

describe('entryText (UI-REC-06)', () => {
  test('activities read as their type and description', () => {
    expect(entryText(call)).toBe('Call: Agreed a two-year term');
    expect(entryText(email)).toBe('Email: Sent the contract');
    expect(entryText(note)).toBe('Note: Prefers mornings');
  });

  test('an activity with no type or description still reads as a note', () => {
    expect(entryText(entry({ type: null, description: null }))).toBe('Note: ');
  });

  test('stage and status changes name both ends', () => {
    expect(entryText(stageChange)).toBe('Moved from Proposal to Negotiation');
    expect(entryText(statusChange)).toBe('Status changed from Qualified to Customer');
  });

  test('a change with missing ends falls back to the first stage and status', () => {
    expect(entryText({ ...stageChange, from_value: null, to_value: null })).toBe('Moved from New to New');
    expect(entryText({ ...statusChange, from_value: null, to_value: null })).toBe('Status changed from Lead to Lead');
  });
});

describe('entryIcon (UI-REC-06)', () => {
  test('each kind has its colour: note Midnight, call Cerulean, email Coral, status Sea Green', () => {
    expect(entryIcon(note)).toMatchObject({ bg: 'var(--strong)', fg: 'var(--on-strong)' });
    expect(entryIcon(call)).toMatchObject({ bg: 'var(--cerulean)', fg: 'var(--on-solid)' });
    expect(entryIcon(email)).toMatchObject({ bg: 'var(--coral)', fg: 'var(--on-bright)' });
    expect(entryIcon(statusChange)).toMatchObject({ bg: 'var(--sea)', fg: 'var(--on-bright)' });
  });

  test('a stage change takes the new stage colour', () => {
    expect(entryIcon(stageChange)).toMatchObject({
      bg: 'var(--stage-negotiation)',
      fg: 'var(--stage-negotiation-ink)',
    });
    expect(entryIcon({ ...stageChange, to_value: 'won' })).toMatchObject({
      bg: 'var(--stage-won)',
      fg: 'var(--stage-won-ink)',
    });
    expect(entryIcon({ ...stageChange, to_value: null })).toMatchObject({ bg: 'var(--stage-new)' });
  });

  test('every kind gets a different icon', () => {
    const icons = new Set([note, call, email, stageChange, statusChange].map((e) => entryIcon(e).Icon));
    expect(icons.size).toBe(5);
  });
});

describe('RecordLink (TL-04)', () => {
  test('a deal reads "on deal" and a contact "with", each as a link', () => {
    renderWithProviders(
      <>
        <RecordLink record={{ kind: 'deal', id: 5, name: 'Acme renewal' }} />
        <RecordLink record={{ kind: 'contact', id: 9, name: 'Maria Lopez' }} />
        <RecordLink record={{ kind: 'contact', id: 10, name: 'Tom Becker' }} prefix={false} />
      </>,
    );
    expect(screen.getByText('on deal', { exact: false }).textContent).toBe('on deal Acme renewal');
    expect(screen.getByRole('link', { name: 'Acme renewal' }).getAttribute('href')).toBe('/deals/5');
    expect(screen.getByText('with', { exact: false }).textContent).toBe('with Maria Lopez');
    expect(screen.getByRole('link', { name: 'Maria Lopez' }).getAttribute('href')).toBe('/contacts/9');
    const bare = screen.getByRole('link', { name: 'Tom Becker' });
    expect(bare.parentElement?.textContent).toBe('Tom Becker');
  });
});

describe('Timeline', () => {
  test('while loading, it shows placeholder rows and no entries (UI-EMPTY-05)', () => {
    mockFetch({ '/api/today': TODAY });
    renderWithForms(<Timeline entries={undefined} loading />);
    expect(screen.getAllByTestId('skeleton').length).toBe(12);
    expect(screen.queryByTestId('timeline-entry')).toBeNull();
  });

  test('with no entries it invites logging the first one (UI-EMPTY-04)', () => {
    mockFetch({ '/api/today': TODAY });
    const { unmount } = renderWithForms(<Timeline entries={[]} />);
    expect(screen.getByText('Nothing here yet. Log a call, email or note to start the history.')).toBeTruthy();
    unmount();
    renderWithForms(<Timeline entries={undefined} />);
    expect(screen.getByText('Nothing here yet. Log a call, email or note to start the history.')).toBeTruthy();
  });

  test('shows the entries in the order given, with text, date, source and who made it (TL-04, UI-WHO-02)', () => {
    mockFetch({ '/api/today': TODAY });
    renderWithForms(
      <Timeline
        entries={[
          {
            ...call,
            occurred_at: '2026-11-22T16:45:00',
            source: { kind: 'deal', id: 5, name: 'Acme renewal' },
            created_by_name: 'Priya Shah',
          },
          { ...stageChange, occurred_at: '2026-11-21T09:00:00', created_by_name: 'Sam Lee' },
          { ...statusChange, occurred_at: '2026-11-20T08:15:00', source: { kind: 'contact', id: 9, name: 'Maria' } },
        ]}
      />,
    );
    const rows = screen.getAllByTestId('timeline-entry');
    expect(rows.map((row) => row.querySelector('p')?.textContent)).toEqual([
      'Call: Agreed a two-year term',
      'Moved from Proposal to Negotiation',
      'Status changed from Qualified to Customer',
    ]);
    expect(rows[0].textContent).toContain('22 Nov 2026, 16:45 · on deal Acme renewal · Priya Shah');
    expect(rows[1].textContent).toContain('21 Nov 2026, 09:00 · Sam Lee');
    expect(rows[2].textContent).toContain('20 Nov 2026, 08:15 · with Maria · Sample data');
  });

  test('only activities have the Edit and Delete menu (UI-REC-06)', () => {
    mockFetch({ '/api/today': TODAY });
    renderWithForms(<Timeline entries={[call, stageChange, statusChange]} />);
    expect(screen.getAllByRole('button', { name: /^Actions for/ })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Actions for Call: Agreed a two-year term' })).toBeTruthy();
  });

  test('a passed follow-up says how overdue it is, with a Done box (UI-REC-06)', async () => {
    mockFetch({ '/api/today': TODAY });
    renderWithForms(<Timeline entries={[{ ...call, follow_up_date: '2026-11-20' }]} />);
    const row = screen.getByTestId('timeline-entry');
    expect(row.textContent).toContain('Follow-up 20 Nov 2026');
    expect(await within(row).findByText('3 days overdue')).toBeTruthy();
    const box = within(row).getByRole('checkbox', { name: 'Done' }) as HTMLInputElement;
    expect(box.checked).toBe(false);
  });

  test('only a passed follow-up that is not done is marked overdue', async () => {
    mockFetch({ '/api/today': TODAY });
    renderWithForms(
      <Timeline
        entries={[
          { ...call, follow_up_date: '2026-11-20', follow_up_done: true },
          { ...email, follow_up_date: '2026-11-23' },
          { ...note, follow_up_date: '2026-11-30' },
          entry({ key: 'activity-4', id: 4, description: 'Chase the invoice', follow_up_date: '2026-11-22' }),
        ]}
      />,
    );
    const boxes = screen.getAllByRole('checkbox', { name: 'Done' }) as HTMLInputElement[];
    expect(boxes.map((b) => b.checked)).toEqual([true, false, false, false]);
    expect(await screen.findByText('1 day overdue')).toBeTruthy();
    expect(screen.getAllByText(/overdue/)).toHaveLength(1);
    expect(screen.getAllByTestId('timeline-entry')[3].textContent).toContain('1 day overdue');
  });

  test('a follow-up is not marked overdue before today arrives from the server', () => {
    mockFetch({ '/api/today': new Promise(() => {}) });
    renderWithForms(<Timeline entries={[{ ...call, follow_up_date: '2026-11-20' }]} />);
    expect(screen.getByText('20 Nov 2026')).toBeTruthy();
    expect(screen.queryByText(/overdue/)).toBeNull();
  });

  test('a follow-up with no description still has its Done box', () => {
    mockFetch({ '/api/today': TODAY });
    renderWithForms(<Timeline entries={[{ ...call, description: null, follow_up_date: '2026-11-30' }]} />);
    expect(screen.getByText('Call:')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Done' })).toBeTruthy();
  });

  test('an activity without a follow-up has no Done box', () => {
    mockFetch({ '/api/today': TODAY });
    renderWithForms(<Timeline entries={[call]} />);
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByText(/Follow-up/)).toBeNull();
  });

  test('Edit in the menu opens the activity form with its values', async () => {
    mockFetch({ '/api/today': TODAY });
    renderWithForms(<Timeline entries={[call]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Call: Agreed a two-year term' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit activity' });
    expect((within(dialog).getByLabelText(/What happened/) as HTMLTextAreaElement).value).toBe(
      'Agreed a two-year term',
    );
  });

  test('Delete in the menu asks first, then deletes the activity (UI-DEL-04)', async () => {
    const fetch = mockFetch({
      '/api/today': TODAY,
      'DELETE /api/activities/1': new Response(null, { status: 204 }),
    });
    renderWithForms(<Timeline entries={[call]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Call: Agreed a two-year term' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete this call?' });
    expect(within(dialog).getByText("This can't be undone.")).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Activity deleted')).toBeTruthy();
    expect(fetch.mock.calls.some(([url, init]) => url === '/api/activities/1' && init?.method === 'DELETE')).toBe(true);
  });
});
