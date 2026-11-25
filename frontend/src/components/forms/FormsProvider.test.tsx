import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Deal } from '../../api/types';
import { TODAY, activity, bodyOf, contact, organization, serverError } from '../../test/formHelpers';
import { mockFetch, renderWithProviders } from '../../test/utils';
import { FormsProvider, useForms } from './FormsProvider';

const deal: Deal = {
  id: 3,
  name: 'Acme renewal',
  organization_id: 1,
  organization_name: 'Acme Ltd',
  contact_id: null,
  contact_name: null,
  stage: 'proposal',
  value_cents: 2_400_000,
  probability: 50,
  close_date: null,
  position: 0,
  late: false,
  expected_cents: 1_200_000,
  created_at: '2026-01-05T09:00:00',
  updated_at: '2026-01-05T09:00:00',
  created_by_name: null,
  updated_by_name: null,
};

let calls: string[] = [];
let deleteAnswer: () => unknown;

beforeEach(() => {
  calls = [];
  deleteAnswer = () => new Response(null, { status: 204 });
  const track =
    (name: string, reply: (init?: RequestInit) => unknown) =>
    (init?: RequestInit): unknown => {
      calls.push(name);
      return reply(init);
    };
  mockFetch({
    '/api/today': TODAY,
    '/api/organizations': [organization({ id: 1, name: 'Acme Ltd' })],
    '/api/contacts': [],
    '/api/industries': [],
    'POST /api/organizations': track('POST /api/organizations', (init) => ({ id: 41, ...bodyOf(init) })),
    'PUT /api/contacts/10': track('PUT /api/contacts/10', (init) => ({ id: 10, ...bodyOf(init) })),
    'POST /api/deals': track('POST /api/deals', (init) => ({ id: 77, ...bodyOf(init) })),
    'PUT /api/activities/7': track('PUT /api/activities/7', (init) => ({ id: 7, ...bodyOf(init) })),
    '/api/deals/3/delete-impact': { name: 'Acme renewal', activities: 5, events: 2 },
    '/api/organizations/1/delete-impact': () => serverError(),
    'DELETE /api/deals/3': track('DELETE /api/deals/3', () => deleteAnswer()),
    'DELETE /api/activities/7': track('DELETE /api/activities/7', () => deleteAnswer()),
  });
});

type Spies = { onSaved: ReturnType<typeof vi.fn>; onDeleted: ReturnType<typeof vi.fn> };

/** Buttons that ask the provider for each form and each delete, the way pages do. */
function Opener({ onSaved, onDeleted }: Spies) {
  const { openForm, confirmDelete } = useForms();
  return (
    <div>
      <button onClick={() => openForm({ kind: 'organization', onSaved })}>Add organization</button>
      <button onClick={() => openForm({ kind: 'contact', record: contact({ id: 10 }), onSaved })}>Edit contact</button>
      <button onClick={() => openForm({ kind: 'contact', defaults: { organization_id: 1 } })}>Add contact</button>
      <button onClick={() => openForm({ kind: 'deal', defaults: { organization_id: 1 }, onSaved })}>Add deal</button>
      <button onClick={() => openForm({ kind: 'deal', record: deal })}>Edit deal</button>
      <button onClick={() => openForm({ kind: 'activity', record: activity(), onSaved })}>Edit activity</button>
      <button onClick={() => confirmDelete({ kind: 'deals', id: 3, onDeleted })}>Delete deal</button>
      <button onClick={() => confirmDelete({ kind: 'organizations', id: 1, onDeleted })}>Delete organization</button>
      <button onClick={() => confirmDelete({ kind: 'activities', activity: activity(), onDeleted })}>
        Delete call
      </button>
      <button onClick={() => confirmDelete({ kind: 'activities', activity: activity({ type: null }) })}>
        Delete untyped
      </button>
    </div>
  );
}

function renderProvider() {
  const spies: Spies = { onSaved: vi.fn(), onDeleted: vi.fn() };
  renderWithProviders(
    <FormsProvider>
      <Opener {...spies} />
    </FormsProvider>,
  );
  return spies;
}

const open = (name: string) => userEvent.click(screen.getByRole('button', { name }));

