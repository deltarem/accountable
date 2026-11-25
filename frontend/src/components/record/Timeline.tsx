import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ArrowRight, Ellipsis, Mail, Pencil, Phone, StickyNote, Trash2, UserCheck } from 'lucide-react';
import { Link } from 'react-router';

import type { RecordRef, TimelineEntry as Entry } from '../../api/types';
import { formatDate, formatDateTime, formatRelative } from '../../lib/format';
import { whoName } from '../../lib/who';
import { stage as stageInfo, status as statusInfo } from '../../lib/stages';
import { useTodayValue } from '../../lib/today';
import { EmptyState } from '../EmptyState';
import { useForms } from '../forms/FormsProvider';
import { Skeleton } from '../Skeleton';
import { FollowUpCheckbox } from './FollowUpCheckbox';
import styles from './Timeline.module.css';

const TYPE_NAME = { note: 'Note', call: 'Call', email: 'Email' } as const;

/** The line of text for any timeline entry, also used by the dashboard feed. */
export function entryText(entry: Entry): string {
  if (entry.kind === 'stage_change') {
    return `Moved from ${stageInfo(entry.from_value ?? '').name} to ${stageInfo(entry.to_value ?? '').name}`;
  }
  if (entry.kind === 'status_change') {
    return `Status changed from ${statusInfo(entry.from_value ?? '').name} to ${statusInfo(entry.to_value ?? '').name}`;
  }
  return `${TYPE_NAME[entry.type ?? 'note']}: ${entry.description ?? ''}`;
}

/** UI-REC-06: a round icon in the type's colour, from the tokens (ARC-15). */
export function entryIcon(entry: Entry): { Icon: typeof Phone; bg: string; fg: string } {
  if (entry.kind === 'stage_change') {
    const s = stageInfo(entry.to_value ?? '');
    return { Icon: ArrowRight, bg: s.fill, fg: s.ink };
  }
  if (entry.kind === 'status_change') return { Icon: UserCheck, bg: 'var(--sea)', fg: 'var(--on-bright)' };
  if (entry.type === 'call') return { Icon: Phone, bg: 'var(--cerulean)', fg: 'var(--on-solid)' };
  if (entry.type === 'email') return { Icon: Mail, bg: 'var(--coral)', fg: 'var(--on-bright)' };
  return { Icon: StickyNote, bg: 'var(--strong)', fg: 'var(--on-strong)' };
}

export function RecordLink({ record, prefix = true }: { record: RecordRef; prefix?: boolean }) {
  const to = record.kind === 'deal' ? `/deals/${record.id}` : `/contacts/${record.id}`;
  const lead = !prefix ? '' : record.kind === 'deal' ? 'on deal ' : 'with ';
  return (
    <span>
      {lead}
      <Link to={to}>{record.name}</Link>
    </span>
  );
}

function TimelineEntry({ entry }: { entry: Entry }) {
  const { today } = useTodayValue();
  const { openForm, confirmDelete } = useForms();
  const { Icon, bg, fg } = entryIcon(entry);
  const isActivity = entry.kind === 'activity';
  return (
    <li className={styles.entry} data-testid="timeline-entry">
      <span className={styles.icon} style={{ background: bg, color: fg }} aria-hidden>
        <Icon size={15} strokeWidth={2.4} />
      </span>
      <div className={styles.body}>
        <div className={styles.top}>
          <p className={styles.text}>{entryText(entry)}</p>
          {isActivity ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger className={styles.menuButton} aria-label={`Actions for ${entryText(entry)}`}>
                <Ellipsis size={16} aria-hidden />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className={styles.menu} align="end" sideOffset={4}>
                  <DropdownMenu.Item
                    className={styles.menuItem}
                    onSelect={() => openForm({ kind: 'activity', record: entry })}
                  >
                    <Pencil size={14} aria-hidden /> Edit
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className={`${styles.menuItem} ${styles.danger}`}
                    onSelect={() => confirmDelete({ kind: 'activities', activity: entry })}
                  >
                    <Trash2 size={14} aria-hidden /> Delete
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : null}
        </div>
        <p className={styles.meta}>
          <span className="mono">{formatDateTime(entry.occurred_at)}</span>
          {entry.source ? (
            <>
              {' · '}
              <RecordLink record={entry.source} />
            </>
          ) : null}
          {/* The line ends with who made the entry (UI-WHO-02). */}
          {' · '}
          <span className={styles.who}>{whoName(entry.created_by_name)}</span>
        </p>
        {isActivity && entry.follow_up_date ? (
          <div className={styles.followUp}>
            <span>
              Follow-up <span className="mono">{formatDate(entry.follow_up_date)}</span>
            </span>
            {!entry.follow_up_done && today && entry.follow_up_date < today ? (
              <span className={styles.overdue}>{formatRelative(entry.follow_up_date, today)}</span>
            ) : null}
            <FollowUpCheckbox
              activityId={entry.id}
              done={entry.follow_up_done}
              label="Done"
              description={entry.description ?? ''}
            />
          </div>
        ) : null}
      </div>
    </li>
  );
}

/** Newest first (TL-04). */
export function Timeline({ entries, loading }: { entries: Entry[] | undefined; loading?: boolean }) {
  if (loading) {
    return (
      <ul className={styles.list} aria-busy>
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className={styles.entry}>
            <Skeleton width={32} height={32} radius={16} />
            <div className={styles.body}>
              <Skeleton width="70%" />
              <div className={styles.gap} />
              <Skeleton width="40%" height={12} />
            </div>
          </li>
        ))}
      </ul>
    );
  }
  if (!entries || entries.length === 0) {
    return <EmptyState compact message="Nothing here yet. Log a call, email or note to start the history." />;
  }
  return (
    <ul className={styles.list} aria-label="Timeline">
      {entries.map((entry) => (
        <TimelineEntry key={entry.key} entry={entry} />
      ))}
    </ul>
  );
}
