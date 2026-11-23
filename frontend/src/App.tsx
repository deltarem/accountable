import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Tooltip from '@radix-ui/react-tooltip';
import { RouterProvider } from 'react-router';

import { Toaster } from './components/Toaster';
import { router } from './routes';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 5_000, refetchOnWindowFocus: false },
      mutations: { retry: 0 },
    },
  });
}

const queryClient = makeQueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Tooltip.Provider delayDuration={300}>
        <Toaster>
          <RouterProvider router={router} />
        </Toaster>
      </Tooltip.Provider>
    </QueryClientProvider>
  );
}
