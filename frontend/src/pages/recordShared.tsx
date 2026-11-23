import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';

import { buttonClass } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Panel } from '../components/Panel';
import styles from './recordShared.module.css';

/** "< Deals" goes back to the list. */
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <div className={styles.back}>
      <Link to={to} className={styles.link}>
        <ChevronLeft size={16} aria-hidden />
        {label}
      </Link>
    </div>
  );
}

export function MissingRecord({ what, to }: { what: string; to: string }) {
  return (
    <Panel>
      <EmptyState
        message={`That ${what} doesn't exist. It may have been deleted.`}
        action={
          <Link to={to} className={buttonClass('secondary')}>
            Back to the list
          </Link>
        }
      />
    </Panel>
  );
}
