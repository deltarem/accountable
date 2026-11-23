import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { describe, expect, test, vi } from 'vitest';

import { FormDialog } from './FormDialog';

function Harness({ children, onClosed }: { children: ReactNode; onClosed?: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <FormDialog
      open={open}
      title="New deal"
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onClosed?.();
      }}
    >
      {children}
    </FormDialog>
  );
}

describe('FormDialog (UI-FORM-01)', () => {
  test('is titled and puts focus on the first field, skipping hidden inputs', async () => {
    render(
      <Harness>
        <form>
          <input type="hidden" name="token" value="x" />
          <label>
            Name
            <input name="name" />
          </label>
          <label>
            Notes
            <textarea name="notes" />
          </label>
        </form>
      </Harness>,
    );
    expect(screen.getByRole('dialog', { name: 'New deal' })).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Name')));
  });

  test('a select or record picker that comes first gets the focus', async () => {
    render(
      <Harness>
        <button type="button" role="combobox" aria-expanded="false" aria-controls="org-list">
          Choose an organization
        </button>
        <input aria-label="Later" />
      </Harness>,
    );
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('combobox')));
  });

  test('with no fields, focus stays inside the dialog', async () => {
    render(
      <Harness>
        <p>Nothing to fill in</p>
      </Harness>,
    );
    const dialog = screen.getByRole('dialog');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  });

  test('Escape closes it', async () => {
    const onClosed = vi.fn();
    render(
      <Harness onClosed={onClosed}>
        <input aria-label="Name" />
      </Harness>,
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  test('the Close button closes it', async () => {
    const onClosed = vi.fn();
    render(
      <Harness onClosed={onClosed}>
        <input aria-label="Name" />
      </Harness>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  test('shows nothing while closed', () => {
    render(
      <FormDialog open={false} onOpenChange={() => {}} title="New deal" width={720}>
        <input aria-label="Name" />
      </FormDialog>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
