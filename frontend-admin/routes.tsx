import { createBrowserRouter, redirect } from 'react-router';
import { AdminLoginPage } from '@admin/pages/AdminLoginPage';
import { AdminLayout } from '@admin/layout/AdminLayout';
import { AdminDashboard } from '@admin/pages/AdminDashboard';
import { UsersPage } from '@admin/pages/UsersPage';
import { AIDetectionPage } from '@shared/pages/AIDetectionPage';
import { ReportsPage } from '@shared/pages/ReportsPage';
import { EvidenceArchivePage } from '@shared/pages/EvidenceArchivePage';
import { AILogsPage } from '@shared/pages/AILogsPage';
import { FineManagement } from '@shared/pages/FineManagement';
import { ViolationsPage } from '@shared/pages/ViolationsPage';
import { TrafficSignsPage } from '@shared/pages/TrafficSignsPage';
import { CamerasPage } from '@shared/pages/CamerasPage';
import { VehiclesPage } from '@shared/pages/VehiclesPage';
import { ProfilePage } from '@shared/pages/ProfilePage';
import { NotificationsPage } from '@shared/pages/NotificationsPage';
import { ForgotPasswordPage } from '@shared/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@shared/pages/auth/ResetPasswordPage';
import { OAuthCallbackPage } from '@shared/pages/auth/OAuthCallbackPage';
import { RedirectToUserPortal } from '@shared/components/PortalRedirect';

export const router = createBrowserRouter([
  { path: '/', Component: AdminLoginPage },
  { path: '/register', loader: () => redirect('/') },
  { path: '/auth/oauth/callback', Component: OAuthCallbackPage },
  { path: '/forgot-password', Component: ForgotPasswordPage },
  { path: '/reset-password', Component: ResetPasswordPage },
  {
    path: '/admin',
    Component: AdminLayout,
    children: [
      { index: true, loader: () => redirect('/admin/dashboard') },
      { path: 'dashboard', Component: AdminDashboard },
      { path: 'ai-detection', Component: AIDetectionPage },
      { path: 'cameras', Component: CamerasPage },
      { path: 'ai-logs', Component: AILogsPage },
      { path: 'evidence', Component: EvidenceArchivePage },
      { path: 'fines', Component: FineManagement },
      { path: 'violations', Component: ViolationsPage },
      { path: 'signs', Component: TrafficSignsPage },
      { path: 'vehicles', Component: VehiclesPage },
      { path: 'users', Component: UsersPage },
      { path: 'reports', Component: ReportsPage },
      { path: 'profile', Component: ProfilePage },
      { path: 'notifications', Component: NotificationsPage },
    ],
  },
  { path: '/dashboard', Component: RedirectToUserPortal },
  { path: '/dashboard/*', Component: RedirectToUserPortal },
  { path: '*', loader: () => redirect('/') },
]);
