import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Tooltip from '@radix-ui/react-tooltip';
import { type DataRouter, RouterProvider } from 'react-router';

import { SessionProvider, useSession } from './auth/session';
import { Toaster } from './components/Toaster';
import { SignInPage } from './pages/SignInPage';
import { router as browserRouter } from './routes';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // Coming back to the tab loads again, so other people's changes show up
      // without a refresh (DEC-20, ARC-10).
      queries: { retry: 1, staleTime: 5_000, refetchOnWindowFocus: true },
      mutations: { retry: 0 },
    },
  });
}

const queryClient = makeQueryClient();

/**
 * UI-AUTH-02: signed out, every address shows the sign-in screen, and nothing of
 * the app, not even while the session is being checked. The router isn't touched
 * meanwhile, so it still holds the address that was asked for.
 */
function SignedInOnly({ router }: { router: DataRouter }) {
  const { status } = useSession();
  if (status === 'loading') return null;
  if (status === 'signed-out') return <SignInPage />;
  return <RouterProvider router={router} />;
}

/** `router` is the browser's, except in tests, which start at an address of their own. */
export function App({ router = browserRouter }: { router?: DataRouter }) {
  // Signing out returns to the dashboard's address, so the next sign-in starts there.
  const toDashboard = () => void router.navigate('/', { replace: true });
  return (
    <QueryClientProvider client={queryClient}>
      <Tooltip.Provider delayDuration={300}>
        <Toaster>
          <SessionProvider onSignedOut={toDashboard}>
            <SignedInOnly router={router} />
          </SessionProvider>
        </Toaster>
      </Tooltip.Provider>
    </QueryClientProvider>
  );
}
