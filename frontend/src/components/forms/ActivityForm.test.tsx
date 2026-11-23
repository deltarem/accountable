import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { TimelineEntry } from '../../api/types';
import { TODAY, activity, bodyOf, errorFor, serverError, validationError } from '../../test/formHelpers';
import { mockFetch, renderWithProviders } from '../../test/utils';
import { ActivityForm, LogActivityForm } from './ActivityForm';

let sent: { method: string; body: Record<string, unknown> } | null = null;
let answer: (init?: RequestInit) => unknown;
let today: unknown;

beforeEach(() => {
  sent = null;
  today = TODAY;
  answer = (init) => ({ id: 7, ...bodyOf(init) });
  const save = (method: string) => (init?: RequestInit) => {
    sent = { method, body: bodyOf(init) };
    return answer(init);
  };
  mockFetch({
    '/api/today': () => today,
    'POST /api/activities': save('POST'),
    'PUT /api/activities/7': save('PUT'),
  });
});

const field = (label: string | RegExp) => screen.getByLabelText(label) as HTMLInputElement;
const description = () => screen.getByLabelText(/^What happened/) as HTMLTextAreaElement;
const when = () => screen.getByLabelText(/^When/) as HTMLInputElement;

describe('ActivityForm (editing)', () => {
  function renderForm(entry: TimelineEntry = activity()) {
    const onDone = vi.fn();
    const onCancel = vi.fn();
    renderWithProviders(<ActivityForm activity={entry} onDone={onDone} onCancel={onCancel} />);
    return { onDone, onCancel };
  }

  test('starts with the activity as it is', () => {
    renderForm(activity({ type: 'email', follow_up_date: '2026-12-01' }));
    expect(screen.getByRole('radio', { name: 'Email' })).toHaveProperty('checked', true);
    expect(description().value).toBe('Talked about the renewal');
    expect(when().value).toBe('2026-11-20T10:30');
    expect(field('Follow-up date').value).toBe('2026-12-01');
  });

  test('an activity with no type or text starts as an empty note', () => {
    renderForm(activity({ type: null, description: null }));
    expect(screen.getByRole('radio', { name: 'Note' })).toHaveProperty('checked', true);
    expect(description().value).toBe('');
  });

  test('UI-FORM-02: a blank description and time are refused, with focus on the first', async () => {
    const { onDone } = renderForm();
    await userEvent.clear(description());
    fireEvent.change(when(), { target: { value: '' } });
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Describe what happened')).toBeTruthy();
    expect(errorFor(description())).toBe('Describe what happened');
    expect(errorFor(when())).toBe('Enter when it happened');
    expect(document.activeElement).toBe(description());
    expect(onDone).not.toHaveBeenCalled();
    expect(sent).toBeNull();
  });

  test('saves the changes with PUT, keeping its record and follow-up state', async () => {
    const { onDone } = renderForm(activity({ follow_up_date: '2026-12-01', follow_up_done: true }));
    await userEvent.click(screen.getByRole('radio', { name: 'Note' }));
    await userEvent.clear(description());
    await userEvent.type(description(), 'Sent the contract');
    fireEvent.change(when(), { target: { value: '2026-11-21T09:15' } });
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(sent).toEqual({
      method: 'PUT',
      body: {
        type: 'note',
        description: 'Sent the contract',
        occurred_at: '2026-11-21T09:15:00',
        follow_up_date: '2026-12-01',
        follow_up_done: true,
        contact_id: 10,
        deal_id: null,
      },
    });
    expect(await screen.findByText('Activity saved')).toBeTruthy();
  });

  test('an activity on neither a contact nor a deal says to choose one', async () => {
    renderForm(activity({ contact_id: null, deal_id: null }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Choose a contact or a deal')).toBeTruthy();
    expect(sent).toBeNull();
  });

  test('UI-FORM-02: an error the server finds shows on its field', async () => {
    answer = () => validationError({ follow_up_date: 'Enter a real date' });
    const { onDone } = renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(errorFor(field('Follow-up date'))).toBe('Enter a real date'));
    expect(errorFor(description())).toBeNull();
    expect(onDone).not.toHaveBeenCalled();
  });

  test('UI-ERR-01: a failed save says so and keeps the form open', async () => {
    answer = () => serverError();
    const { onDone } = renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText("Couldn't save the activity. Try again.")).toBeTruthy();
    expect(description().value).toBe('Talked about the renewal');
    expect(onDone).not.toHaveBeenCalled();
  });

  test('Cancel hands back without saving', async () => {
    const { onCancel } = renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(sent).toBeNull();
  });
});

describe('LogActivityForm (UI-REC-05)', () => {
  function renderLog(record = { contact_id: null as number | null, deal_id: 5 as number | null }) {
    renderWithProviders(<LogActivityForm record={record} />);
    return screen.getByRole('form', { name: 'Log activity' });
  }

  test('starts as a note, happening now on the server clock', async () => {
    const form = renderLog();
    expect(within(form).getByRole('radio', { name: 'Note' })).toHaveProperty('checked', true);
    await waitFor(() => expect(when().value).toBe('2026-11-23T14:05'));
    expect(field('Follow-up date').value).toBe('');
  });

  test('"Log it" saves on the record and clears the form for the next one, keeping the type', async () => {
    renderLog();
    await waitFor(() => expect(when().value).toBe('2026-11-23T14:05'));
    await userEvent.click(screen.getByRole('radio', { name: 'Call' }));
    await userEvent.type(description(), 'Called about pricing');
    fireEvent.change(field('Follow-up date'), { target: { value: '2026-11-30' } });
    await userEvent.click(screen.getByRole('button', { name: 'Log it' }));
    await waitFor(() => expect(sent).not.toBeNull());
    expect(sent).toEqual({
      method: 'POST',
      body: {
        type: 'call',
        description: 'Called about pricing',
        occurred_at: '2026-11-23T14:05:00',
        follow_up_date: '2026-11-30',
        follow_up_done: false,
        contact_id: null,
        deal_id: 5,
      },
    });
    await waitFor(() => expect(description().value).toBe(''));
    expect(field('Follow-up date').value).toBe('');
    expect(when().value).toBe('2026-11-23T14:05');
    expect(screen.getByRole('radio', { name: 'Call' })).toHaveProperty('checked', true);
    expect(await screen.findByText('Activity saved')).toBeTruthy();
  });

  test('UI-FORM-02: a blank description is refused', async () => {
    renderLog({ contact_id: 10, deal_id: null });
    await waitFor(() => expect(when().value).toBe('2026-11-23T14:05'));
    await userEvent.click(screen.getByRole('button', { name: 'Log it' }));
    expect(await screen.findByText('Describe what happened')).toBeTruthy();
    expect(sent).toBeNull();
  });

  test('until the server clock answers, "when" is blank and must be filled in', async () => {
    today = new Promise(() => {});
    renderLog();
    expect(when().value).toBe('');
    await userEvent.type(description(), 'Quick note');
    await userEvent.click(screen.getByRole('button', { name: 'Log it' }));
    expect(await screen.findByText('Enter when it happened')).toBeTruthy();
    expect(sent).toBeNull();
  });

  test('UI-ERR-01: a failed save keeps what was typed', async () => {
    answer = () => serverError();
    renderLog();
    await waitFor(() => expect(when().value).toBe('2026-11-23T14:05'));
    await userEvent.type(description(), 'Called about pricing');
    await userEvent.click(screen.getByRole('button', { name: 'Log it' }));
    expect(await screen.findByText("Couldn't save the activity. Try again.")).toBeTruthy();
    expect(description().value).toBe('Called about pricing');
  });
});
