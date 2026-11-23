import type { ColumnDef } from '@tanstack/react-table';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { DataTable } from './DataTable';

interface Row {
  id: number;
  name: string;
  city: string;
  amount: number;
}

const rows: Row[] = [
  { id: 1, name: 'Maria Lopez', city: 'Lisbon', amount: 300 },
  { id: 2, name: 'tom becker', city: 'Berlin', amount: 100 },
  { id: 3, name: 'Aisha Khan', city: 'Lagos', amount: 200 },
];

const columns: ColumnDef<Row, unknown>[] = [
  { id: 'name', header: 'Name', accessorFn: (r) => r.name, sortingFn: 'text' },
  { id: 'city', header: 'City', accessorFn: (r) => r.city, sortingFn: 'text' },
  { id: 'amount', header: 'Amount', accessorFn: (r) => r.amount, meta: { mono: true, align: 'right' } },
];

function renderTable(data: Row[] | undefined, loading = false) {
  const onOpen = vi.fn();
  render(
    <DataTable
      data={data}
      columns={columns}
      loading={loading}
      noun="contact"
      nounPlural="contacts"
      onOpen={onOpen}
      rowLabel={(r) => r.name}
      rowActions={() => null}
      emptyAction={<button type="button">New contact</button>}
    />,
  );
  return { onOpen };
}

const bodyNames = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[0].textContent);

describe('DataTable', () => {
  test('names sort A to Z by default, ignoring case', () => {
    renderTable(rows);
    expect(bodyNames()).toEqual(['Aisha Khan', 'Maria Lopez', 'tom becker']);
  });

  test('search filters any text column regardless of case', async () => {
    renderTable(rows);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search contacts' }), 'BERL');
    expect(bodyNames()).toEqual(['tom becker']);
    expect(screen.getByText('1 of 3 contacts')).toBeTruthy();
  });

  test('a heading click sorts ascending, then descending', async () => {
    renderTable(rows);
    const amount = screen.getByRole('button', { name: 'Amount' });
    await userEvent.click(amount);
    expect(bodyNames()).toEqual(['tom becker', 'Aisha Khan', 'Maria Lopez']);
    expect(screen.getByRole('columnheader', { name: 'Amount' }).getAttribute('aria-sort')).toBe('ascending');
    await userEvent.click(amount);
    expect(bodyNames()).toEqual(['Maria Lopez', 'Aisha Khan', 'tom becker']);
    expect(screen.getByRole('columnheader', { name: 'Amount' }).getAttribute('aria-sort')).toBe('descending');
  });

  test('the footer counts what is showing out of the total', () => {
    renderTable(rows);
    expect(screen.getByText('3 of 3 contacts')).toBeTruthy();
  });

  test('Enter on a row opens it', () => {
    const { onOpen } = renderTable(rows);
    const row = screen.getByRole('row', { name: 'Open Aisha Khan' });
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(onOpen).toHaveBeenCalledWith(rows[2]);
  });

  test('an empty table shows a short line and the add button', () => {
    renderTable([]);
    expect(screen.getByText('No contacts yet')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New contact' })).toBeTruthy();
  });

  test('a search with no results says so and offers to clear it', async () => {
    renderTable(rows);
    await userEvent.type(screen.getByRole('searchbox'), 'smith');
    expect(screen.getByText('No contacts match "smith"')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(bodyNames()).toHaveLength(3);
  });

  test('placeholder rows while loading', () => {
    renderTable(undefined, true);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(10);
    expect(screen.queryByText(/of 0 contacts/)).toBeNull();
  });
});
