// The matching part of a search result's name, for the dropdown to set in
// semibold (UI-SRCH-02). The server decides what matches (DEC-21); this only finds
// where, ignoring case.

export interface NameParts {
  before: string;
  match: string;
  after: string;
}

/**
 * Splits a name around the first place the search text appears. Null when it can't
 * be found the same way the server found it: a few letters change length when
 * their case is folded ("ß" becomes "ss"), and then the name shows plain.
 */
export function splitMatch(name: string, query: string): NameParts | null {
  const text = query.trim().toLowerCase();
  const lower = name.toLowerCase();
  if (!text || lower.length !== name.length) return null;
  const at = lower.indexOf(text);
  if (at < 0) return null;
  return { before: name.slice(0, at), match: name.slice(at, at + text.length), after: name.slice(at + text.length) };
}
