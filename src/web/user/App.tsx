import { RouterProvider } from 'react-router';
import { AppQueryProvider } from '@camtraffic/query';
import { router } from './routes';
import { AuthProvider } from '@shared/context/AuthContext';
import { LanguageProvider } from '@shared/context/LanguageContext';
import { AppearanceProvider } from '@shared/context/AppearanceContext';

export default function App() {
  return (
    <AppQueryProvider>
      <LanguageProvider>
        <AppearanceProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </AppearanceProvider>
      </LanguageProvider>
    </AppQueryProvider>
  );
}
