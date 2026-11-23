import * as Tooltip from '@radix-ui/react-tooltip';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Deal } from '../../api/types';
import { applyMove } from '../../lib/board';
import { mockBoardLayout } from '../../test/boardLayout';
import { makeDeal } from '../../test/listHelpers';
import { Board } from './Board';

const TODAY = '2026-11-23';

const deals: Deal[] = [
  makeDeal(1, { name: 'Data audit', stage: 'new', position: 0 }),
  makeDeal(2, { name: 'Cloud move', stage: 'new', position: 1 }),
  makeDeal(3, { name: 'Support plan', stage: 'new', position: 2 }),
  makeDeal(4, { name: 'Training', stage: 'qualified', probability: 25, position: 0 }),
  makeDeal(5, { name: 'Licences', stage: 'proposal', probability: 50, position: 0 }),
  makeDeal(6, { name: 'Old contract', stage: 'lost', probability: 0, position: 0 }),
];

function board(list: Deal[], onMove = vi.fn(), onOpen = vi.fn(), onAdd = vi.fn()) {
  return (
    <Tooltip.Provider>
      <Board deals={list} today={TODAY} onMove={onMove} onAdd={onAdd} onOpen={onOpen} />
    </Tooltip.Provider>
  );
}

function renderBoard(list: Deal[] = deals) {
  const onMove = vi.fn();
  const onOpen = vi.fn();
  const onAdd = vi.fn();
  const view = render(board(list, onMove, onOpen, onAdd));
  return { onMove, onOpen, onAdd, rerender: (next: Deal[]) => view.rerender(board(next, onMove, onOpen, onAdd)) };
}

