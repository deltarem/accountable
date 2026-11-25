import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { renderSignedIn } from '../../test/session';
import { mockFetch } from '../../test/utils';
import { TopBar } from './TopBar';

test('the top bar has the search on the left and what it is given on the right (UI-LAY-05)', () => {
  mockFetch({});
  renderSignedIn(<TopBar end={<button type="button">PS</button>} />);
  const bar = screen.getByTestId('top-bar');
  const [left, right] = Array.from(bar.children);
  expect(left.querySelector('input')?.getAttribute('aria-label')).toBe('Search everything');
  expect(right.textContent).toBe('PS');
});
