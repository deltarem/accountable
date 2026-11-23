import { Check } from 'lucide-react';

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
  const checked = setDone.isPending ? !!setDone.variables?.done : done;
  return (
    <label className={styles.label}>
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        aria-label={hideLabel ? `Mark done: ${description}` : undefined}
        onChange={(event) =>
          setDone.mutate(
            { id: activityId, done: event.target.checked },
            { onError: () => toast("Couldn't update the follow-up. Try again.", 'error') },
          )
        }
      />
      <span className={styles.box} aria-hidden>
        {checked ? <Check size={13} strokeWidth={3} /> : null}
      </span>
      {hideLabel ? null : <span>{label}</span>}
    </label>
  );
}
