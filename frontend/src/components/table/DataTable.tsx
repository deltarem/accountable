import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { type ReactNode, useMemo, useState } from 'react';

import { Button } from '../Button';
import { EmptyState } from '../EmptyState';
import { Skeleton } from '../Skeleton';
import styles from './DataTable.module.css';
import { SearchBox } from './SearchBox';
import { SortableHeader } from './SortableHeader';

export interface ColumnMeta {
  align?: 'right';
  mono?: boolean;
  width?: string;
}

/**
 * A whole list in a white panel, searched, sorted and counted in the browser
 * (ARC-09, UI-TBL-01 to UI-TBL-05).
 */
export function DataTable<T>({
  data,
  columns,
  loading,
  noun,
  nounPlural,
  onOpen,
  rowLabel,
  emptyAction,
  filters,
  initialSort,
  rowActions,
  filterRows,
}: {
  data: T[] | undefined;
  columns: ColumnDef<T, unknown>[];
  loading: boolean;
  noun: string;
  nounPlural: string;
  onOpen: (row: T) => void;
  rowLabel: (row: T) => string;
  emptyAction?: ReactNode;
  filters?: ReactNode;
  initialSort?: SortingState;
  rowActions: (row: T) => ReactNode;
  /** An extra filter applied before the search, such as the contact status. */
  filterRows?: (row: T) => boolean;
}) {
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>(initialSort ?? [{ id: 'name', desc: false }]);
  // A stable array: TanStack Table treats a new array as new data on every render.
  const rows = useMemo(() => (data ?? []).filter((row) => (filterRows ? filterRows(row) : true)), [data, filterRows]);
  const table = useReactTable({
    data: rows,
    columns,
    state: { globalFilter: search, sorting },
    onGlobalFilterChange: setSearch,
    onSortingChange: setSorting,
    globalFilterFn: 'includesString',
    getColumnCanGlobalFilter: (column) => !(column.columnDef.meta as ColumnMeta | undefined)?.mono,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    sortDescFirst: false,
    autoResetAll: false,
  });

  const total = data?.length ?? 0;
  const shown = table.getRowModel().rows;
  const columnCount = columns.length + 1;

  let body: ReactNode;
  if (loading) {
    body = Array.from({ length: 6 }, (_, i) => (
      <tr key={`placeholder-${i}`} className={styles.placeholderRow}>
        {Array.from({ length: columnCount }, (__, j) => (
          <td key={j}>
            <Skeleton width={j === 0 ? '70%' : '55%'} />
          </td>
        ))}
      </tr>
    ));
  } else if (total === 0) {
    body = (
      <tr>
        <td colSpan={columnCount}>
          <EmptyState message={`No ${nounPlural} yet`} action={emptyAction} />
        </td>
      </tr>
    );
  } else if (shown.length === 0) {
    body = (
      <tr>
        <td colSpan={columnCount}>
          <EmptyState
            message={search ? `No ${nounPlural} match "${search}"` : `No ${nounPlural} here`}
            action={
              search ? (
                <Button variant="secondary" onClick={() => setSearch('')}>
                  Clear search
                </Button>
              ) : null
            }
          />
        </td>
      </tr>
    );
  } else {
    body = shown.map((row) => (
      <tr
        key={row.id}
        className={styles.row}
        tabIndex={0}
        aria-label={`Open ${rowLabel(row.original)}`}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('a, button')) return;
          onOpen(row.original);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && event.currentTarget === event.target) {
            event.preventDefault();
            onOpen(row.original);
          }
        }}
      >
        {row.getVisibleCells().map((cell) => {
          const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
          return (
            <td key={cell.id} className={[meta?.align === 'right' ? styles.right : '', meta?.mono ? 'mono' : ''].join(' ')}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          );
        })}
        <td className={styles.actions}>{rowActions(row.original)}</td>
      </tr>
    ));
  }

  return (
    <section className={styles.panel} aria-label={`${nounPlural[0].toUpperCase()}${nounPlural.slice(1)}`}>
      <div className={styles.toolbar}>
        <SearchBox value={search} onChange={setSearch} label={`Search ${nounPlural}`} />
        {filters}
      </div>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {table.getHeaderGroups()[0].headers.map((header) => {
                const meta = header.column.columnDef.meta as ColumnMeta | undefined;
                return (
                  <th
                    key={header.id}
                    className={meta?.align === 'right' ? styles.right : ''}
                    style={meta?.width ? { width: meta.width } : undefined}
                    aria-sort={
                      header.column.getIsSorted() === 'asc'
                        ? 'ascending'
                        : header.column.getIsSorted() === 'desc'
                          ? 'descending'
                          : undefined
                    }
                  >
                    <SortableHeader column={header.column} align={meta?.align}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </SortableHeader>
                  </th>
                );
              })}
              <th className={styles.actionsHead}>
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>{body}</tbody>
        </table>
      </div>
      <p className={styles.footer} aria-live="polite">
        {loading ? <Skeleton width={120} /> : `${shown.length} of ${total} ${total === 1 ? noun : nounPlural}`}
      </p>
    </section>
  );
}
