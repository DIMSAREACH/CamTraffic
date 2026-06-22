import { createBrowserRouter, redirect } from 'react-router';
import { LoginPage } from '@shared/pages/auth/LoginPage';
import { RegisterPage } from '@shared/pages/auth/RegisterPage';
import { OAuthCallbackPage } from '@shared/pages/auth/OAuthCallbackPage';
import { ForgotPasswordPage } from '@shared/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@shared/pages/auth/ResetPasswordPage';
import { UserLayout } from '@user/layout/UserLayout';
import { DashboardPage } from '@user/pages/dashboard/DashboardPage';
import { AIDetectionPage } from '@shared/pages/AIDetectionPage';
import { ReportsPage } from '@shared/pages/ReportsPage';
import { AILogsPage } from '@shared/pages/AILogsPage';
import { FineManagement } from '@shared/pages/FineManagement';
import { ViolationsPage } from '@shared/pages/ViolationsPage';
import { TrafficSignsPage } from '@shared/pages/TrafficSignsPage';
import { VehiclesPage } from '@shared/pages/VehiclesPage';
import { ProfilePage } from '@shared/pages/ProfilePage';
import { NotificationsPage } from '@shared/pages/NotificationsPage';
import { EvidenceArchivePage } from '@shared/pages/EvidenceArchivePage';
import { RedirectToAdminPortal } from '@shared/components/PortalRedirect';

export const router = createBrowserRouter([
  { path: '/', Component: LoginPage },
  { path: '/register', Component: RegisterPage },
  { path: '/auth/oauth/callback', Component: OAuthCallbackPage },
  { path: '/forgot-password', Component: ForgotPasswordPage },
  { path: '/reset-password', Component: ResetPasswordPage },
  {
    path: '/dashboard',
    Component: UserLayout,
    children: [
      { index: true, Component: DashboardPage },
      { path: 'ai-detection', Component: AIDetectionPage },
      { path: 'ai-logs', Component: AILogsPage },
      { path: 'evidence', Component: EvidenceArchivePage },
      { path: 'fines', Component: FineManagement },
      { path: 'violations', Component: ViolationsPage },
      { path: 'signs', Component: TrafficSignsPage },
      { path: 'vehicles', Component: VehiclesPage },
      { path: 'reports', Component: ReportsPage },
      { path: 'profile', Component: ProfilePage },
      { path: 'notifications', Component: NotificationsPage },
    ],
  },
  { path: '/admin', Component: RedirectToAdminPortal },
  { path: '/admin/*', Component: RedirectToAdminPortal },
  { path: '*', loader: () => redirect('/') },
]);
