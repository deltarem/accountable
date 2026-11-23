import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import { currentPath, renderPage } from '../test/listHelpers';
import { NotFoundPage } from './NotFoundPage';

test('an unknown address says so and links back to the dashboard (UI-LAY-04)', async () => {
  renderPage(<NotFoundPage />, '/no-such-page');
  expect(screen.getByRole('heading', { name: 'Page not found' })).toBeTruthy();
  expect(screen.getByText("There's nothing at this address.")).toBeTruthy();
  await userEvent.click(screen.getByRole('link', { name: 'Go to the dashboard' }));
  expect(currentPath()).toBe('/');
});
