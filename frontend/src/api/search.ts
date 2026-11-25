// The search in the top bar (API-21, UI-SRCH-02).

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from './client';

export interface SearchResult {
  id: number;
  name: string;
  /** Industry, organization, or organization and stage; null when there's none. */
  context: string | null;
}

export interface SearchResults {
  organizations: SearchResult[];
  contacts: SearchResult[];
  deals: SearchResult[];
}

/**
 * Up to 5 of each kind whose name contains the text. Older results stay until
 * newer ones arrive, so the list doesn't flicker. Failures stay in the dropdown,
 * with no retry: the next keystroke tries again.
 */
export function useSearch(text: string) {
  const q = text.trim();
  return useQuery({
    queryKey: ['search', q],
    queryFn: () => api.get<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
    enabled: q.length > 0,
    placeholderData: keepPreviousData,
    retry: false,
  });
}
