import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import { RowActions } from './RowActions';

test('Edit and Delete are named after the record for screen readers (UI-TBL-04)', async () => {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  render(<RowActions name="Acme Ltd" onEdit={onEdit} onDelete={onDelete} />);

  await userEvent.click(screen.getByRole('button', { name: 'Edit Acme Ltd' }));
  expect(onEdit).toHaveBeenCalledOnce();
  expect(onDelete).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole('button', { name: 'Delete Acme Ltd' }));
  expect(onDelete).toHaveBeenCalledOnce();
});
