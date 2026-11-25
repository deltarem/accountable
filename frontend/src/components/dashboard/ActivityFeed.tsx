import type { TimelineEntry } from '../../api/types';
import { formatDateTime } from '../../lib/format';
import { whoName } from '../../lib/who';
import { EmptyState } from '../EmptyState';
import { entryIcon, entryText } from '../record/Timeline';
import styles from './ActivityFeed.module.css';
import { RecordName } from './FollowUpList';

/** UI-DASH-07: the 10 newest entries across every timeline. */
export function ActivityFeed({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) return <EmptyState compact message="No activity yet" />;
  return (
    <ul className={styles.feed}>
      {entries.map((e) => {
        const { Icon, bg, fg } = entryIcon(e);
        return (
          <li key={e.key} className={styles.item} data-testid="activity-item">
            <span className={styles.icon} style={{ background: bg, color: fg }} aria-hidden>
              <Icon size={15} strokeWidth={2.4} />
            </span>
            <div className={styles.body}>
              <div className={styles.what}>{entryText(e)}</div>
              <div className={styles.sub}>
                <RecordName record={e.record ?? null} />
                {e.record ? ' · ' : ''}
                <span className={`mono ${styles.when}`}>{formatDateTime(e.occurred_at)}</span>
                {' · '}
                <span className={styles.who}>{whoName(e.created_by_name)}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
