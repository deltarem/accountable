import { createBrowserRouter } from 'react-router';

import { AppShell } from './components/AppShell';
import { ContactPage } from './pages/ContactPage';
import { ContactsPage } from './pages/ContactsPage';
import { DashboardPage } from './pages/DashboardPage';
import { DealPage } from './pages/DealPage';
import { DealsPage } from './pages/DealsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrganizationPage } from './pages/OrganizationPage';
import { OrganizationsPage } from './pages/OrganizationsPage';
import { PipelinePage } from './pages/PipelinePage';

// The seven addresses (UI-LAY-04).
export const routes = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'pipeline', element: <PipelinePage /> },
      { path: 'deals', element: <DealsPage /> },
      { path: 'deals/:id', element: <DealPage /> },
      { path: 'contacts', element: <ContactsPage /> },
      { path: 'contacts/:id', element: <ContactPage /> },
      { path: 'organizations', element: <OrganizationsPage /> },
      { path: 'organizations/:id', element: <OrganizationPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
