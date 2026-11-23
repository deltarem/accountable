import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';

import { followUp } from '../../test/dashboardFixtures';
import { mockFetch, renderWithProviders } from '../../test/utils';
import { FollowUpList } from './FollowUpList';

const TODAY = '2026-11-23';

const items = [
  followUp({
    id: 11,
    key: 'activity-11',
    group: 'week',
    description: 'Send the contract',
    follow_up_date: '2026-11-26',
    record: { kind: 'contact', id: 4, name: 'Maria Lopez' },
  }),
  followUp({
    id: 12,
    key: 'activity-12',
    group: 'overdue',
    description: 'Chase the invoice',
    follow_up_date: '2026-11-20',
    record: { kind: 'deal', id: 7, name: 'Booking engine', organization_name: 'Pinecrest Hotels' },
  }),
  followUp({
    id: 13,
    key: 'activity-13',
    group: 'today',
    description: 'Call back',
    follow_up_date: '2026-11-23',
    record: null,
  }),
];

describe('FollowUpList (UI-DASH-06, DEC-11)', () => {
  test('groups come in order: Overdue, Today, Next 7 days', () => {
    renderWithProviders(<FollowUpList items={items} today={TODAY} />);
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Overdue',
      'Today',
      'Next 7 days',
    ]);
    const overdue = screen.getByRole('region', { name: 'Overdue' });
    expect(within(overdue).getByText('Chase the invoice')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Next 7 days' })).getByText('Send the contract')).toBeTruthy();
  });

  test('a group with nothing in it is left out', () => {
    renderWithProviders(<FollowUpList items={[items[2]]} today={TODAY} />);
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Today']);
    expect(screen.queryByRole('region', { name: 'Overdue' })).toBeNull();
  });

  test('each row shows its record as a link and its due date relative to today', () => {
    renderWithProviders(<FollowUpList items={items} today={TODAY} />);
    const rows = screen.getAllByTestId('follow-up');
    const [overdue, todayRow, week] = rows;

    const dealLink = within(overdue).getByRole('link', { name: 'Pinecrest Hotels · Booking engine' });
    expect(dealLink.getAttribute('href')).toBe('/deals/7');
    expect(within(overdue).getByText('3 days overdue')).toBeTruthy();

    expect(within(todayRow).queryByRole('link')).toBeNull();
    expect(within(todayRow).getByText('Today')).toBeTruthy();

    expect(within(week).getByRole('link', { name: 'Maria Lopez' }).getAttribute('href')).toBe('/contacts/4');
    expect(within(week).getByText('In 3 days')).toBeTruthy();
  });

  test('overdue rows are styled apart from the others', () => {
    renderWithProviders(<FollowUpList items={items} today={TODAY} />);
    const [overdue, todayRow] = screen.getAllByTestId('follow-up');
    expect(overdue.className).not.toBe(todayRow.className);
  });

  test('a follow-up without a date counts as due today', () => {
    renderWithProviders(
      <FollowUpList items={[followUp({ id: 14, description: 'No date', follow_up_date: null })]} today={TODAY} />,
    );
    expect(within(screen.getByTestId('follow-up')).getByText('Today')).toBeTruthy();
  });

  test('the full date shows in a tooltip on keyboard focus (DES-05)', async () => {
    renderWithProviders(<FollowUpList items={[items[1]]} today={TODAY} />);
    act(() => screen.getByText('3 days overdue').focus());
    expect((await screen.findByRole('tooltip')).textContent).toBe('20 Nov 2026');
  });

  test('ticking the box marks the follow-up done on the server', async () => {
    const fetchSpy = mockFetch({ 'POST /api/activities/12/done': { id: 12, follow_up_done: true } });
    renderWithProviders(<FollowUpList items={[items[1]]} today={TODAY} />);
    const box = screen.getByRole('checkbox', { name: 'Mark done: Chase the invoice' });
    await userEvent.click(box);
    expect((box as HTMLInputElement).checked).toBe(true);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/activities/12/done');
    expect(JSON.parse(String(init?.body))).toEqual({ done: true });
  });

  test('if the server refuses, the box unticks and a message says so (UI-ERR-01)', async () => {
    mockFetch({
      'POST /api/activities/12/done': () => new Response(JSON.stringify({ detail: 'Nope' }), { status: 500 }),
    });
    renderWithProviders(<FollowUpList items={[items[1]]} today={TODAY} />);
    const box = screen.getByRole('checkbox', { name: 'Mark done: Chase the invoice' });
    await userEvent.click(box);
    expect(await screen.findByText("Couldn't update the follow-up. Try again.")).toBeTruthy();
    expect((box as HTMLInputElement).checked).toBe(false);
  });

  test('with nothing due it reads "No follow-ups due. You\'re up to date." (UI-EMPTY-04)', () => {
    renderWithProviders(<FollowUpList items={[]} today={TODAY} />);
    expect(screen.getByText("No follow-ups due. You're up to date.")).toBeTruthy();
  });
});
