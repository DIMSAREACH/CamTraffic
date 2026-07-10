import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { UserRoutes } from '../routes';
import { AppProviders } from './AppProviders';

export function bootstrapUserApp(rootElement: HTMLElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <AppProviders>
        <BrowserRouter>
          <UserRoutes />
        </BrowserRouter>
      </AppProviders>
    </StrictMode>,
  );
}
