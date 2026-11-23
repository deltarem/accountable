import { Pencil, Trash2 } from 'lucide-react';

import { IconButton } from '../Button';

/** UI-TBL-04: Edit and Delete icon buttons, with names for screen readers. */
export function RowActions({ name, onEdit, onDelete }: { name: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <>
      <IconButton label={`Edit ${name}`} onClick={onEdit}>
        <Pencil size={16} aria-hidden />
      </IconButton>
      <IconButton label={`Delete ${name}`} onClick={onDelete}>
        <Trash2 size={16} aria-hidden />
      </IconButton>
    </>
  );
}
