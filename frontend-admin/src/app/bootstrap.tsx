import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AdminRoutes } from '../routes';
import { AppProviders } from './AppProviders';

export function bootstrapAdminApp(rootElement: HTMLElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <AppProviders>
        <BrowserRouter>
          <AdminRoutes />
        </BrowserRouter>
      </AppProviders>
    </StrictMode>,
  );
}
