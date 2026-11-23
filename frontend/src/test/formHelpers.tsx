// Shared fixtures and fake answers for the form tests.

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Contact, Organization, TimelineEntry } from '../api/types';

/** The server's fixed clock (DEC-12). */
export const TODAY = { today: '2026-11-23', now: '2026-11-23T14:05:00' };

export function organization(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 1,
    name: 'Acme Ltd',
    website: null,
    industry: null,
    notes: null,
    contact_count: 0,
    open_deal_count: 0,
    open_value_cents: 0,
    created_at: '2026-01-05T09:00:00',
    updated_at: '2026-01-05T09:00:00',
    ...overrides,
  };
}

export function contact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 10,
    name: 'Maria Lopez',
    email: null,
    phone: null,
    job_title: null,
    organization_id: null,
    organization_name: null,
    status: 'lead',
    created_at: '2026-01-05T09:00:00',
    updated_at: '2026-01-05T09:00:00',
    ...overrides,
  };
}

export function activity(overrides: Partial<TimelineEntry> = {}): TimelineEntry {
  return {
    key: 'activity-7',
    kind: 'activity',
    id: 7,
    type: 'call',
    description: 'Talked about the renewal',
    from_value: null,
    to_value: null,
    occurred_at: '2026-11-20T10:30:00',
    follow_up_date: null,
    follow_up_done: false,
    deal_id: null,
    contact_id: 10,
    ...overrides,
  };
}

/** A 422 as the API sends it: a message per field. */
export function validationError(errors: Record<string, string>) {
  return new Response(JSON.stringify({ detail: 'Check the highlighted fields', errors }), { status: 422 });
}

/** Any other failure. */
export function serverError(status = 500) {
  return new Response(JSON.stringify({ detail: 'Something broke' }), { status });
}

/** The JSON body a request was sent with. */
export function bodyOf(init?: RequestInit): Record<string, unknown> {
  return JSON.parse(String(init?.body)) as Record<string, unknown>;
}

/** The message shown under a field, found through the field's aria-describedby. */
export function errorFor(field: HTMLElement): string | null {
  const id = field.getAttribute('aria-describedby');
  if (!id) return null;
  return document.getElementById(id)?.textContent ?? null;
}

/** Opens a searchable record select and clicks the option whose text starts with `label`. */
export async function pickRecord(comboboxName: string, label: string) {
  await userEvent.click(screen.getByRole('combobox', { name: comboboxName }));
  const listbox = await screen.findByRole('listbox');
  const option = Array.from(listbox.querySelectorAll<HTMLElement>('[role=option]')).find((o) =>
    o.textContent?.trim().startsWith(label),
  );
  if (!option) throw new Error(`No option ${label}`);
  await userEvent.click(option);
}
