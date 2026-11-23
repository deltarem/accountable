import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import { LoadError } from './LoadError';

test('says what failed and offers Try again, which retries (UI-ERR-01)', async () => {
  const onRetry = vi.fn();
  render(<LoadError what="contacts" onRetry={onRetry} />);
  expect(screen.getByRole('alert').textContent).toContain(
    "Couldn't load the contacts. Check that Accountable is running, then try again.",
  );
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});
