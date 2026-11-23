import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test, vi } from 'vitest';

import { deleteBody, deleteTitle } from '../lib/deleteText';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

function Harness({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={setOpen}
      title={deleteTitle('Northwind Traders')}
      body={deleteBody('organizations', { name: 'Northwind Traders', contacts: 3, deals: 2 })}
      onConfirm={onConfirm}
    />
  );
}

test('shows the impact text, with Cancel focused, and Escape closes it', async () => {
  const onConfirm = vi.fn();
  render(<Harness onConfirm={onConfirm} />);
  expect(screen.getByRole('alertdialog', { name: 'Delete Northwind Traders?' })).toBeTruthy();
  expect(
    screen.getByText("Its 3 contacts and 2 deals will be kept, with no organization. This can't be undone."),
  ).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('alertdialog')).toBeNull();
  expect(onConfirm).not.toHaveBeenCalled();
});

test('Delete confirms', async () => {
  const onConfirm = vi.fn();
  render(<Harness onConfirm={onConfirm} />);
  await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(onConfirm).toHaveBeenCalledOnce();
});

test('the wording for contacts and deals', () => {
  expect(deleteBody('contacts', { name: 'Maria Lopez', activities: 4, deals: 2 })).toBe(
    "4 activities logged with this contact will be deleted. 2 deals will be kept, with no main contact. This can't be undone.",
  );
  expect(deleteBody('contacts', { name: 'X', activities: 1, deals: 0 })).toBe(
    "1 activity logged with this contact will be deleted. This can't be undone.",
  );
  expect(deleteBody('deals', { name: 'Acme renewal', activities: 5, events: 2 })).toBe(
    "Its 5 activities and its stage history will be deleted. This can't be undone.",
  );
});
