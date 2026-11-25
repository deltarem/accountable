import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';

import type { ContactDetail, DealDetail, OrganizationDetail } from './api/types';
import { routes } from './routes';
import { giveChartsASize } from './test/chartSize';
import { makeDashboard } from './test/dashboardFixtures';
import { railLink, renderRoutes } from './test/shellHelpers';
import { mockFetch } from './test/utils';

const STAMP = '2026-11-01T10:00:00';

const organization: OrganizationDetail = {
  id: 3,
  name: 'Pinecrest Hotels',
  website: null,
  industry: 'Hospitality',
  notes: null,
  contact_count: 0,
  open_deal_count: 0,
  open_value_cents: 0,
  created_at: STAMP,
  updated_at: STAMP,
  created_by_name: null,
  updated_by_name: null,
  contacts: [],
  deals: [],
  timeline: [],
};

const contact: ContactDetail = {
  id: 4,
  name: 'Maria Lopez',
  email: null,
  phone: null,
  job_title: null,
  organization_id: null,
  organization_name: null,
  status: 'lead',
  created_at: STAMP,
  updated_at: STAMP,
  created_by_name: null,
  updated_by_name: null,
  deals: [],
  timeline: [],
};

const deal: DealDetail = {
  id: 7,
  name: 'Booking engine',
  organization_id: 3,
  organization_name: 'Pinecrest Hotels',
  contact_id: null,
  contact_name: null,
  stage: 'proposal',
  value_cents: 1_000_000,
  probability: 50,
  close_date: null,
  position: 0,
  late: false,
  expected_cents: 500_000,
  created_at: STAMP,
  updated_at: STAMP,
  created_by_name: null,
  updated_by_name: null,
  timeline: [],
};

function mockServer() {
  return mockFetch({
    '/api/today': { today: '2026-11-23', now: '2026-11-23T14:05:00' },
    '/api/dashboard': makeDashboard(),
    '/api/deals': [],
    '/api/contacts': [],
    '/api/organizations': [],
    '/api/deals/7': deal,
    '/api/contacts/4': contact,
    '/api/organizations/3': organization,
  });
}

describe('addresses (UI-LAY-04)', () => {
  test.each([
    ['/', 'Dashboard'],
    ['/pipeline', 'Pipeline'],
    ['/deals', 'Deals'],
    ['/contacts', 'Contacts'],
    ['/organizations', 'Organizations'],
  ])('%s shows the %s page inside the shell', async (path, title) => {
    giveChartsASize();
    mockServer();
    renderRoutes(routes, path);
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeTruthy();
    expect(railLink(title).getAttribute('aria-current')).toBe('page');
  });

  test.each([
    ['/deals/7', 'Booking engine', 'Deals'],
    ['/contacts/4', 'Maria Lopez', 'Contacts'],
    ['/organizations/3', 'Pinecrest Hotels', 'Organizations'],
  ])('%s loads that record and shows its name', async (path, name, section) => {
    const spy = mockServer();
    renderRoutes(routes, path);
    expect(await screen.findByRole('heading', { level: 1, name })).toBeTruthy();
    expect(spy.mock.calls.map(([url]) => url)).toContain(`/api${path}`);
    expect(railLink(section).getAttribute('aria-current')).toBe('page');
  });

  test('any other address shows "Page not found" with a way back to the dashboard', async () => {
    giveChartsASize();
    mockServer();
    const { currentPath } = renderRoutes(routes, '/reports/2026');
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeTruthy();
    expect(screen.getByText("There's nothing at this address.")).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeTruthy();

    await userEvent.click(screen.getByRole('link', { name: 'Go to the dashboard' }));
    expect(currentPath()).toBe('/');
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeTruthy();
  });

  test('the back button returns to the previous page', async () => {
    mockServer();
    const { goBack } = renderRoutes(routes, '/deals');
    await screen.findByRole('heading', { level: 1, name: 'Deals' });
    await userEvent.click(railLink('Contacts'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Contacts' })).toBeTruthy();
    goBack();
    expect(await screen.findByRole('heading', { level: 1, name: 'Deals' })).toBeTruthy();
  });
});
