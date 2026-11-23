import type { ReactNode } from 'react';

import styles from './PageHeader.module.css';

/** UI-LAY-02: a small "Accountable" line above the title; the page's main action on the right. */
export function PageHeader({ title, action, back }: { title: string; action?: ReactNode; back?: ReactNode }) {
  return (
    <header className={styles.header}>
      <div>
        {back ? <div className={styles.back}>{back}</div> : <div className={styles.eyebrow}>Accountable</div>}
        <h1 className={styles.title}>{title}</h1>
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </header>
  );
}
