import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';

import { ApiError } from '../api/client';
import { buttonClass } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { LoadError } from '../components/LoadError';
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

/** A record page whose record failed to load: "doesn't exist" for a 404, otherwise an error with a retry. */
export function RecordLoadFailure({
  what,
  listPath,
  listLabel,
  error,
  onRetry,
}: {
  what: string;
  listPath: string;
  listLabel: string;
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <>
      <BackLink to={listPath} label={listLabel} />
      {error instanceof ApiError && error.status === 404 ? (
        <MissingRecord what={what} to={listPath} />
      ) : (
        <Panel>
          <LoadError what={what} onRetry={onRetry} />
        </Panel>
      )}
    </>
  );
}
