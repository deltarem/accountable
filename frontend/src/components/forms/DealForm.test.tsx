import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { mockFetch, renderWithProviders } from '../../test/utils';
import { DealForm } from './DealForm';

const organizations = [
  { id: 1, name: 'Acme Ltd', contact_count: 1, open_deal_count: 0, open_value_cents: 0 },
  { id: 2, name: 'Globex Corp', contact_count: 2, open_deal_count: 0, open_value_cents: 0 },
];
const contacts = [
  { id: 10, name: 'Aisha Khan', organization_id: null, organization_name: null, status: 'lead' },
  { id: 11, name: 'Maria Lopez', organization_id: 1, organization_name: 'Acme Ltd', status: 'lead' },
  { id: 12, name: 'Tom Becker', organization_id: 2, organization_name: 'Globex Corp', status: 'lead' },
  { id: 13, name: 'Zoe Adams', organization_id: 2, organization_name: 'Globex Corp', status: 'lead' },
];

let posted: unknown = null;

beforeEach(() => {
  posted = null;
  mockFetch({
    '/api/organizations': organizations,
    '/api/contacts': contacts,
    '/api/today': { today: '2026-11-23', now: '2026-11-23T14:05:00' },
    'POST /api/deals': (init?: RequestInit) => {
      posted = JSON.parse(String(init?.body));
      return { id: 99, ...(posted as object) };
    },
  });
});

function renderForm(defaults?: { stage?: string; organization_id?: number }) {
  const onDone = vi.fn();
  renderWithProviders(<DealForm defaults={defaults} onDone={onDone} onCancel={() => {}} />);
  return { onDone };
}

describe('DealForm', () => {
  test('picking a stage fills in its probability', async () => {
    renderForm();
    const stage = screen.getByLabelText('Stage');
    const probability = screen.getByLabelText('Probability') as HTMLInputElement;
    expect(probability.value).toBe('10');
    await userEvent.selectOptions(stage, 'negotiation');
    expect(probability.value).toBe('75');
    await userEvent.clear(probability);
    await userEvent.type(probability, '80');
    expect(probability.value).toBe('80');
  });

  test('picking Won fills in today as the close date', async () => {
    renderForm();
    await waitFor(() => expect(screen.getByLabelText('Close date')).toBeTruthy());
    // Wait for today to arrive from the server.
    await screen.findByText('Choose an organization');
    await new Promise((r) => setTimeout(r, 50));
    await userEvent.selectOptions(screen.getByLabelText('Stage'), 'won');
    expect((screen.getByLabelText('Close date') as HTMLInputElement).value).toBe('2026-11-23');
    expect((screen.getByLabelText('Probability') as HTMLInputElement).value).toBe('100');
  });

  test('errors show under their fields, with focus on the first one', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText('Value (USD)'), '-5');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Enter a name')).toBeTruthy();
    expect(screen.getByText('Choose an organization', { selector: 'p' })).toBeTruthy();
    expect(screen.getByText("Value can't be negative")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText(/^Name/));
    expect(posted).toBeNull();
  });

  test('with an organization chosen, its contacts come first', async () => {
    renderForm({ organization_id: 2 });
    await screen.findByText('Globex Corp');
    await userEvent.click(screen.getByRole('combobox', { name: 'Main contact' }));
    const listbox = await screen.findByRole('listbox');
    const options = within(listbox)
      .getAllByRole('option')
      .map((o) => o.textContent?.replace(/\s+/g, ' ').trim());
    expect(options.slice(0, 3)).toEqual(['No main contact', 'Tom Becker Globex Corp', 'Zoe Adams Globex Corp']);
    expect(within(listbox).getByText('At Globex Corp')).toBeTruthy();
  });

  test('saves a valid deal as cents', async () => {
    const { onDone } = renderForm({ organization_id: 1 });
    await screen.findByText('Acme Ltd');
    await userEvent.type(screen.getByLabelText(/^Name/), 'Acme renewal');
    await userEvent.type(screen.getByLabelText('Value (USD)'), '24.000');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(posted).toMatchObject({ name: 'Acme renewal', organization_id: 1, value_cents: 2_400_000, probability: 10 });
  });
});
