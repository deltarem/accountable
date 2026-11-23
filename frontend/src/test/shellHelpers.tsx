import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Tooltip from '@radix-ui/react-tooltip';
import { act, render, screen, within } from '@testing-library/react';
import { useEffect } from 'react';
import {
  type NavigateFunction,
  type RouteObject,
  MemoryRouter,
  useLocation,
  useNavigate,
  useRoutes,
} from 'react-router';

import { Toaster } from '../components/Toaster';

interface History {
  path: string;
  navigate: NavigateFunction | null;
}

function Routes({
  routes,
  onChange,
}: {
  routes: RouteObject[];
  onChange: (path: string, navigate: NavigateFunction) => void;
}) {
  const path = useLocation().pathname;
  const navigate = useNavigate();
  useEffect(() => onChange(path, navigate), [onChange, path, navigate]);
  return useRoutes(routes);
}

/**
 * Renders a route tree in memory with the app's providers, so tests can follow
 * links, read the address and go back. It uses MemoryRouter rather than a data
 * router: a data router's navigation builds a fetch Request, and jsdom's
 * AbortSignal is not one Node's Request accepts.
 */
export function renderRoutes(routes: RouteObject[], path = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const history: History = { path, navigate: null };
  const onChange = (next: string, navigate: NavigateFunction) => {
    history.path = next;
    history.navigate = navigate;
  };
  const view = render(
    <QueryClientProvider client={client}>
      <Tooltip.Provider delayDuration={0}>
        <Toaster>
          <MemoryRouter initialEntries={[path]}>
            <Routes routes={routes} onChange={onChange} />
          </MemoryRouter>
        </Toaster>
      </Tooltip.Provider>
    </QueryClientProvider>,
  );
  return {
    client,
    ...view,
    currentPath: () => history.path,
    goBack: () => act(() => history.navigate?.(-1)),
  };
}

/** A button in the icon rail, by its accessible name. */
export function railLink(name: string) {
  return within(screen.getByRole('navigation', { name: 'Sections' })).getByRole('link', { name });
}
