import { Command } from 'cmdk';
import { Building2, DollarSign, Search, Users, X } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { type SearchResult, useSearch } from '../../api/search';
import { splitMatch } from '../../lib/search';
import styles from './GlobalSearch.module.css';

/** How long typing must pause before the search is asked (UI-SRCH-02). */
export const SEARCH_DELAY_MS = 150;

const GROUPS = [
  { key: 'organizations', heading: 'Organizations', path: '/organizations', icon: Building2 },
  { key: 'contacts', heading: 'Contacts', path: '/contacts', icon: Users },
  { key: 'deals', heading: 'Deals', path: '/deals', icon: DollarSign },
] as const;

function useSettled(value: string, delay: number) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

function Name({ name, query }: { name: string; query: string }) {
  const parts = splitMatch(name, query);
  if (!parts) return <span className={styles.name}>{name}</span>;
  return (
    <span className={styles.name}>
      {parts.before}
      <strong>{parts.match}</strong>
      {parts.after}
    </span>
  );
}

/**
 * UI-SRCH-01 to UI-SRCH-03: the search in the top bar. It finds any organization,
 * contact or deal by part of its name, from every page, and opens it with the
 * keyboard or a click. cmdk gives the combobox pattern: the arrows move through
 * the results across the groups, and screen readers hear the highlighted one.
 */
export function GlobalSearch() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const asked = useSettled(text, SEARCH_DELAY_MS);
  const search = useSearch(asked);
  const showing = open && text.trim().length > 0;

  function choose(path: string, id: number) {
    navigate(`${path}/${id}`);
    setText('');
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    // The first Escape closes the dropdown; a second clears the box.
    if (showing) setOpen(false);
    else setText('');
  }

  const results = search.data;
  const groups = results ? GROUPS.filter((g) => results[g.key].length > 0) : [];
  // "Searching..." until the first results arrive; after that, older results stay
  // until newer ones replace them, so the list doesn't flicker.
  const waiting = results === undefined || (search.isPlaceholderData && groups.length === 0);

  return (
    <div
      ref={rootRef}
      className={styles.root}
      onBlur={(event) => {
        // Clicking elsewhere or tabbing away closes it and keeps the text.
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Command shouldFilter={false} label="Search everything" onKeyDown={onKeyDown}>
        <div className={styles.box}>
          <Search size={16} aria-hidden className={styles.icon} />
          <Command.Input
            className={styles.input}
            aria-label="Search everything"
            placeholder="Search organizations, contacts and deals"
            value={text}
            onValueChange={(next) => {
              setText(next);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
          {text ? (
            <button
              type="button"
              className={styles.clear}
              aria-label="Clear search"
              title="Clear search"
              onClick={() => {
                setText('');
                setOpen(false);
              }}
            >
              <X size={15} aria-hidden />
            </button>
          ) : null}
        </div>
        {showing ? (
          // Pressing on the list keeps focus in the box, so a click can open a result.
          <Command.List className={styles.dropdown} onMouseDown={(event) => event.preventDefault()}>
            {search.isError ? (
              <p className={styles.message}>Couldn&apos;t search. Try again.</p>
            ) : waiting ? (
              <Command.Loading>
                <p className={styles.message}>Searching...</p>
              </Command.Loading>
            ) : groups.length === 0 ? (
              <p className={styles.message}>No matches for &quot;{asked.trim()}&quot;</p>
            ) : (
              groups.map(({ key, heading, path, icon: Icon }) => (
                <Command.Group key={key} heading={heading} className={styles.group}>
                  {results[key].map((result: SearchResult) => (
                    <Command.Item
                      key={result.id}
                      value={`${key}-${result.id}`}
                      className={styles.item}
                      onSelect={() => choose(path, result.id)}
                    >
                      <Icon size={16} aria-hidden className={styles.itemIcon} />
                      <Name name={result.name} query={asked} />
                      {result.context ? <span className={styles.context}>{result.context}</span> : null}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))
            )}
          </Command.List>
        ) : null}
      </Command>
    </div>
  );
}
