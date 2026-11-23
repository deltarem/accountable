import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';

import { mockBoardLayout } from '../test/boardLayout';
import { TODAY, currentPath, failThenAnswer, makeDeal, renderPage, sentBody } from '../test/listHelpers';
import { mockFetch } from '../test/utils';
import { PipelinePage } from './PipelinePage';

const deals = [
  makeDeal(1, { name: 'Data audit', stage: 'new', value_cents: 100_000, probability: 10, position: 0 }),
  makeDeal(2, { name: 'Cloud move', stage: 'new', value_cents: 200_000, probability: 10, position: 1 }),
  makeDeal(3, {
    name: 'Training',
    stage: 'qualified',
    value_cents: 400_000,
    probability: 25,
    position: 0,
    close_date: '2026-11-10',
  }),
  makeDeal(4, { name: 'Licences', stage: 'won', value_cents: 900_000, probability: 100, position: 0 }),
];

function setup(routes: Record<string, unknown> = {}) {
  return mockFetch({
    '/api/deals': deals,
    '/api/today': TODAY,
    '/api/organizations': [],
    '/api/contacts': [],
    ...routes,
  });
}

const column = (name: string) => screen.getByRole('region', { name: `${name} column` });
const namesIn = (name: string) =>
  within(column(name))
    .queryAllByTestId('deal-card')
    .map((c) => c.getAttribute('aria-label')?.split(',')[0]);
const card = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name},`) });

async function renderLoaded() {
  renderPage(<PipelinePage />, '/pipeline');
  await screen.findByTestId('board');
}

async function moveRight(name: string) {
  card(name).focus();
  await userEvent.keyboard('[Space]');
  await userEvent.keyboard('[ArrowRight]');
  await userEvent.keyboard('[Space]');
}

describe('PipelinePage', () => {
  test('shows the totals and every deal in its stage column (UI-PIPE-01, UI-PIPE-02)', async () => {
    setup();
    await renderLoaded();
    expect(screen.getByTestId('total-open').textContent).toBe('$7.000,00');
    expect(screen.getByTestId('total-count').textContent).toBe('3');
    expect(namesIn('New')).toEqual(['Data audit', 'Cloud move']);
    expect(namesIn('Qualified')).toEqual(['Training']);
    expect(namesIn('Won')).toEqual(['Licences']);
    expect(within(column('Proposal')).getByText('No deals')).toBeTruthy();
  });

  test('late cards are marked using the server date (RULE-06)', async () => {
    setup();
    await renderLoaded();
    expect(within(card('Training')).getByText('Late · 10 Nov 2026')).toBeTruthy();
    expect(within(card('Data audit')).getByText('1 Dec 2026')).toBeTruthy();
  });

  test('placeholders while the deals load', () => {
    setup({ '/api/deals': new Promise(() => {}) });
    renderPage(<PipelinePage />, '/pipeline');
    expect(screen.queryByTestId('board')).toBeNull();
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(20);
  });

  test('the board waits for today from the server', async () => {
    setup({ '/api/today': new Promise(() => {}) });
    renderPage(<PipelinePage />, '/pipeline');
    await waitFor(() => expect(screen.getByTestId('total-open').textContent).toBe('$7.000,00'));
    expect(screen.queryByTestId('board')).toBeNull();
  });

  test('a failed load shows an error with Try again (UI-ERR-01)', async () => {
    setup({ '/api/deals': failThenAnswer(1, deals) });
    renderPage(<PipelinePage />, '/pipeline');
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain("Couldn't load the pipeline.");
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByTestId('board')).toBeTruthy();
  });

  test('Add deal opens the deal form with that stage chosen (UI-PIPE-05)', async () => {
    setup();
    await renderLoaded();
    await userEvent.click(screen.getByRole('button', { name: 'Add deal in Negotiation' }));
    const dialog = await screen.findByRole('dialog', { name: 'New deal' });
    expect((within(dialog).getByLabelText('Stage') as HTMLSelectElement).value).toBe('negotiation');
    expect((within(dialog).getByLabelText('Probability') as HTMLInputElement).value).toBe('75');
  });

  test('New deal opens the deal form', async () => {
    setup();
    await renderLoaded();
    await userEvent.click(screen.getByRole('button', { name: 'New deal' }));
    const dialog = await screen.findByRole('dialog', { name: 'New deal' });
    expect((within(dialog).getByLabelText('Stage') as HTMLSelectElement).value).toBe('new');
  });

  test('clicking a card opens the deal (UI-PIPE-04)', async () => {
    setup();
    await renderLoaded();
    await userEvent.click(card('Training'));
    expect(currentPath()).toBe('/deals/3');
  });

  test('a move updates the board at once and tells the server (UI-PIPE-06)', async () => {
    mockBoardLayout();
    let moved = false;
    const fetchSpy = setup({
      '/api/deals': () =>
        moved ? deals.map((d) => (d.id === 2 ? { ...d, stage: 'qualified', probability: 25, position: 0 } : d)) : deals,
      'POST /api/deals/2/move': () => {
        moved = true;
        return { ...deals[1], stage: 'qualified' };
      },
    });
    await renderLoaded();
    await moveRight('Cloud move');
    expect(namesIn('Qualified')).toEqual(['Cloud move', 'Training']);
    // 1.000 * 10% + 2.000 * 25% + 4.000 * 25% = 1.600
    await waitFor(() => expect(screen.getByTestId('total-expected').textContent).toBe('$1.600,00'));
    expect(sentBody(fetchSpy, 'POST', '/api/deals/2/move')).toEqual({ stage: 'qualified', index: 0 });
    await waitFor(() => expect(namesIn('New')).toEqual(['Data audit']));
  });

  test('a refused move puts the card back and says why (UI-PIPE-07)', async () => {
    mockBoardLayout();
    setup({
      'POST /api/deals/2/move': () =>
        new Response(JSON.stringify({ detail: 'That deal was deleted.' }), { status: 409 }),
    });
    await renderLoaded();
    await moveRight('Cloud move');
    expect(await screen.findByText("Couldn't move Cloud move. That deal was deleted.")).toBeTruthy();
    await waitFor(() => expect(namesIn('New')).toEqual(['Data audit', 'Cloud move']));
    expect(namesIn('Qualified')).toEqual(['Training']);
  });

  test('a server error during a move gets a plain message', async () => {
    mockBoardLayout();
    setup({
      'POST /api/deals/1/move': () => new Response(JSON.stringify({ detail: 'Traceback...' }), { status: 500 }),
    });
    await renderLoaded();
    await moveRight('Data audit');
    expect(await screen.findByText("Couldn't move Data audit. The server ran into a problem.")).toBeTruthy();
    await waitFor(() => expect(namesIn('New')).toEqual(['Data audit', 'Cloud move']));
  });

  test('a move with the server unreachable says so', async () => {
    mockBoardLayout();
    setup({
      'POST /api/deals/1/move': () => {
        throw new TypeError('Failed to fetch');
      },
    });
    await renderLoaded();
    await moveRight('Data audit');
    expect(
      await screen.findByText(
        "Couldn't move Data audit. Couldn't reach the server. Check that Accountable is running.",
      ),
    ).toBeTruthy();
  });
});
