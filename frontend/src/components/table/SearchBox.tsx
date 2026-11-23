import { Search, X } from 'lucide-react';

import styles from './SearchBox.module.css';

export function SearchBox({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className={styles.box}>
      <Search size={16} className={styles.icon} aria-hidden />
      <input
        type="search"
        className={styles.input}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={`${label}...`}
        aria-label={label}
      />
      {value ? (
        <button type="button" className={styles.clear} onClick={() => onChange('')} aria-label="Clear the search box">
          <X size={14} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
