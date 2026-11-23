import { Button } from './Button';
import { EmptyState } from './EmptyState';

/** Shown instead of a blank page when data can't be loaded (UI-ERR-01). */
export function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div role="alert">
      <EmptyState
        message={`Couldn't load the ${what}. Check that Accountable is running, then try again.`}
        action={
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        }
      />
    </div>
  );
}
