import { STATUSES } from '../../lib/stages';
import styles from './StatusFilter.module.css';

export type StatusChoice = 'all' | 'lead' | 'qualified' | 'customer';

/** UI-TBL-07: All, Lead, Qualified and Customer, each with its count. */
export function StatusFilter({
  value,
  onChange,
  counts,
}: {
  value: StatusChoice;
  onChange: (value: StatusChoice) => void;
  counts: Record<StatusChoice, number>;
}) {
  const choices: { key: StatusChoice; name: string }[] = [{ key: 'all', name: 'All' }, ...STATUSES];
  return (
    <div className={styles.group} role="group" aria-label="Filter by status">
      {choices.map((c) => (
        <button
          key={c.key}
          type="button"
          aria-pressed={value === c.key}
          className={`${styles.chip} ${value === c.key ? styles.on : ''}`}
          onClick={() => onChange(c.key)}
        >
          {c.name} <span className={styles.count}>{counts[c.key]}</span>
        </button>
      ))}
    </div>
  );
}
