import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';

import { Toaster, useToast } from './Toaster';

function Trigger({ text, tone }: { text: string; tone?: 'success' | 'error' }) {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast(text, tone)}>
      {`Show ${text}`}
    </button>
  );
}

describe('Toaster (UI-FORM-05, UI-ERR-01)', () => {
  test('a success message shows at once and can be dismissed', async () => {
    render(
      <Toaster>
        <Trigger text="Deal saved" />
      </Toaster>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Show Deal saved' }));
    expect(screen.getByText('Deal saved')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(screen.queryByText('Deal saved')).toBeNull());
  });

  test('an error message is announced as more urgent than a success', async () => {
    render(
      <Toaster>
        <Trigger text="Deal saved" />
        <Trigger text="Couldn't save the deal. Try again." tone="error" />
      </Toaster>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Show Deal saved' }));
    await userEvent.click(screen.getByRole('button', { name: "Show Couldn't save the deal. Try again." }));
    const success = screen.getByText('Deal saved').closest('li')!;
    const error = screen.getByText("Couldn't save the deal. Try again.").closest('li')!;
    expect(success.className).not.toBe(error.className);
    const status = screen.getAllByRole('status').map((s) => s.getAttribute('aria-live'));
    expect(status).toContain('assertive');
    expect(status).toContain('polite');
  });

  test('at most three messages show at a time, the oldest going first', async () => {
    render(
      <Toaster>
        {['One', 'Two', 'Three', 'Four'].map((t) => (
          <Trigger key={t} text={t} />
        ))}
      </Toaster>,
    );
    for (const t of ['One', 'Two', 'Three', 'Four']) {
      await userEvent.click(screen.getByRole('button', { name: `Show ${t}` }));
    }
    expect(screen.queryByText('One')).toBeNull();
    for (const t of ['Two', 'Three', 'Four']) expect(screen.getByText(t)).toBeTruthy();
  });

  test('outside a Toaster, showing a message does nothing and does not crash', async () => {
    render(<Trigger text="Lonely" />);
    await userEvent.click(screen.getByRole('button', { name: 'Show Lonely' }));
    expect(screen.queryByText('Lonely')).toBeNull();
  });
});
