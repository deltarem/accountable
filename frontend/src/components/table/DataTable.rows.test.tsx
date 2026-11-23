import type { ColumnDef } from '@tanstack/react-table';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { DataTable } from './DataTable';

interface Row {
  id: number;
  name: string;
  status: 'lead' | 'customer';
}

const rows: Row[] = [
  { id: 1, name: 'Maria Lopez', status: 'lead' },
  { id: 2, name: 'Aisha Khan', status: 'lead' },
];

const columns: ColumnDef<Row, unknown>[] = [
  { id: 'name', header: 'Name', accessorFn: (r) => r.name, sortingFn: 'text' },
];

function renderTable(filterRows?: (row: Row) => boolean) {
  const onOpen = vi.fn();
  render(
    <DataTable
      data={rows}
      columns={columns}
      loading={false}
      noun="contact"
      nounPlural="contacts"
      onOpen={onOpen}
      rowLabel={(r) => r.name}
      rowActions={(r) => <button type="button">{`Edit ${r.name}`}</button>}
      filterRows={filterRows}
    />,
  );
  return { onOpen };
}

describe('DataTable rows', () => {
  test('clicking a row opens it (UI-TBL-03)', async () => {
    const { onOpen } = renderTable();
    await userEvent.click(screen.getByText('Maria Lopez'));
    expect(onOpen).toHaveBeenCalledWith(rows[0]);
  });

  test('clicking a button inside a row does not open the row (UI-TBL-03)', async () => {
    const { onOpen } = renderTable();
    await userEvent.click(screen.getByRole('button', { name: 'Edit Maria Lopez' }));
    expect(onOpen).not.toHaveBeenCalled();
  });

  test('Enter on a button inside a row is left to the button', async () => {
    const { onOpen } = renderTable();
    screen.getByRole('button', { name: 'Edit Aisha Khan' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(onOpen).not.toHaveBeenCalled();
  });

  test('when an extra filter hides every row, it says so without offering to clear a search', () => {
    renderTable((r) => r.status === 'customer');
    expect(screen.getByText('No contacts here')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
    expect(screen.getByText('0 of 2 contacts')).toBeTruthy();
  });
});
