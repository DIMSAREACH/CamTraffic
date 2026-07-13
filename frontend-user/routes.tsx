import { createBrowserRouter, redirect } from 'react-router';
import { LoginPage } from '@shared/pages/auth/LoginPage';
import { RegisterPage } from '@shared/pages/auth/RegisterPage';
import { OAuthCallbackPage } from '@shared/pages/auth/OAuthCallbackPage';
import { ForgotPasswordPage } from '@shared/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@shared/pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from '@shared/pages/auth/VerifyEmailPage';
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
import { AppealsPage } from '@shared/pages/AppealsPage';
import { AuditLogsPage } from '@shared/pages/AuditLogsPage';
import { UnknownVehiclesPage } from '@shared/pages/UnknownVehiclesPage';
import { AIModelsPage } from '@shared/pages/AIModelsPage';
import { CamerasPage } from '@shared/pages/CamerasPage';
import { DriverPaymentHistoryPage } from '@user/pages/driver/DriverPaymentHistoryPage';
import { DriverSettingsPage } from '@user/pages/driver/DriverSettingsPage';
import { OperationalAiGuard } from '@shared/components/auth/OperationalAiGuard';
import { RedirectToAdminPortal } from '@shared/components/PortalRedirect';

function GuardedAiDetectionPage() {
  return (
    <OperationalAiGuard>
      <AIDetectionPage />
    </OperationalAiGuard>
  );
}

function GuardedCamerasPage() {
  return (
    <OperationalAiGuard>
      <CamerasPage />
    </OperationalAiGuard>
  );
}

function GuardedAiLogsPage() {
  return (
    <OperationalAiGuard>
      <AILogsPage />
    </OperationalAiGuard>
  );
}

function GuardedEvidencePage() {
  return (
    <OperationalAiGuard>
      <EvidenceArchivePage />
    </OperationalAiGuard>
  );
}

export const router = createBrowserRouter([
  { path: '/', Component: LoginPage },
  { path: '/register', Component: RegisterPage },
  { path: '/auth/oauth/callback', Component: OAuthCallbackPage },
  { path: '/forgot-password', Component: ForgotPasswordPage },
  { path: '/reset-password', Component: ResetPasswordPage },
  { path: '/verify-email', Component: VerifyEmailPage },
  {
    path: '/dashboard',
    Component: UserLayout,
    children: [
      { index: true, Component: DashboardPage },
      { path: 'ai-detection', Component: GuardedAiDetectionPage },
      { path: 'cameras', Component: GuardedCamerasPage },
      { path: 'ai-logs', Component: GuardedAiLogsPage },
      { path: 'evidence', Component: GuardedEvidencePage },
      { path: 'fines', Component: FineManagement },
      { path: 'fines/payments', Component: DriverPaymentHistoryPage },
      { path: 'settings', Component: DriverSettingsPage },
      { path: 'violations', Component: ViolationsPage },
      { path: 'signs', Component: TrafficSignsPage },
      { path: 'vehicles', Component: VehiclesPage },
      { path: 'reports', Component: ReportsPage },
      { path: 'appeals', Component: AppealsPage },
      { path: 'unknown-vehicles', Component: UnknownVehiclesPage },
      { path: 'profile', Component: ProfilePage },
      { path: 'notifications', Component: NotificationsPage },
    ],
  },
  { path: '/admin', Component: RedirectToAdminPortal },
  { path: '/admin/*', Component: RedirectToAdminPortal },
  { path: '*', loader: () => redirect('/') },
]);
