import { Check } from 'lucide-react';
import { useState } from 'react';

import { useSetDone } from '../../api/hooks';
import { useToast } from '../Toaster';
import styles from './FollowUpCheckbox.module.css';

/** Ticking marks a follow-up done; unticking makes it due again. */
export function FollowUpCheckbox({
  activityId,
  done,
  label,
  description,
  hideLabel = false,
}: {
  activityId: number;
  done: boolean;
  label: string;
  description: string;
  hideLabel?: boolean;
}) {
  const setDone = useSetDone();
  const toast = useToast();
  // The box flips at once, in local state. Waiting for the mutation to report
  // "pending" left it unticked for a moment, because TanStack Query notifies
  // on a later tick. It follows the server's value again whenever that changes,
  // adjusted during render so the stale value is never shown.
  const [checked, setChecked] = useState(done);
  const [serverDone, setServerDone] = useState(done);
  if (done !== serverDone) {
    setServerDone(done);
    setChecked(done);
  }
  return (
    <label className={styles.label}>
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        aria-label={hideLabel ? `Mark done: ${description}` : undefined}
        onChange={(event) => {
          const next = event.target.checked;
          setChecked(next);
          setDone.mutate(
            { id: activityId, done: next },
            {
              onError: () => {
                setChecked(!next);
                toast("Couldn't update the follow-up. Try again.", 'error');
              },
            },
          );
        }}
      />
      <span className={styles.box} aria-hidden>
        {checked ? <Check size={13} strokeWidth={3} /> : null}
      </span>
      {hideLabel ? null : <span>{label}</span>}
    </label>
  );
}
