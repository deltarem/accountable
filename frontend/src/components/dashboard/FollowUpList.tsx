import * as Tooltip from '@radix-ui/react-tooltip';
import { Link } from 'react-router';

import type { FollowUp, RecordRef } from '../../api/types';
import { formatDate, formatRelative } from '../../lib/format';
import { EmptyState } from '../EmptyState';
import { FollowUpCheckbox } from '../record/FollowUpCheckbox';
import styles from './FollowUpList.module.css';

const GROUPS = [
  { key: 'overdue', title: 'Overdue' },
  { key: 'today', title: 'Today' },
  { key: 'week', title: 'Next 7 days' },
] as const;

export function RecordName({ record }: { record: RecordRef | null }) {
  if (!record) return null;
  const to = record.kind === 'deal' ? `/deals/${record.id}` : `/contacts/${record.id}`;
  const text = record.kind === 'deal' && record.organization_name ? `${record.organization_name} · ${record.name}` : record.name;
  return (
    <Link to={to} className={styles.where}>
      {text}
    </Link>
  );
}

function FollowUpGroup({ title, items, today }: { title: string; items: FollowUp[]; today: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title}>
      <h3 className={styles.group}>{title}</h3>
      <ul className={styles.list}>
        {items.map((f) => (
          <li key={f.id} className={`${styles.row} ${f.group === 'overdue' ? styles.over : ''}`} data-testid="follow-up">
            <FollowUpCheckbox activityId={f.id} done={false} label="Mark done" description={f.description ?? ''} hideLabel />
            <div className={styles.main}>
              <div className={styles.what}>{f.description}</div>
              <RecordName record={f.record} />
            </div>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <span className={styles.when} tabIndex={0}>
                  {formatRelative(f.follow_up_date ?? today, today)}
                </span>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className={styles.tip} sideOffset={6}>
                  {formatDate(f.follow_up_date)}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** UI-DASH-06: overdue, then today, then the next 7 days (DEC-11). */
export function FollowUpList({ items, today }: { items: FollowUp[]; today: string }) {
  if (items.length === 0) {
    return <EmptyState compact message="No follow-ups due. You're up to date." />;
  }
  return (
    <div>
      {GROUPS.map((g) => (
        <FollowUpGroup key={g.key} title={g.title} items={items.filter((f) => f.group === g.key)} today={today} />
      ))}
    </div>
  );
}
