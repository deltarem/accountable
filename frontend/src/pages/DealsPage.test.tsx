import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';

import { mockFetch } from '../test/utils';
import { TODAY, columnText, currentPath, failThenAnswer, makeDeal, renderPage } from '../test/listHelpers';
import { DealsPage } from './DealsPage';

const deals = [
  makeDeal(1, {
    name: 'Data audit',
    organization_name: 'Globex Corp',
    contact_name: 'Tom Becker',
    stage: 'proposal',
    value_cents: 1_250_050,
    probability: 50,
    close_date: '2026-11-20',
    late: true,
  }),
  makeDeal(2, {
    name: 'Cloud move',
    organization_id: null,
    organization_name: null,
    stage: 'won',
    value_cents: 900_000,
    probability: 100,
    close_date: '2026-11-02',
  }),
  makeDeal(3, {
    name: 'Brand refresh',
    organization_name: 'Acme Ltd',
    contact_name: 'Maria Lopez',
    stage: 'new',
    value_cents: 300_000,
    probability: 10,
    close_date: null,
  }),
];

function setup(routes: Record<string, unknown> = {}) {
  return mockFetch({
    '/api/deals': deals,
    '/api/organizations': [],
    '/api/contacts': [],
    '/api/today': TODAY,
    ...routes,
  });
}

const names = () => columnText(0);

describe('DealsPage', () => {
  test('lists the deals by name with every column (UI-TBL-08)', async () => {
    setup();
    renderPage(<DealsPage />, '/deals');
    await screen.findByText('Data audit');
    expect(names()).toEqual(['Brand refresh', 'Cloud move', 'Data audit']);
    const audit = screen.getByRole('row', { name: 'Open Data audit' });
    expect(
      within(audit)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['Data audit', 'Globex Corp', 'Tom Becker', 'Proposal', '$12.500,50', '50%', 'Late20 Nov 2026', '']);
    expect(screen.getByText('3 of 3 deals')).toBeTruthy();
  });

  test('a late deal shows a Late badge by its close date; others do not', async () => {
    setup();
    renderPage(<DealsPage />, '/deals');
    await screen.findByText('Data audit');
    expect(screen.getAllByText('Late')).toHaveLength(1);
    expect(within(screen.getByRole('row', { name: 'Open Cloud move' })).getByText('2 Nov 2026')).toBeTruthy();
  });

  test('a deal with no organization says so', async () => {
    setup();
    renderPage(<DealsPage />, '/deals');
    const row = await screen.findByRole('row', { name: 'Open Cloud move' });
    expect(within(row).getByText('No organization')).toBeTruthy();
  });

  test('search matches organization and contact names, not amounts (UI-TBL-01)', async () => {
    setup();
    renderPage(<DealsPage />, '/deals');
    await screen.findByText('Data audit');
    const search = screen.getByRole('searchbox', { name: 'Search deals' });
    await userEvent.type(search, 'maria');
    expect(names()).toEqual(['Brand refresh']);
    await userEvent.clear(search);
    await userEvent.type(search, 'globex');
    expect(names()).toEqual(['Data audit']);
    await userEvent.clear(search);
    await userEvent.type(search, '12.500');
    expect(screen.getByText('No deals match "12.500"')).toBeTruthy();
  });

  test('sorting by stage follows the pipeline, not the alphabet (UI-TBL-02)', async () => {
    setup();
    renderPage(<DealsPage />, '/deals');
    await screen.findByText('Data audit');
    await userEvent.click(screen.getByRole('button', { name: 'Stage' }));
    expect(columnText(3)).toEqual(['New', 'Proposal', 'Won']);
    await userEvent.click(screen.getByRole('button', { name: 'Stage' }));
    expect(columnText(3)).toEqual(['Won', 'Proposal', 'New']);
  });

  test('sorting by value and close date', async () => {
    setup();
    renderPage(<DealsPage />, '/deals');
    await screen.findByText('Data audit');
    await userEvent.click(screen.getByRole('button', { name: 'Value' }));
    expect(names()).toEqual(['Brand refresh', 'Cloud move', 'Data audit']);
    await userEvent.click(screen.getByRole('button', { name: 'Value' }));
    expect(names()).toEqual(['Data audit', 'Cloud move', 'Brand refresh']);
    await userEvent.click(screen.getByRole('button', { name: 'Close date' }));
    expect(names()).toEqual(['Brand refresh', 'Cloud move', 'Data audit']);
  });

  test('clicking a row opens the deal (UI-TBL-03)', async () => {
    setup();
    renderPage(<DealsPage />, '/deals');
    await userEvent.click(await screen.findByText('Cloud move'));
    expect(currentPath()).toBe('/deals/2');
  });

  test('New deal opens an empty deal form', async () => {
    setup();
    renderPage(<DealsPage />, '/deals');
    await screen.findByText('Data audit');
    await userEvent.click(screen.getByRole('button', { name: 'New deal' }));
    expect(await screen.findByRole('dialog', { name: 'New deal' })).toBeTruthy();
  });

  test('Edit opens the form with the deal filled in (UI-TBL-04)', async () => {
    setup();
    renderPage(<DealsPage />, '/deals');
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Data audit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit deal' });
    expect((within(dialog).getByLabelText(/^Name/) as HTMLInputElement).value).toBe('Data audit');
    expect(currentPath()).toBe('/deals');
  });

  test('Delete asks first, then deletes the deal (UI-DEL-01)', async () => {
    let remaining = deals;
    const fetchSpy = setup({
      '/api/deals': () => remaining,
      '/api/deals/1/delete-impact': { name: 'Data audit', activities: 2, events: 1 },
      'DELETE /api/deals/1': () => {
        remaining = deals.filter((d) => d.id !== 1);
        return new Response(null, { status: 204 });
      },
    });
    renderPage(<DealsPage />, '/deals');
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Data audit' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete Data audit?' });
    expect(within(dialog).getByText(/Its 2 activities and its stage history will be deleted/)).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Deal deleted')).toBeTruthy();
    await waitFor(() => expect(names()).toEqual(['Brand refresh', 'Cloud move']));
    expect(fetchSpy).toHaveBeenCalledWith('/api/deals/1', expect.objectContaining({ method: 'DELETE' }));
    expect(currentPath()).toBe('/deals');
  });

  test('placeholder rows while the deals load', () => {
    setup({ '/api/deals': new Promise(() => {}) });
    renderPage(<DealsPage />, '/deals');
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(10);
    expect(screen.queryByText(/of \d+ deals/)).toBeNull();
  });

  test('with no deals, says so and offers New deal (UI-EMPTY-01)', async () => {
    setup({ '/api/deals': [] });
    renderPage(<DealsPage />, '/deals');
    expect(await screen.findByText('No deals yet')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'New deal' })).toHaveLength(2);
  });

  test('a failed load shows an error with Try again, which reloads (UI-ERR-01)', async () => {
    setup({ '/api/deals': failThenAnswer(1, deals) });
    renderPage(<DealsPage />, '/deals');
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain("Couldn't load the deals.");
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Data audit')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
