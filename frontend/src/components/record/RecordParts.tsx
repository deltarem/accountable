import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Button } from '../Button';
import { EmptyState } from '../EmptyState';
import { Skeleton } from '../Skeleton';
import styles from './RecordParts.module.css';

/**
 * UI-REC-01: the record's name, its key facts, and Edit and Delete. `who` ends the
 * panel: who added the record and who last changed it (UI-WHO-01).
 */
export function RecordHeader({
  name,
  facts,
  who,
  onEdit,
  onDelete,
  loading,
}: {
  name?: string;
  facts?: ReactNode;
  who?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  loading?: boolean;
}) {
  return (
    <section className={styles.header} aria-label="Summary">
      <div className={styles.headTop}>
        <h1 className={styles.name}>{loading ? <Skeleton width={260} height={30} /> : name}</h1>
        {loading ? null : (
          <div className={styles.headActions}>
            <Button variant="secondary" onClick={onEdit}>
              <Pencil size={15} aria-hidden /> Edit
            </Button>
            <Button variant="secondary" onClick={onDelete} className={styles.delete}>
              <Trash2 size={15} aria-hidden /> Delete
            </Button>
          </div>
        )}
      </div>
      <div className={styles.facts}>{loading ? <Skeleton width="50%" /> : facts}</div>
      {!loading && who ? (
        <p className={styles.who} data-testid="who">
          {who}
        </p>
      ) : null}
    </section>
  );
}

/** A labelled fact in the header strip. */
export function HeaderFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.headerFact}>
      <span className={styles.factLabel}>{label}</span>
      <span>{children}</span>
    </div>
  );
}

/** A two-column list of facts in the details panel. */
export function FactList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className={styles.factList}>
      {items.map((item) => (
        <div key={item.label} className={styles.factRow}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Linked records as rows with links, with an optional "New" button. While the
 * record loads it shows placeholder rows, not the empty text (UI-EMPTY-05).
 */
export function LinkedList({
  title,
  rows,
  emptyText,
  onNew,
  newLabel,
  loading,
}: {
  title: string;
  rows: { id: number; to: string; name: string; detail?: ReactNode; aside?: ReactNode }[];
  emptyText: string;
  onNew?: () => void;
  newLabel?: string;
  loading?: boolean;
}) {
  let body: ReactNode;
  if (loading) {
    body = (
      <ul className={styles.rows}>
        {[0, 1].map((i) => (
          <li key={i} className={styles.row}>
            <Skeleton width="60%" />
          </li>
        ))}
      </ul>
    );
  } else if (rows.length === 0) {
    body = <EmptyState compact message={emptyText} />;
  } else {
    body = (
      <ul className={styles.rows}>
        {rows.map((row) => (
          <li key={row.id} className={styles.row}>
            <div className={styles.rowMain}>
              <Link to={row.to} className={styles.rowName}>
                {row.name}
              </Link>
              {row.detail ? <span className={styles.rowDetail}>{row.detail}</span> : null}
            </div>
            {row.aside ? <div className={styles.rowAside}>{row.aside}</div> : null}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <section className={styles.linked} aria-label={title}>
      <div className={styles.linkedHead}>
        <h2 className={styles.linkedTitle}>{title}</h2>
        {onNew ? (
          <Button size="sm" variant="secondary" onClick={onNew} aria-label={newLabel}>
            <Plus size={14} aria-hidden /> New
          </Button>
        ) : null}
      </div>
      {body}
    </section>
  );
}

/** Two columns: linked records on the left (about 40%), the timeline on the right. */
export function RecordColumns({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className={styles.columns}>
      <div className={styles.left}>{left}</div>
      <div className={styles.right}>{right}</div>
    </div>
  );
}
