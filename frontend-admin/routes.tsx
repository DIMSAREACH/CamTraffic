import { createBrowserRouter, redirect } from 'react-router';
import { AdminLoginPage } from '@admin/pages/AdminLoginPage';
import { AdminLayout } from '@admin/layout/AdminLayout';
import { AdminDashboard } from '@admin/pages/AdminDashboard';
import { UsersPage } from '@admin/pages/UsersPage';
import { RolesPage } from '@admin/pages/RolesPage';
import { OfficersPage } from '@admin/pages/OfficersPage';
import { DriversPage } from '@admin/pages/DriversPage';
import { RoadsPage } from '@admin/pages/RoadsPage';
import { VehicleOwnersPage } from '@admin/pages/VehicleOwnersPage';
import { CameraLocationsPage } from '@admin/pages/CameraLocationsPage';
import { AIDashboardPage } from '@admin/pages/AIDashboardPage';
import { BackupRestorePage } from '@admin/pages/BackupRestorePage';
import { EnterpriseAIDetectionCenterPage } from '@shared/pages/EnterpriseAIDetectionCenterPage';
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
import { AppealsPage } from '@shared/pages/AppealsPage';
import { AuditLogsPage } from '@shared/pages/AuditLogsPage';
import { UnknownVehiclesPage } from '@shared/pages/UnknownVehiclesPage';
import { ForgotPasswordPage } from '@shared/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@shared/pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from '@shared/pages/auth/VerifyEmailPage';
import { OAuthCallbackPage } from '@shared/pages/auth/OAuthCallbackPage';
import { RedirectToUserPortal } from '@shared/components/PortalRedirect';

export const router = createBrowserRouter([
  { path: '/', Component: AdminLoginPage },
  { path: '/register', loader: () => redirect('/') },
  { path: '/auth/oauth/callback', Component: OAuthCallbackPage },
  { path: '/forgot-password', Component: ForgotPasswordPage },
  { path: '/reset-password', Component: ResetPasswordPage },
  { path: '/verify-email', Component: VerifyEmailPage },
  {
    path: '/admin',
    Component: AdminLayout,
    children: [
      { index: true, loader: () => redirect('/admin/dashboard') },
      { path: 'dashboard', Component: AdminDashboard },
      { path: 'ai-detection', Component: EnterpriseAIDetectionCenterPage },
      { path: 'cameras', Component: CamerasPage },
      { path: 'ai-logs', Component: AILogsPage },
      { path: 'evidence', Component: EvidenceArchivePage },
      { path: 'fines', Component: FineManagement },
      { path: 'violations', Component: ViolationsPage },
      { path: 'signs', Component: TrafficSignsPage },
      { path: 'vehicles', Component: VehiclesPage },
      { path: 'users', Component: UsersPage },
      { path: 'roles', Component: RolesPage },
      { path: 'officers', Component: OfficersPage },
      { path: 'drivers', Component: DriversPage },
      { path: 'vehicle-owners', Component: VehicleOwnersPage },
      { path: 'camera-locations', Component: CameraLocationsPage },
      { path: 'roads', Component: RoadsPage },
      { path: 'ai-dashboard', Component: AIDashboardPage },
      { path: 'reports', Component: ReportsPage },
      { path: 'analytics', loader: () => redirect('/admin/reports') },
      { path: 'appeals', Component: AppealsPage },
      { path: 'audit-logs', Component: AuditLogsPage },
      { path: 'unknown-vehicles', Component: UnknownVehiclesPage },
      { path: 'backup-restore', Component: BackupRestorePage },
      { path: 'profile', Component: ProfilePage },
      { path: 'notifications', Component: NotificationsPage },
    ],
  },
  { path: '/dashboard', Component: RedirectToUserPortal },
  { path: '/dashboard/*', Component: RedirectToUserPortal },
  { path: '*', loader: () => redirect('/') },
]);
