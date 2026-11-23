import { screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Route, Routes, useLocation } from 'react-router';

import type { Contact, Deal, Organization } from '../api/types';
import { FormsProvider } from '../components/forms/FormsProvider';
import { renderWithProviders } from './utils';

export const TODAY = { today: '2026-11-23', now: '2026-11-23T14:05:00' };

const STAMPS = { created_at: '2026-11-01T10:00:00', updated_at: '2026-11-01T10:00:00' };

export function makeDeal(id: number, extra: Partial<Deal> = {}): Deal {
  return {
    id,
    name: `Deal ${id}`,
    organization_id: 1,
    organization_name: 'Acme Ltd',
    contact_id: null,
    contact_name: null,
    stage: 'new',
    value_cents: 100_000,
    probability: 10,
    close_date: '2026-12-01',
    position: id,
    late: false,
    expected_cents: 10_000,
    ...STAMPS,
    ...extra,
  };
}

export function makeContact(id: number, extra: Partial<Contact> = {}): Contact {
  return {
    id,
    name: `Contact ${id}`,
    email: null,
    phone: null,
    job_title: null,
    organization_id: null,
    organization_name: null,
    status: 'lead',
    ...STAMPS,
    ...extra,
  };
}

export function makeOrganization(id: number, extra: Partial<Organization> = {}): Organization {
  return {
    id,
    name: `Organization ${id}`,
    website: null,
    industry: null,
    notes: null,
    contact_count: 0,
    open_deal_count: 0,
    open_value_cents: 0,
    ...STAMPS,
    ...extra,
  };
}

function LocationProbe() {
  return <p data-testid="location">{useLocation().pathname}</p>;
}

/** Renders a page at its address, with the shared forms and a probe showing where the router is. */
export function renderPage(page: ReactElement, path: string) {
  return renderWithProviders(
    <FormsProvider>
      <Routes>
        <Route path={path} element={page} />
        <Route path="*" element={null} />
      </Routes>
      <LocationProbe />
    </FormsProvider>,
    { route: path },
  );
}

export const currentPath = () => screen.getByTestId('location').textContent;

/** The text of one column for each body row, top to bottom. */
export function columnText(index: number) {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[index].textContent);
}

/** A fake endpoint that fails with a server error the first `times` calls, then answers with the data. */
export function failThenAnswer(times: number, data: unknown) {
  let calls = 0;
  return () => {
    calls += 1;
    return calls <= times ? new Response(JSON.stringify({ detail: 'Server error' }), { status: 500 }) : data;
  };
}

/** The JSON body of the last call to fetch for one method and path. */
export function sentBody(fetchSpy: { mock: { calls: unknown[][] } }, method: string, url: string) {
  const call = fetchSpy.mock.calls.filter(
    ([input, init]) => input === url && ((init as RequestInit | undefined)?.method ?? 'GET') === method,
  );
  const init = call.at(-1)?.[1] as RequestInit | undefined;
  return init?.body ? JSON.parse(String(init.body)) : undefined;
}
