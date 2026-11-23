import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Contact } from '../../api/types';
import {
  bodyOf,
  contact,
  errorFor,
  organization,
  pickRecord,
  serverError,
  validationError,
} from '../../test/formHelpers';
import { mockFetch, renderWithProviders } from '../../test/utils';
import { ContactForm } from './ContactForm';

const ORGANIZATIONS = [organization({ id: 1, name: 'Acme Ltd' }), organization({ id: 2, name: 'Globex Corp' })];

let sent: { method: string; body: Record<string, unknown> } | null = null;
let answer: (init?: RequestInit) => unknown;

beforeEach(() => {
  sent = null;
  answer = (init) => ({ id: 10, ...bodyOf(init), organization_name: null, deals: [], timeline: [] });
  const save = (method: string) => (init?: RequestInit) => {
    sent = { method, body: bodyOf(init) };
    return answer(init);
  };
  mockFetch({
    '/api/organizations': ORGANIZATIONS,
    'POST /api/contacts': save('POST'),
    'PUT /api/contacts/10': save('PUT'),
  });
});

function renderForm(props: { contact?: Contact; defaults?: { organization_id?: number | null } } = {}) {
  const onDone = vi.fn();
  const onCancel = vi.fn();
  renderWithProviders(<ContactForm {...props} onDone={onDone} onCancel={onCancel} />);
  return { onDone, onCancel };
}

const field = (label: string | RegExp) => screen.getByLabelText(label) as HTMLInputElement;
const save = () => userEvent.click(screen.getByRole('button', { name: 'Save' }));

describe('ContactForm', () => {
  test('a new contact starts as a lead with no organization', () => {
    renderForm();
    expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('lead');
    expect(screen.getByRole('combobox', { name: 'Organization' }).textContent).toBe('No organization');
  });

  test('UI-FORM-02: a blank name is refused on save, with focus on it', async () => {
    const { onDone } = renderForm();
    await save();
    expect(await screen.findByText('Enter a name')).toBeTruthy();
    expect(errorFor(field(/^Name/))).toBe('Enter a name');
    expect(document.activeElement).toBe(field(/^Name/));
    expect(onDone).not.toHaveBeenCalled();
    expect(sent).toBeNull();
  });

  test('UI-FORM-02: an unclear email is flagged when the field is left', async () => {
    renderForm();
    await userEvent.type(field('Email'), 'maria@acme');
    await userEvent.tab();
    expect(await screen.findByText('Enter an email like name@company.com')).toBeTruthy();
    expect(errorFor(field('Email'))).toBe('Enter an email like name@company.com');
    expect(field('Email').getAttribute('aria-invalid')).toBe('true');
    await userEvent.type(field('Email'), '.example');
    await waitFor(() => expect(errorFor(field('Email'))).toBeNull());
  });

  test('UI-FORM-03, UI-FORM-05: saves a new contact at the organization picked from the list', async () => {
    const { onDone } = renderForm();
    await userEvent.type(field(/^Name/), 'Maria Lopez');
    await userEvent.type(field('Email'), 'maria@acme.example');
    await userEvent.type(field('Job title'), 'Buyer');
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'qualified');
    await screen.findByText('No organization');
    await pickRecord('Organization', 'Globex Corp');
    expect(screen.getByRole('combobox', { name: 'Organization' }).textContent).toBe('Globex Corp');
    await save();
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(sent).toEqual({
      method: 'POST',
      body: {
        name: 'Maria Lopez',
        email: 'maria@acme.example',
        phone: null,
        job_title: 'Buyer',
        organization_id: 2,
        status: 'qualified',
      },
    });
    expect(onDone.mock.calls[0][0]).toMatchObject({ id: 10, name: 'Maria Lopez' });
    expect(await screen.findByText('Contact saved')).toBeTruthy();
  });

  test('starts with the organization it was opened from', async () => {
    renderForm({ defaults: { organization_id: 1 } });
    expect(await screen.findByText('Acme Ltd')).toBeTruthy();
  });

  test('editing keeps what is there, can clear the organization, and saves with PUT', async () => {
    const { onDone } = renderForm({
      contact: contact({
        id: 10,
        name: 'Maria Lopez',
        email: 'maria@acme.example',
        phone: '+1 555 0100',
        job_title: 'Buyer',
        organization_id: 1,
        organization_name: 'Acme Ltd',
        status: 'customer',
      }),
    });
    expect(field(/^Name/).value).toBe('Maria Lopez');
    expect(field('Phone').value).toBe('+1 555 0100');
    expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('customer');
    await screen.findByText('Acme Ltd');
    await pickRecord('Organization', 'No organization');
    expect(screen.getByRole('combobox', { name: 'Organization' }).textContent).toBe('No organization');
    await save();
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(sent).toEqual({
      method: 'PUT',
      body: {
        name: 'Maria Lopez',
        email: 'maria@acme.example',
        phone: '+1 555 0100',
        job_title: 'Buyer',
        organization_id: null,
        status: 'customer',
      },
    });
  });

  test('UI-FORM-02: errors the server finds show on their own fields', async () => {
    answer = () =>
      validationError({ email: 'Enter an email like name@company.com', phone: 'Use 200 characters or fewer' });
    const { onDone } = renderForm();
    await userEvent.type(field(/^Name/), 'Maria Lopez');
    await userEvent.type(field('Phone'), '0100');
    await save();
    await waitFor(() => expect(errorFor(field('Email'))).toBe('Enter an email like name@company.com'));
    expect(errorFor(field('Phone'))).toBe('Use 200 characters or fewer');
    expect(errorFor(field(/^Name/))).toBeNull();
    expect(document.activeElement).toBe(field('Email'));
    expect(onDone).not.toHaveBeenCalled();
  });

  test('UI-ERR-01: a failed save says so and keeps the form as typed', async () => {
    answer = () => serverError();
    const { onDone } = renderForm();
    await userEvent.type(field(/^Name/), 'Maria Lopez');
    await save();
    expect(await screen.findByText("Couldn't save the contact. Try again.")).toBeTruthy();
    expect(field(/^Name/).value).toBe('Maria Lopez');
    expect(onDone).not.toHaveBeenCalled();
  });

  test('Cancel hands back without saving', async () => {
    const { onCancel } = renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(sent).toBeNull();
  });
});
