import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@shared/components/ui/sonner';
import App from './App';
import { initAppearanceFromStorage } from '@shared/context/AppearanceContext';
import '@shared/styles/index.css';
import '@shared/styles/auth.css';

initAppearanceFromStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="camtraffic-theme"
      disableTransitionOnChange
    >
      <App />
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  </StrictMode>,
);
