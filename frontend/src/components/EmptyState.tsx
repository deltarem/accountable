import type { ReactNode } from 'react';

import styles from './EmptyState.module.css';

/** A short line in Instrument Serif, and an action when there is one. */
export function EmptyState({ message, action, compact = false }: { message: ReactNode; action?: ReactNode; compact?: boolean }) {
  return (
    <div className={`${styles.empty} ${compact ? styles.compact : ''}`} role="status">
      <p className={styles.message}>{message}</p>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
