import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { Check, ChevronDown } from 'lucide-react';
import { forwardRef, useState } from 'react';

import { useFieldIds } from './fields';
import styles from './RecordSelect.module.css';

export interface RecordOption {
  value: number;
  label: string;
  hint?: string | null;
  group?: string;
}

/**
 * UI-FORM-03: a searchable select for choosing an organization or contact.
 * Options may carry a group; groups show in the order they first appear.
 */
export const RecordSelect = forwardRef<
  HTMLButtonElement,
  {
    value: number | null;
    onChange: (value: number | null) => void;
    onBlur?: () => void;
    options: RecordOption[];
    placeholder: string;
    searchPlaceholder: string;
    noneLabel?: string;
  }
>(function RecordSelect({ value, onChange, onBlur, options, placeholder, searchPlaceholder, noneLabel }, ref) {
  const [open, setOpen] = useState(false);
  const ids = useFieldIds();
  const selected = options.find((o) => o.value === value);
  const groups: { name: string; items: RecordOption[] }[] = [];
  for (const option of options) {
    const name = option.group ?? '';
    let group = groups.find((g) => g.name === name);
    if (!group) {
      group = { name, items: [] };
      groups.push(group);
    }
    group.items.push(option);
  }

  const choose = (next: number | null) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onBlur?.();
      }}
    >
      <Popover.Trigger asChild>
        <button
          ref={ref}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          id={ids.id}
          aria-invalid={ids.invalid || undefined}
          aria-describedby={ids.invalid ? ids.errorId : undefined}
          className={`${styles.trigger} ${ids.invalid ? styles.invalid : ''}`}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setOpen(true);
            }
          }}
        >
          <span className={selected ? styles.value : styles.placeholder}>{selected ? selected.label : placeholder}</span>
          <ChevronDown size={16} aria-hidden className={styles.chevron} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={styles.content} align="start" sideOffset={6}>
          <Command label={placeholder}>
            <Command.Input className={styles.search} placeholder={searchPlaceholder} />
            <Command.List className={styles.list}>
              <Command.Empty className={styles.empty}>Nothing matches</Command.Empty>
              {noneLabel ? (
                <Command.Item value="__none" keywords={[noneLabel]} onSelect={() => choose(null)} className={styles.item}>
                  <span className={styles.muted}>{noneLabel}</span>
                  {value === null ? <Check size={14} aria-hidden /> : null}
                </Command.Item>
              ) : null}
              {groups.map((group) => (
                <Command.Group key={group.name || 'all'} heading={group.name || undefined} className={styles.group}>
                  {group.items.map((option) => (
                    <Command.Item
                      key={option.value}
                      value={`${option.label} ${option.value}`}
                      keywords={option.hint ? [option.hint] : undefined}
                      onSelect={() => choose(option.value)}
                      className={styles.item}
                    >
                      <span>
                        {option.label}
                        {option.hint ? <span className={styles.hint}> {option.hint}</span> : null}
                      </span>
                      {option.value === value ? <Check size={14} aria-hidden /> : null}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
});
