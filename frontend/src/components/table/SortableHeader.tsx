import type { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';

import styles from './SortableHeader.module.css';

/** UI-TBL-02: click to sort ascending, then descending. An arrow shows the current sort. */
export function SortableHeader<T>({ column, children, align }: { column: Column<T, unknown>; children: ReactNode; align?: 'right' }) {
  const sorted = column.getIsSorted();
  const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      className={`${styles.button} ${sorted ? styles.active : ''} ${align === 'right' ? styles.right : ''}`}
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      {children}
      <Icon size={13} aria-hidden className={styles.icon} />
    </button>
  );
}
