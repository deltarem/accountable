import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import { StatusFilter } from './StatusFilter';

const counts = { all: 9, lead: 4, qualified: 3, customer: 2 };

test('shows All, Lead, Qualified and Customer, each with its count (UI-TBL-07)', () => {
  render(<StatusFilter value="all" onChange={() => {}} counts={counts} />);
  const group = screen.getByRole('group', { name: 'Filter by status' });
  expect(
    within(group)
      .getAllByRole('button')
      .map((b) => b.textContent),
  ).toEqual(['All 9', 'Lead 4', 'Qualified 3', 'Customer 2']);
});

test('marks the chosen status as pressed', () => {
  render(<StatusFilter value="qualified" onChange={() => {}} counts={counts} />);
  expect(screen.getByRole('button', { name: 'Qualified 3' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('button', { name: 'All 9' }).getAttribute('aria-pressed')).toBe('false');
});

test('a click picks that status', async () => {
  const onChange = vi.fn();
  render(<StatusFilter value="all" onChange={onChange} counts={counts} />);
  await userEvent.click(screen.getByRole('button', { name: 'Customer 2' }));
  expect(onChange).toHaveBeenCalledWith('customer');
  await userEvent.click(screen.getByRole('button', { name: 'All 9' }));
  expect(onChange).toHaveBeenLastCalledWith('all');
});
