import { screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { timelineEntry } from '../../test/dashboardFixtures';
import { renderWithProviders } from '../../test/utils';
import { ActivityFeed } from './ActivityFeed';

describe('ActivityFeed (UI-DASH-07)', () => {
  test('each entry shows its text, the record as a link, and its date and time', () => {
    renderWithProviders(
      <ActivityFeed
        entries={[
          timelineEntry({
            key: 'activity-1',
            id: 1,
            type: 'call',
            description: 'Talked about the renewal',
            occurred_at: '2026-11-23T14:05:00',
            record: { kind: 'deal', id: 7, name: 'Booking engine', organization_name: 'Pinecrest Hotels' },
          }),
          timelineEntry({
            key: 'stage-2',
            kind: 'stage_change',
            id: 2,
            type: null,
            description: null,
            from_value: 'proposal',
            to_value: 'won',
            occurred_at: '2026-11-22T09:30:00',
            record: { kind: 'deal', id: 8, name: 'Website rebuild', organization_name: null },
          }),
          timelineEntry({
            key: 'status-3',
            kind: 'status_change',
            id: 3,
            type: null,
            description: null,
            from_value: 'lead',
            to_value: 'customer',
            occurred_at: '2026-11-21T16:00:00',
            record: { kind: 'contact', id: 4, name: 'Maria Lopez' },
          }),
        ]}
      />,
    );
    const items = screen.getAllByTestId('activity-item');
    expect(items).toHaveLength(3);

    expect(within(items[0]).getByText('Call: Talked about the renewal')).toBeTruthy();
    const dealLink = within(items[0]).getByRole('link', { name: 'Pinecrest Hotels · Booking engine' });
    expect(dealLink.getAttribute('href')).toBe('/deals/7');
    expect(within(items[0]).getByText('23 Nov 2026, 14:05')).toBeTruthy();

    expect(within(items[1]).getByText('Moved from Proposal to Won')).toBeTruthy();
    expect(within(items[1]).getByRole('link', { name: 'Website rebuild' }).getAttribute('href')).toBe('/deals/8');

    expect(within(items[2]).getByText('Status changed from Lead to Customer')).toBeTruthy();
    expect(within(items[2]).getByRole('link', { name: 'Maria Lopez' }).getAttribute('href')).toBe('/contacts/4');
  });

  test('an entry without a record shows only its time, with no separator', () => {
    renderWithProviders(
      <ActivityFeed entries={[timelineEntry({ type: 'note', description: 'Kickoff', record: null })]} />,
    );
    const item = screen.getByTestId('activity-item');
    expect(within(item).getByText('Note: Kickoff')).toBeTruthy();
    expect(within(item).queryByRole('link')).toBeNull();
    expect(item.textContent).not.toContain(' · ');
  });

  test('with no entries it reads "No activity yet" (UI-EMPTY-04)', () => {
    renderWithProviders(<ActivityFeed entries={[]} />);
    expect(screen.getByText('No activity yet')).toBeTruthy();
    expect(screen.queryAllByTestId('activity-item')).toHaveLength(0);
  });
});
