import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { renderWithProviders } from '../../test/utils';
import { FactList, HeaderFact, LinkedList, RecordColumns, RecordHeader } from './RecordParts';

describe('RecordHeader (UI-REC-01)', () => {
  test('shows the name, the facts, and Edit and Delete', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    renderWithProviders(
      <RecordHeader
        name="Acme Ltd"
        facts={<HeaderFact label="Industry">Software</HeaderFact>}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );
    const header = screen.getByRole('region', { name: 'Summary' });
    expect(within(header).getByRole('heading', { level: 1, name: 'Acme Ltd' })).toBeTruthy();
    expect(within(header).getByText('Industry')).toBeTruthy();
    expect(within(header).getByText('Software')).toBeTruthy();
    await userEvent.click(within(header).getByRole('button', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.click(within(header).getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  test('while loading, it shows placeholders and no buttons (UI-EMPTY-05)', () => {
    renderWithProviders(<RecordHeader loading name="Acme Ltd" facts={<span>Software</span>} />);
    const header = screen.getByRole('region', { name: 'Summary' });
    expect(within(header).getAllByTestId('skeleton')).toHaveLength(2);
    expect(within(header).queryByText('Acme Ltd')).toBeNull();
    expect(within(header).queryByText('Software')).toBeNull();
    expect(within(header).queryByRole('button')).toBeNull();
  });
});

test('FactList pairs each label with its value', () => {
  renderWithProviders(
    <FactList
      items={[
        { label: 'Stage', value: 'Proposal' },
        { label: 'Value', value: <strong>$12.500,00</strong> },
      ]}
    />,
  );
  const terms = screen.getAllByRole('term').map((t) => t.textContent);
  const definitions = screen.getAllByRole('definition').map((d) => d.textContent);
  expect(terms).toEqual(['Stage', 'Value']);
  expect(definitions).toEqual(['Proposal', '$12.500,00']);
});

describe('LinkedList', () => {
  test('lists each record as a link, with its detail and aside', () => {
    renderWithProviders(
      <LinkedList
        title="Contacts"
        emptyText="No contacts yet"
        rows={[
          { id: 1, to: '/contacts/1', name: 'Maria Lopez', detail: 'Head of Ops', aside: <span>Lead</span> },
          { id: 2, to: '/contacts/2', name: 'Tom Becker' },
        ]}
      />,
    );
    const list = screen.getByRole('region', { name: 'Contacts' });
    expect(within(list).getByRole('heading', { name: 'Contacts' })).toBeTruthy();
    const items = within(list).getAllByRole('listitem');
    expect(items.map((i) => i.textContent)).toEqual(['Maria LopezHead of OpsLead', 'Tom Becker']);
    expect(within(list).getByRole('link', { name: 'Maria Lopez' }).getAttribute('href')).toBe('/contacts/1');
    expect(within(list).getByRole('link', { name: 'Tom Becker' }).getAttribute('href')).toBe('/contacts/2');
    expect(within(list).queryByRole('button')).toBeNull();
  });

  test('with no rows it shows the empty line (UI-EMPTY-04)', () => {
    renderWithProviders(<LinkedList title="Deals" emptyText="No deals yet" rows={[]} />);
    const list = screen.getByRole('region', { name: 'Deals' });
    expect(within(list).getByText('No deals yet')).toBeTruthy();
    expect(within(list).queryByRole('list')).toBeNull();
  });

  test('the New button has its own name and starts a new record', async () => {
    const onNew = vi.fn();
    renderWithProviders(
      <LinkedList title="Deals" emptyText="No deals yet" rows={[]} onNew={onNew} newLabel="New deal here" />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'New deal here' }));
    expect(onNew).toHaveBeenCalledOnce();
  });
});

test('RecordColumns puts linked records first, then the timeline', () => {
  const { container } = renderWithProviders(<RecordColumns left={<p>Linked</p>} right={<p>History</p>} />);
  expect(container.textContent).toBe('LinkedHistory');
});