const card = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name},`) });

const namesIn = (stage: string) =>
  within(screen.getByRole('region', { name: `${stage} column` }))
    .queryAllByTestId('deal-card')
    .map((c) => c.getAttribute('aria-label')?.split(',')[0]);

async function pickUp(name: string) {
  card(name).focus();
  await userEvent.keyboard('[Space]');
}

beforeEach(() => {
  mockBoardLayout();
});

describe('moving deals with the keyboard (DEC-14, UI-PIPE-06)', () => {
  test('Right moves a card into the next column, and Space drops it there', async () => {
    const { onMove } = renderBoard();
    await pickUp('Cloud move');
    await userEvent.keyboard('[ArrowRight]');
    expect(namesIn('Qualified')).toEqual(['Cloud move', 'Training']);
    expect(namesIn('New')).toEqual(['Data audit', 'Support plan']);
    await userEvent.keyboard('[Space]');
    expect(onMove).toHaveBeenCalledOnce();
    expect(onMove).toHaveBeenCalledWith(2, 'qualified', 0);
  });

  test('Right twice skips on to the column after', async () => {
    const { onMove } = renderBoard();
    await pickUp('Data audit');
    await userEvent.keyboard('[ArrowRight][ArrowRight]');
    expect(namesIn('Proposal')).toContain('Data audit');
    await userEvent.keyboard('[Space]');
    expect(onMove).toHaveBeenCalledWith(1, 'proposal', 0);
  });

  test('a card can be dropped into an empty column (UI-PIPE-08)', async () => {
    const { onMove } = renderBoard();
    expect(namesIn('Negotiation')).toEqual([]);
    await pickUp('Licences');
    await userEvent.keyboard('[ArrowRight]');
    expect(namesIn('Negotiation')).toEqual(['Licences']);
    expect(namesIn('Proposal')).toEqual([]);
    await userEvent.keyboard('[Space]');
    expect(onMove).toHaveBeenCalledWith(5, 'negotiation', 0);
  });

  test('Left moves a card back to the previous column', async () => {
    const { onMove } = renderBoard();
    await pickUp('Training');
    await userEvent.keyboard('[ArrowLeft]');
    expect(namesIn('New')).toContain('Training');
    await userEvent.keyboard('[Space]');
    expect(onMove).toHaveBeenCalledWith(4, 'new', expect.any(Number));
  });

  test('Down moves a card lower in its own column', async () => {
    const { onMove } = renderBoard();
    await pickUp('Data audit');
    await userEvent.keyboard('[ArrowDown]');
    await userEvent.keyboard('[Space]');
    expect(onMove).toHaveBeenCalledWith(1, 'new', 1);
  });

  test('Up moves a card higher in its own column', async () => {
    const { onMove } = renderBoard();
    await pickUp('Support plan');
    await userEvent.keyboard('[ArrowUp]');
    await userEvent.keyboard('[Space]');
    expect(onMove).toHaveBeenCalledWith(3, 'new', 1);
  });

  test('there is nowhere to go past the ends of the board or a column', async () => {
    const { onMove } = renderBoard();
    await pickUp('Data audit');
    await userEvent.keyboard('[ArrowLeft][ArrowUp]');
    await userEvent.keyboard('[Space]');
    expect(namesIn('New')).toEqual(['Data audit', 'Cloud move', 'Support plan']);
    expect(onMove).not.toHaveBeenCalled();

    await pickUp('Old contract');
    await userEvent.keyboard('[ArrowRight][ArrowDown]');
    await userEvent.keyboard('[Space]');
    expect(namesIn('Lost')).toEqual(['Old contract']);
    expect(onMove).not.toHaveBeenCalled();
  });

  test('other keys do not move the card', async () => {
    const { onMove } = renderBoard();
    await pickUp('Cloud move');
    await userEvent.keyboard('[KeyA]');
    await userEvent.keyboard('[Space]');
    expect(onMove).not.toHaveBeenCalled();
  });

  test('Escape cancels the move and puts the card back', async () => {
    const { onMove } = renderBoard();
    await pickUp('Cloud move');
    await userEvent.keyboard('[ArrowRight]');
    expect(namesIn('Qualified')).toContain('Cloud move');
    await userEvent.keyboard('[Escape]');
    expect(namesIn('New')).toEqual(['Data audit', 'Cloud move', 'Support plan']);
    expect(namesIn('Qualified')).toEqual(['Training']);
    expect(onMove).not.toHaveBeenCalled();
  });

  test('while a card is picked up, Enter does not open it', async () => {
    const { onOpen } = renderBoard();
    await pickUp('Cloud move');
    await userEvent.keyboard('[Enter]');
    expect(onOpen).not.toHaveBeenCalled();
    await userEvent.keyboard('[Escape]');
  });

  // docs/frontend-architecture.md: "After a drop, the board keeps its dropped
  // order until the deals list changes (the optimistic update, or the
  // rollback). Without that, the card would flick back for a frame."
  test('after a drop the card stays in its new place until the deals list changes', async () => {
    const { onMove } = renderBoard();
    await pickUp('Cloud move');
    await userEvent.keyboard('[ArrowRight][Space]');
    expect(onMove).toHaveBeenCalledWith(2, 'qualified', 0);
    expect(namesIn('Qualified')).toEqual(['Cloud move', 'Training']);
    expect(namesIn('New')).toEqual(['Data audit', 'Support plan']);
  });

  test('after a drop the board follows the deals list it is given next', async () => {
    const { rerender } = renderBoard();
    await pickUp('Cloud move');
    await userEvent.keyboard('[ArrowRight][Space]');

    // The move went through: the board shows the new list.
    rerender(applyMove(deals, 2, 'qualified', 0, TODAY));
    expect(namesIn('Qualified')).toEqual(['Cloud move', 'Training']);

    // The server refused: the list comes back as it was, and so does the board.
    rerender(deals.map((d) => ({ ...d })));
    expect(namesIn('Qualified')).toEqual(['Training']);
    expect(namesIn('New')).toEqual(['Data audit', 'Cloud move', 'Support plan']);
  });
});

describe('opening and adding', () => {
  test('a click or Enter on a card opens the deal (UI-PIPE-04)', async () => {
    const { onOpen } = renderBoard();
    await userEvent.click(card('Training'));
    expect(onOpen).toHaveBeenLastCalledWith(4);
    card('Licences').focus();
    await userEvent.keyboard('[Enter]');
    expect(onOpen).toHaveBeenLastCalledWith(5);
  });

  test('open columns offer Add deal with their stage; Won and Lost do not (UI-PIPE-05)', async () => {
    const { onAdd } = renderBoard();
    await userEvent.click(screen.getByRole('button', { name: 'Add deal in Proposal' }));
    expect(onAdd).toHaveBeenCalledWith('proposal');
    expect(screen.queryByRole('button', { name: 'Add deal in Won' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add deal in Lost' })).toBeNull();
  });

  test('the six columns run from New to Lost (UI-PIPE-02)', () => {
    renderBoard();
    const columns = within(screen.getByTestId('board')).getAllByRole('region');
    expect(columns.map((c) => c.getAttribute('aria-label'))).toEqual([
      'New column',
      'Qualified column',
      'Proposal column',
      'Negotiation column',
      'Won column',
      'Lost column',
    ]);
  });
});
