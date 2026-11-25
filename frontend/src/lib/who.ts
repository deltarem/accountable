// Who added and changed a record, and who made each timeline entry (UI-WHO-01,
// UI-WHO-02). The API sends names; sample records have none and read "Sample data".

import { formatDate } from './format';

export const SAMPLE_DATA = 'Sample data';

export function whoName(name: string | null | undefined): string {
  return name ?? SAMPLE_DATA;
}

interface Authored {
  created_at: string;
  updated_at: string;
  created_by_name: string | null;
  updated_by_name: string | null;
}

/**
 * "Added by Priya Shah on 2 Mar 2026 · Last changed by Sam Lee on 20 Nov 2026".
 * The second half shows once someone has changed it since it was added, so not for
 * a record nobody has touched, and not for sample data nobody has edited.
 */
export function whoLine(record: Authored): string {
  const added = `Added by ${whoName(record.created_by_name)} on ${formatDate(record.created_at)}`;
  const changed = record.updated_by_name !== null && record.updated_at !== record.created_at;
  if (!changed) return added;
  return `${added} · Last changed by ${record.updated_by_name} on ${formatDate(record.updated_at)}`;
}
