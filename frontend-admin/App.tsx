import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from '@shared/context/AuthContext';
import { LanguageProvider } from '@shared/context/LanguageContext';
import { AppearanceProvider } from '@shared/context/AppearanceContext';

export default function App() {
  return (
    <LanguageProvider>
      <AppearanceProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </AppearanceProvider>
    </LanguageProvider>
  );
}
