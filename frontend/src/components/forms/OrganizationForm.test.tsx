import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Organization } from '../../api/types';
import { bodyOf, errorFor, organization, serverError, validationError } from '../../test/formHelpers';
import { mockFetch, renderWithProviders } from '../../test/utils';
import { OrganizationForm } from './OrganizationForm';

const INDUSTRIES = ['Software', 'Logistics', 'Retail', 'Healthcare'];

let sent: { method: string; body: Record<string, unknown> } | null = null;
let answer: (init?: RequestInit) => unknown;

function routes() {
  const save = (method: string) => (init?: RequestInit) => {
    sent = { method, body: bodyOf(init) };
    return answer(init);
  };
  return {
    '/api/industries': INDUSTRIES,
    'POST /api/organizations': save('POST'),
    'PUT /api/organizations/4': save('PUT'),
  };
}

beforeEach(() => {
  sent = null;
  answer = (init) => ({ id: 4, ...bodyOf(init), contacts: [], deals: [], timeline: [] });
  mockFetch(routes());
});

function renderForm(existing?: Organization) {
  const onDone = vi.fn();
  const onCancel = vi.fn();
  renderWithProviders(<OrganizationForm organization={existing} onDone={onDone} onCancel={onCancel} />);
  return { onDone, onCancel };
}

const nameField = () => screen.getByLabelText(/^Name/);

describe('OrganizationForm', () => {
  test('UI-FORM-02: a blank name is refused on save, with focus on it', async () => {
    const { onDone } = renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Enter a name')).toBeTruthy();
    expect(errorFor(nameField())).toBe('Enter a name');
    expect(document.activeElement).toBe(nameField());
    expect(sent).toBeNull();
    expect(onDone).not.toHaveBeenCalled();
  });

  test('UI-FORM-02: an error shows when a field is left, and goes once it is fixed', async () => {
    renderForm();
    await userEvent.click(nameField());
    await userEvent.tab();
    expect(await screen.findByText('Enter a name')).toBeTruthy();
    await userEvent.type(nameField(), 'Acme');
    await waitFor(() => expect(screen.queryByText('Enter a name')).toBeNull());
  });

  test('notes longer than 5.000 characters are refused under Notes', async () => {
    renderForm();
    await userEvent.type(nameField(), 'Acme');
    await userEvent.click(screen.getByLabelText('Notes'));
    await userEvent.paste('n'.repeat(5001));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(errorFor(await screen.findByLabelText('Notes'))).toBe('Use 5.000 characters or fewer');
    expect(sent).toBeNull();
  });

  test('UI-FORM-05, UI-FORM-07: saving a new organization adds https:// and confirms it', async () => {
    const { onDone } = renderForm();
    await userEvent.type(nameField(), '  Northwind Traders ');
    await userEvent.type(screen.getByLabelText('Website'), 'northwind.example');
    await userEvent.type(screen.getByLabelText('Notes'), 'Met at the fair');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(sent).toEqual({
      method: 'POST',
      body: {
        name: 'Northwind Traders',
        website: 'https://northwind.example',
        industry: null,
        notes: 'Met at the fair',
      },
    });
    expect(onDone.mock.calls[0][0]).toMatchObject({ id: 4, name: 'Northwind Traders' });
    expect(await screen.findByText('Organization saved')).toBeTruthy();
  });

  test('UI-FORM-06: the industry field suggests industries in use and Enter picks one', async () => {
    const { onDone } = renderForm();
    await userEvent.type(nameField(), 'Acme');
    const industry = screen.getByLabelText('Industry');
    await userEvent.type(industry, 'soft');
    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Software']);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect((industry as HTMLInputElement).value).toBe('Software');
    expect(screen.queryByRole('listbox')).toBeNull();
    // Enter picked the suggestion; it did not save the form.
    expect(sent).toBeNull();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(sent?.body).toMatchObject({ industry: 'Software', website: null });
  });

  test('editing keeps what is there and saves with PUT', async () => {
    const { onDone } = renderForm(
      organization({
        id: 4,
        name: 'Globex Corp',
        website: 'http://globex.example',
        industry: 'Retail',
        notes: 'Two offices',
      }),
    );
    expect((nameField() as HTMLInputElement).value).toBe('Globex Corp');
    expect((screen.getByLabelText('Website') as HTMLInputElement).value).toBe('http://globex.example');
    expect((screen.getByLabelText('Industry') as HTMLInputElement).value).toBe('Retail');
    expect((screen.getByLabelText('Notes') as HTMLTextAreaElement).value).toBe('Two offices');
    await userEvent.clear(screen.getByLabelText('Notes'));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(sent).toEqual({
      method: 'PUT',
      body: { name: 'Globex Corp', website: 'http://globex.example', industry: 'Retail', notes: null },
    });
  });

  test('UI-FORM-02: an error the server finds shows on its field, with focus there', async () => {
    answer = () => validationError({ name: 'An organization with this name already exists' });
    const { onDone } = renderForm();
    await userEvent.type(nameField(), 'Acme Ltd');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('An organization with this name already exists')).toBeTruthy();
    expect(errorFor(nameField())).toBe('An organization with this name already exists');
    expect(document.activeElement).toBe(nameField());
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.queryByText('Organization saved')).toBeNull();
  });

  test('UI-ERR-01: a failed save says so and keeps what was typed', async () => {
    answer = () => serverError();
    const { onDone } = renderForm();
    await userEvent.type(nameField(), 'Acme Ltd');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText("Couldn't save the organization. Try again.")).toBeTruthy();
    expect((nameField() as HTMLInputElement).value).toBe('Acme Ltd');
    expect(onDone).not.toHaveBeenCalled();
  });

  test('UI-ERR-01: a 422 without field messages is a plain failure', async () => {
    answer = () => new Response(JSON.stringify({ detail: 'Unprocessable' }), { status: 422 });
    renderForm();
    await userEvent.type(nameField(), 'Acme Ltd');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText("Couldn't save the organization. Try again.")).toBeTruthy();
    expect(errorFor(nameField())).toBeNull();
  });

  test('UI-ERR-01: an unreachable server says so too', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === '/api/industries') return new Response(JSON.stringify(INDUSTRIES));
        throw new TypeError('Failed to fetch');
      }),
    );
    renderForm();
    await userEvent.type(nameField(), 'Acme Ltd');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText("Couldn't save the organization. Try again.")).toBeTruthy();
  });

  test('Cancel hands back without saving', async () => {
    const { onCancel } = renderForm();
    await userEvent.type(nameField(), 'Acme Ltd');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(sent).toBeNull();
  });
});
