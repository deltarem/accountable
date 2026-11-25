import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { useLocation } from 'react-router';

import type { SearchResults } from '../../api/search';
import { mockFetch, renderWithProviders } from '../../test/utils';
import { GlobalSearch } from './GlobalSearch';

const RESULTS: SearchResults = {
  organizations: [{ id: 3, name: 'Acme Ltd', context: 'Software' }],
  contacts: [],
  deals: [
    { id: 12, name: 'Acme renewal', context: 'Acme Ltd · Negotiation' },
    { id: 14, name: 'Acme support', context: 'Acme Ltd · Won' },
  ],
};

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderSearch() {
  renderWithProviders(
    <>
      <GlobalSearch />
      <button type="button">Elsewhere</button>
      <Where />
    </>,
  );
  return screen.getByRole('combobox', { name: 'Search everything' }) as HTMLInputElement;
}

const searches = (spy: ReturnType<typeof mockFetch>) =>
  spy.mock.calls.map(([url]) => String(url)).filter((url) => url.startsWith('/api/search'));

describe('the search box (UI-SRCH-01)', () => {
  test('is labelled, with its placeholder, and shows nothing before typing', () => {
    mockFetch({});
    const box = renderSearch();
    expect(box.placeholder).toBe('Search organizations, contacts and deals');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

describe('the dropdown (UI-SRCH-02)', () => {
  test('asks once typing pauses, then shows the groups in order, leaving out empty ones', async () => {
    const spy = mockFetch({ '/api/search?q=acme': RESULTS });
    const box = renderSearch();
    await userEvent.type(box, 'acme');
    const list = await screen.findByRole('listbox');
    await within(list).findByRole('option', { name: /^Acme LtdSoftware/ });
    expect(searches(spy)).toEqual(['/api/search?q=acme']);
    const headings = Array.from(list.querySelectorAll('[cmdk-group-heading]')).map((h) => h.textContent);
    expect(headings).toEqual(['Organizations', 'Deals']);
    const options = within(list).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([
      'Acme LtdSoftware',
      'Acme renewalAcme Ltd · Negotiation',
      'Acme supportAcme Ltd · Won',
    ]);
    expect(options[1].querySelector('strong')?.textContent).toBe('Acme');
  });

  test('says "Searching..." while the first results load', async () => {
    mockFetch({ '/api/search?q=ac': new Promise(() => {}) });
    await userEvent.type(renderSearch(), 'ac');
    expect(await screen.findByText('Searching...')).toBeTruthy();
  });

  test('says when nothing matches (UI-EMPTY-06)', async () => {
    mockFetch({ '/api/search?q=xyz': { organizations: [], contacts: [], deals: [] } });
    await userEvent.type(renderSearch(), 'xyz');
    expect(await screen.findByText('No matches for "xyz"')).toBeTruthy();
  });

  test('says when the search fails, inside the dropdown', async () => {
    mockFetch({ '/api/search?q=acme': () => new Response(JSON.stringify({ detail: 'Busy' }), { status: 503 }) });
    await userEvent.type(renderSearch(), 'acme');
    expect(await screen.findByText("Couldn't search. Try again.")).toBeTruthy();
  });

  test('older results stay while newer ones load', async () => {
    mockFetch({ '/api/search?q=acme': RESULTS, '/api/search?q=acmex': new Promise(() => {}) });
    const box = renderSearch();
    await userEvent.type(box, 'acme');
    await screen.findByRole('option', { name: /^Acme LtdSoftware/ });
    await userEvent.type(box, 'x');
    await new Promise((r) => setTimeout(r, 200));
    expect(screen.getByRole('option', { name: /^Acme LtdSoftware/ })).toBeTruthy();
    expect(screen.queryByText('Searching...')).toBeNull();
  });
});

describe('opening a result (UI-SRCH-03)', () => {
  test('the arrows move across the groups and Enter opens the record, clearing the box', async () => {
    mockFetch({ '/api/search?q=acme': RESULTS });
    const box = renderSearch();
    await userEvent.type(box, 'acme');
    await screen.findByRole('option', { name: /Acme renewal/ });
    await userEvent.keyboard('{ArrowDown}');
    const selected = screen.getByRole('option', { selected: true });
    expect(selected.textContent).toContain('Acme renewal');
    expect(box.getAttribute('aria-activedescendant')).toBe(selected.id);
    await userEvent.keyboard('{Enter}');
    expect(screen.getByTestId('where').textContent).toBe('/deals/12');
    expect(box.value).toBe('');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  test('a click opens the record', async () => {
    mockFetch({ '/api/search?q=acme': RESULTS });
    await userEvent.type(renderSearch(), 'acme');
    await userEvent.click(await screen.findByText('Software'));
    expect(screen.getByTestId('where').textContent).toBe('/organizations/3');
  });

  test('Escape closes the dropdown; a second Escape clears the box', async () => {
    mockFetch({ '/api/search?q=acme': RESULTS });
    const box = renderSearch();
    await userEvent.type(box, 'acme');
    await screen.findByRole('listbox');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(box.value).toBe('acme');
    await userEvent.keyboard('{Escape}');
    expect(box.value).toBe('');
  });

  test('tabbing away closes it and keeps the text; focusing again opens it', async () => {
    mockFetch({ '/api/search?q=acme': RESULTS });
    const box = renderSearch();
    await userEvent.type(box, 'acme');
    await screen.findByRole('listbox');
    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(box.value).toBe('acme');
    await userEvent.click(box);
    expect(await screen.findByRole('listbox')).toBeTruthy();
  });

  test('the clear button empties the box', async () => {
    mockFetch({ '/api/search?q=acme': RESULTS });
    const box = renderSearch();
    await userEvent.type(box, 'acme');
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(box.value).toBe('');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
