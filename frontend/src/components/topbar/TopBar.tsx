import type { ReactNode } from 'react';

import { GlobalSearch } from './GlobalSearch';
import styles from './TopBar.module.css';

/**
 * UI-LAY-05: a slim bar above the title row on every page, with the search on the
 * left and, on the right, whatever the shell puts there (the menu under your
 * initials). It sits straight on the page background: no panel, no fill, no line.
 */
export function TopBar({ end }: { end?: ReactNode }) {
  return (
    <div className={styles.bar} data-testid="top-bar">
      <GlobalSearch />
      <div className={styles.end}>{end}</div>
    </div>
  );
}
