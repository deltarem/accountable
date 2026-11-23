import * as Tooltip from '@radix-ui/react-tooltip';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import type { Deal } from '../../api/types';
import { makeDeal } from '../../test/listHelpers';
import { Board } from './Board';

const TODAY = '2026-11-23';

function renderCards(deals: Deal[]) {
  render(
    <Tooltip.Provider delayDuration={0}>
      <Board deals={deals} today={TODAY} onMove={() => {}} onAdd={() => {}} onOpen={() => {}} />
    </Tooltip.Provider>,
  );
}

const card = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name},`) });

test('a card shows its value first, then the name and organization (UI-PIPE-04)', () => {
  renderCards([makeDeal(1, { name: 'Data audit', value_cents: 1_250_050, organization_name: 'Globex Corp' })]);
  const c = card('Data audit');
  expect(c.getAttribute('aria-label')).toBe('Data audit, $12.500,50');
  expect(c.textContent).toMatch(/^\$12\.500,50Data auditGlobex Corp/);
  expect(c.textContent).toContain('1 Dec 2026');
});

test('a card with no organization, contact or date says so', () => {
  renderCards([makeDeal(1, { name: 'Loose end', organization_name: null, contact_name: null, close_date: null })]);
  const c = card('Loose end');
  expect(within(c).getByText('No organization')).toBeTruthy();
  expect(within(c).getByText('No date')).toBeTruthy();
  expect(within(c).getByRole('img', { name: 'No main contact' })).toBeTruthy();
});

test('the main contact shows as initials, named in full, with a tooltip', async () => {
  renderCards([makeDeal(1, { name: 'Data audit', contact_name: 'Maria Lopez' })]);
  const initials = within(card('Data audit')).getByRole('img', { name: 'Maria Lopez' });
  expect(initials.textContent).toBe('ML');
  await userEvent.hover(initials);
  expect((await screen.findByRole('tooltip')).textContent).toBe('Maria Lopez');
});

test('an open deal past its close date is marked late (RULE-06)', () => {
  renderCards([
    makeDeal(1, { name: 'Overdue', stage: 'proposal', close_date: '2026-11-20' }),
    makeDeal(2, { name: 'Due today', stage: 'proposal', close_date: TODAY }),
    makeDeal(3, { name: 'Closed won', stage: 'won', close_date: '2026-11-01' }),
    makeDeal(4, { name: 'Closed lost', stage: 'lost', close_date: '2026-10-01' }),
  ]);
  expect(within(card('Overdue')).getByText('Late · 20 Nov 2026')).toBeTruthy();
  expect(within(card('Due today')).getByText('23 Nov 2026')).toBeTruthy();
  expect(within(card('Closed won')).getByText('1 Nov 2026')).toBeTruthy();
  expect(within(card('Closed lost')).getByText('1 Oct 2026')).toBeTruthy();
  expect(screen.getAllByText(/^Late/)).toHaveLength(1);
});
