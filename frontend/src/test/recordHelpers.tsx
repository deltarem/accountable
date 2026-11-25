import type { ReactElement } from 'react';
import { Route, Routes, useLocation } from 'react-router';

import type { TimelineEntry } from '../api/types';
import { FormsProvider } from '../components/forms/FormsProvider';
import { renderWithProviders } from './utils';

/** The server's fixed clock for every record test (DEC-12). */
export const TODAY = { today: '2026-11-23', now: '2026-11-23T14:05:00' };

/** A timeline entry: a note on deal 5 unless told otherwise. */
export function entry(overrides: Partial<TimelineEntry> = {}): TimelineEntry {
  return {
    key: 'activity-1',
    kind: 'activity',
    id: 1,
    type: 'note',
    description: 'Sent the proposal',
    from_value: null,
    to_value: null,
    occurred_at: '2026-11-20T10:30:00',
    follow_up_date: null,
    follow_up_done: false,
    deal_id: 5,
    contact_id: null,
    created_by_name: null,
    ...overrides,
  };
}

/** A plain 500, for load and save failures. */
export function serverError() {
  return new Response(JSON.stringify({ detail: 'Something broke' }), { status: 500 });
}

/** A 404, as the API answers for a record that doesn't exist. */
export function notFound(what: string) {
  return new Response(JSON.stringify({ detail: `${what} not found` }), { status: 404 });
}

function Location() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

/**
 * Renders a record page at `route`, with the form and delete dialogs around
 * it, and stand-ins for the three list pages so a test can see where a back
 * link or a delete took the user. The current path is in the "location" test id.
 */
export function renderRecordPage(page: ReactElement, path: string, route: string) {
  return renderWithProviders(
    <FormsProvider>
      <Location />
      <Routes>
        <Route path={path} element={page} />
        <Route path="/organizations" element={<h1>Organizations list</h1>} />
        <Route path="/contacts" element={<h1>Contacts list</h1>} />
        <Route path="/deals" element={<h1>Deals list</h1>} />
        <Route path="*" element={<h1>Another page</h1>} />
      </Routes>
    </FormsProvider>,
    { route },
  );
}

/** Renders any record component with the form and delete dialogs around it. */
export function renderWithForms(ui: ReactElement) {
  return renderWithProviders(<FormsProvider>{ui}</FormsProvider>);
}
