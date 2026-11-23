import { forwardRef, useId, useState } from 'react';

import { useFieldIds } from './fields';
import fieldStyles from './fields.module.css';
import styles from './SuggestField.module.css';

/**
 * UI-FORM-06: free text with suggestions from what's already in use, filtered
 * as you type. Arrow keys move through them, Enter picks one, Escape hides them.
 */
export const SuggestField = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    suggestions: string[];
    placeholder?: string;
    name?: string;
  }
>(function SuggestField({ value, onChange, onBlur, suggestions, placeholder, name }, ref) {
  const ids = useFieldIds();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const text = value.trim().toLowerCase();
  const matches = suggestions
    .filter((s) => (text ? s.toLowerCase().includes(text) && s.toLowerCase() !== text : true))
    .slice(0, 8);
  const showing = open && matches.length > 0;

  const pick = (s: string) => {
    onChange(s);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div className={styles.wrap}>
      <input
        ref={ref}
        name={name}
        id={ids.id}
        aria-invalid={ids.invalid || undefined}
        aria-describedby={ids.invalid ? ids.errorId : undefined}
        className={fieldStyles.input}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showing}
        aria-controls={listId}
        aria-activedescendant={showing && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          onBlur?.();
        }}
        onKeyDown={(event) => {
          if (!showing) {
            if (event.key === 'ArrowDown') setOpen(true);
            return;
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((i) => (i + 1) % matches.length);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((i) => (i <= 0 ? matches.length - 1 : i - 1));
          } else if (event.key === 'Enter' && active >= 0) {
            event.preventDefault();
            pick(matches[active]);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          }
        }}
      />
      {showing ? (
        <ul className={styles.list} id={listId} role="listbox" aria-label="Suggestions">
          {matches.map((s, i) => (
            <li
              key={s}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`${styles.option} ${i === active ? styles.active : ''}`}
              onMouseDown={(event) => {
                event.preventDefault();
                pick(s);
              }}
            >
              {s}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
});
