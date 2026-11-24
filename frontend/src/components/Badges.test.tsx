import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { LateBadge, StageBadge, StatusBadge } from './Badges';

test('a stage badge names the stage in its own colours (DES-02)', () => {
  render(<StageBadge stage="proposal" />);
  const badge = screen.getByText('Proposal');
  expect(badge.style.color).toBe('var(--coral-text)');
  expect(badge.style.background).toBe('var(--coral-tint)');
});

test('an unknown stage falls back to New', () => {
  render(<StageBadge stage="archived" />);
  expect(screen.getByText('New')).toBeTruthy();
});

test('a status badge names the status in its own colours', () => {
  render(<StatusBadge status="customer" />);
  const badge = screen.getByText('Customer');
  expect(badge.style.color).toBe('var(--sea-text)');
  expect(badge.style.background).toBe('var(--sea-tint)');
});

test('an unknown status falls back to Lead', () => {
  render(<StatusBadge status="partner" />);
  expect(screen.getByText('Lead')).toBeTruthy();
});

test('the late badge reads Late', () => {
  render(<LateBadge />);
  expect(screen.getByText('Late')).toBeTruthy();
});