describe('FormsProvider forms (UI-FORM-01)', () => {
  test('a new organization opens titled "New organization" with the first field focused', async () => {
    renderProvider();
    await open('Add organization');
    const dialog = await screen.findByRole('dialog', { name: 'New organization' });
    expect(document.activeElement).toBe(within(dialog).getByLabelText(/^Name/));
  });

  test('UI-FORM-05: saving closes the dialog, confirms it and hands back the new id', async () => {
    const { onSaved } = renderProvider();
    await open('Add organization');
    const dialog = await screen.findByRole('dialog', { name: 'New organization' });
    await userEvent.type(within(dialog).getByLabelText(/^Name/), 'Northwind Traders{Enter}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onSaved).toHaveBeenCalledWith(41);
    expect(await screen.findByText('Organization saved')).toBeTruthy();
  });

  test('an existing contact opens as "Edit contact" and saves to it', async () => {
    const { onSaved } = renderProvider();
    await open('Edit contact');
    const dialog = await screen.findByRole('dialog', { name: 'Edit contact' });
    expect((within(dialog).getByLabelText(/^Name/) as HTMLInputElement).value).toBe('Maria Lopez');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(10));
    expect(calls).toContain('PUT /api/contacts/10');
  });

  test('a contact started from an organization has it filled in', async () => {
    renderProvider();
    await open('Add contact');
    const dialog = await screen.findByRole('dialog', { name: 'New contact' });
    expect(await within(dialog).findByText('Acme Ltd')).toBeTruthy();
  });

  test('deals open as "New deal" or "Edit deal"', async () => {
    const { onSaved } = renderProvider();
    await open('Edit deal');
    let dialog = await screen.findByRole('dialog', { name: 'Edit deal' });
    expect((within(dialog).getByLabelText(/^Name/) as HTMLInputElement).value).toBe('Acme renewal');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await open('Add deal');
    dialog = await screen.findByRole('dialog', { name: 'New deal' });
    // A fresh form, not the one opened before.
    expect((within(dialog).getByLabelText(/^Name/) as HTMLInputElement).value).toBe('');
    await within(dialog).findByText('Acme Ltd');
    await userEvent.type(within(dialog).getByLabelText(/^Name/), 'Acme expansion');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(77));
  });

  test('an activity opens as "Edit activity" and hands back its own id', async () => {
    const { onSaved } = renderProvider();
    await open('Edit activity');
    const dialog = await screen.findByRole('dialog', { name: 'Edit activity' });
    // The first field is the type buttons.
    expect(within(dialog).getByRole('radiogroup', { name: 'Type' }).contains(document.activeElement)).toBe(true);
    expect(within(dialog).getByRole('radio', { name: 'Call' })).toHaveProperty('checked', true);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(7));
    expect(calls).toEqual(['PUT /api/activities/7']);
  });

  test('Escape and the close button close the form without saving', async () => {
    const { onSaved } = renderProvider();
    await open('Add organization');
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await open('Add organization');
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onSaved).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });
});

describe('FormsProvider deletes (UI-DEL-01..04)', () => {
  test('a deal delete says what will go, then deletes and confirms it', async () => {
    const { onDeleted } = renderProvider();
    await open('Delete deal');
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete Acme renewal?' });
    expect(
      within(dialog).getByText("Its 5 activities and its stage history will be deleted. This can't be undone."),
    ).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(calls).toEqual(['DELETE /api/deals/3']);
    expect(onDeleted).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Deal deleted')).toBeTruthy();
  });

  test('Cancel leaves the record alone', async () => {
    const { onDeleted } = renderProvider();
    await open('Delete deal');
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(calls).toEqual([]);
    expect(onDeleted).not.toHaveBeenCalled();
  });

  test('UI-ERR-01: a failed delete says so and keeps the dialog open', async () => {
    deleteAnswer = () => serverError();
    const { onDeleted } = renderProvider();
    await open('Delete deal');
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText("Couldn't delete the deal. Try again.")).toBeTruthy();
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  test('if the delete impact cannot be loaded, no dialog opens and a message says so', async () => {
    renderProvider();
    await open('Delete organization');
    expect(await screen.findByText("Couldn't check what deleting would change. Try again.")).toBeTruthy();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  test('UI-DEL-04: an activity delete names its type and deletes it', async () => {
    const { onDeleted } = renderProvider();
    await open('Delete call');
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete this call?' });
    expect(within(dialog).getByText("This can't be undone.")).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(calls).toEqual(['DELETE /api/activities/7']);
    expect(await screen.findByText('Activity deleted')).toBeTruthy();
  });

  test('an activity with no type is deleted as a note', async () => {
    renderProvider();
    await open('Delete untyped');
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete this note?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Activity deleted')).toBeTruthy();
    expect(calls).toEqual(['DELETE /api/activities/7']);
  });
});

describe('useForms outside a provider', () => {
  test('asking for a form or a delete does nothing', async () => {
    const spies: Spies = { onSaved: vi.fn(), onDeleted: vi.fn() };
    renderWithProviders(<Opener {...spies} />);
    await open('Add organization');
    await open('Delete deal');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
