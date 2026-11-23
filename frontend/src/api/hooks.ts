// One typed function and one TanStack Query hook per endpoint (ARC-10).
// Every save invalidates what it affects, so lists, pages, the board and the
// dashboard stay in step with the database.

import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  ActivityPayload,
  ContactPayload,
  DealPayload,
  OrganizationPayload,
} from '../lib/schemas';
import { applyMove } from '../lib/board';
import { api } from './client';
import type {
  Activity,
  Contact,
  ContactDetail,
  Dashboard,
  Deal,
  DealDetail,
  Organization,
  OrganizationDetail,
  Today,
} from './types';

export const keys = {
  organizations: ['organizations'] as const,
  organization: (id: number) => ['organization', id] as const,
  contacts: ['contacts'] as const,
  contact: (id: number) => ['contact', id] as const,
  deals: ['deals'] as const,
  deal: (id: number) => ['deal', id] as const,
  dashboard: ['dashboard'] as const,
  industries: ['industries'] as const,
  today: ['today'] as const,
};

type Scope = 'organization' | 'contact' | 'deal' | 'activity';

const AFFECTS: Record<Scope, string[]> = {
  // Organization names show in contacts, deals and dashboard rows.
  organization: ['organizations', 'organization', 'contacts', 'contact', 'deals', 'deal', 'dashboard', 'industries'],
  // Contacts show on organizations (counts, lists), deals (main contact) and timelines.
  contact: ['contacts', 'contact', 'organizations', 'organization', 'deals', 'deal', 'dashboard'],
  // A deal changes counts, the board, timelines and maybe a contact's status.
  deal: ['deals', 'deal', 'organizations', 'organization', 'contacts', 'contact', 'dashboard'],
  // Activities show on timelines and the dashboard.
  activity: ['deal', 'contact', 'organization', 'dashboard'],
};

export function invalidate(qc: QueryClient, scope: Scope) {
  return Promise.all(AFFECTS[scope].map((key) => qc.invalidateQueries({ queryKey: [key] })));
}

// Reads

export const useToday = () =>
  useQuery({ queryKey: keys.today, queryFn: () => api.get<Today>('/today'), refetchOnWindowFocus: true, staleTime: 0 });

export const useOrganizations = () =>
  useQuery({ queryKey: keys.organizations, queryFn: () => api.get<Organization[]>('/organizations') });

export const useOrganization = (id: number) =>
  useQuery({ queryKey: keys.organization(id), queryFn: () => api.get<OrganizationDetail>(`/organizations/${id}`) });

export const useContacts = () => useQuery({ queryKey: keys.contacts, queryFn: () => api.get<Contact[]>('/contacts') });

export const useContact = (id: number) =>
  useQuery({ queryKey: keys.contact(id), queryFn: () => api.get<ContactDetail>(`/contacts/${id}`) });

export const useDeals = () => useQuery({ queryKey: keys.deals, queryFn: () => api.get<Deal[]>('/deals') });

export const useDeal = (id: number) =>
  useQuery({ queryKey: keys.deal(id), queryFn: () => api.get<DealDetail>(`/deals/${id}`) });

export const useDashboard = () =>
  useQuery({
    queryKey: keys.dashboard,
    queryFn: () => api.get<Dashboard>('/dashboard'),
    // Fetched again whenever the dashboard is opened (UI-DASH-08).
    refetchOnMount: 'always',
  });

export const useIndustries = (enabled = true) =>
  useQuery({ queryKey: keys.industries, queryFn: () => api.get<string[]>('/industries'), enabled });

export type DeleteKind = 'organizations' | 'contacts' | 'deals';

export interface DeleteImpact {
  name: string;
  contacts?: number;
  deals?: number;
  activities?: number;
  events?: number;
}

export const fetchDeleteImpact = (kind: DeleteKind, id: number) =>
  api.get<DeleteImpact>(`/${kind}/${id}/delete-impact`);

// Saves

function useSave<TBody, TResult>(scope: Scope, fn: (body: TBody) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate(qc, scope) });
}

export const useSaveOrganization = () =>
  useSave(
    'organization',
    ({ id, body }: { id?: number; body: OrganizationPayload }) =>
      id ? api.put<OrganizationDetail>(`/organizations/${id}`, body) : api.post<OrganizationDetail>('/organizations', body),
  );

export const useSaveContact = () =>
  useSave('contact', ({ id, body }: { id?: number; body: ContactPayload }) =>
    id ? api.put<ContactDetail>(`/contacts/${id}`, body) : api.post<ContactDetail>('/contacts', body),
  );

export const useSaveDeal = () =>
  useSave('deal', ({ id, body }: { id?: number; body: DealPayload }) =>
    id ? api.put<DealDetail>(`/deals/${id}`, body) : api.post<DealDetail>('/deals', body),
  );

export const useSaveActivity = () =>
  useSave('activity', ({ id, body }: { id?: number; body: ActivityPayload }) =>
    id ? api.put<Activity>(`/activities/${id}`, body) : api.post<Activity>('/activities', body),
  );

export const useSetDone = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) => api.post<Activity>(`/activities/${id}/done`, { done }),
    onSuccess: () => invalidate(qc, 'activity'),
  });
};

const DELETE_SCOPE: Record<DeleteKind | 'activities', Scope> = {
  organizations: 'organization',
  contacts: 'contact',
  deals: 'deal',
  activities: 'activity',
};

export const useDelete = (kind: DeleteKind | 'activities') => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/${kind}/${id}`),
    onSuccess: (_data, id) => {
      // The deleted record's own page query must not refetch into a 404.
      if (kind !== 'activities') {
        const single = kind.slice(0, -1);
        qc.removeQueries({ queryKey: [single, id] });
      }
      return invalidate(qc, DELETE_SCOPE[kind]);
    },
  });
};

/**
 * Moving a card updates the board at once (its place, probability and every
 * total), then calls the server; if the server refuses, the board rolls back.
 */
export const useMoveDeal = (today: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage, index }: { id: number; stage: string; index: number }) =>
      api.post<Deal>(`/deals/${id}/move`, { stage, index }),
    onMutate: async ({ id, stage, index }) => {
      await qc.cancelQueries({ queryKey: keys.deals });
      const previous = qc.getQueryData<Deal[]>(keys.deals);
      if (previous) qc.setQueryData<Deal[]>(keys.deals, applyMove(previous, id, stage, index, today ?? ''));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) qc.setQueryData(keys.deals, context.previous);
    },
    onSettled: () => invalidate(qc, 'deal'),
  });
};
