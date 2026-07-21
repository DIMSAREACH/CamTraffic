import { createBrowserRouter, redirect } from 'react-router';
import { LoginPage } from '@shared/pages/auth/LoginPage';
import { RegisterPage } from '@shared/pages/auth/RegisterPage';
import { OAuthCallbackPage } from '@shared/pages/auth/OAuthCallbackPage';
import { ForgotPasswordPage } from '@shared/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@shared/pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from '@shared/pages/auth/VerifyEmailPage';
import { UserLayout } from '@user/layout/UserLayout';
import { DashboardPage } from '@user/pages/dashboard/DashboardPage';
import { AIDetectionDashboardPage } from '@shared/pages/AIDetectionDashboardPage';
import { EnterpriseAIDetectionCenterPage } from '@shared/pages/EnterpriseAIDetectionCenterPage';
import { ReportsPage } from '@shared/pages/ReportsPage';
import { ReportCenterPage } from '@shared/pages/ReportCenterPage';
import { ReportAnalyticsPage } from '@shared/pages/ReportAnalyticsPage';
import { ReportDetailsPage } from '@shared/pages/ReportDetailsPage';
import { ScheduledReportsPage } from '@shared/pages/ScheduledReportsPage';
import { AILogsPage } from '@shared/pages/AILogsPage';
import { FineManagement } from '@shared/pages/FineManagement';
import { ViolationsPage } from '@shared/pages/ViolationsPage';
import { TrafficSignsPage } from '@shared/pages/TrafficSignsPage';
import { VehiclesPage } from '@shared/pages/VehiclesPage';
import { ProfilePage } from '@shared/pages/ProfilePage';
import { NotificationsPage } from '@shared/pages/NotificationsPage';
import { NotificationDetailsPage } from '@shared/pages/NotificationDetailsPage';
import { EvidenceArchivePage } from '@shared/pages/EvidenceArchivePage';
import { AppealsPage } from '@shared/pages/AppealsPage';
import { UnknownVehiclesPage } from '@shared/pages/UnknownVehiclesPage';
import { CamerasPage } from '@shared/pages/CamerasPage';
import { DriverPaymentHistoryPage } from '@user/pages/driver/DriverPaymentHistoryPage';
import { DriverSearchPage } from '@user/pages/officer/DriverSearchPage';
import { DriverTrafficRulesPage } from '@user/pages/driver/DriverTrafficRulesPage';
import { DriverSupportPage } from '@user/pages/driver/DriverSupportPage';
import { UserSettingsPage } from '@user/pages/UserSettingsPage';
import { OperationalAiGuard } from '@shared/components/auth/OperationalAiGuard';
import { RedirectToAdminPortal } from '@shared/components/PortalRedirect';

function GuardedEnterpriseAiDetectionPage() {
  return (
    <OperationalAiGuard>
      <EnterpriseAIDetectionCenterPage />
    </OperationalAiGuard>
  );
}

function GuardedAiDetectionDashboardPage() {
  return (
    <OperationalAiGuard>
      <AIDetectionDashboardPage />
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
      { path: 'ai-detection/source', loader: () => redirect('/dashboard/ai-detection/new') },
      { path: 'ai-detection', Component: GuardedAiDetectionDashboardPage },
      { path: 'ai-detection/new', Component: GuardedEnterpriseAiDetectionPage },
      { path: 'cameras', Component: GuardedCamerasPage },
      { path: 'ai-logs', Component: GuardedAiLogsPage },
      { path: 'evidence', Component: GuardedEvidencePage },
      { path: 'fines', Component: FineManagement },
      { path: 'fines/payments', Component: DriverPaymentHistoryPage },
      { path: 'settings', Component: UserSettingsPage },
      { path: 'violations', Component: ViolationsPage },
      { path: 'signs', Component: TrafficSignsPage },
      { path: 'vehicles', Component: VehiclesPage },
      { path: 'reports', Component: ReportsPage },
      { path: 'reports/center', Component: ReportCenterPage },
      { path: 'reports/analytics', Component: ReportAnalyticsPage },
      { path: 'reports/scheduled', Component: ScheduledReportsPage },
      { path: 'reports/details/:reportId', Component: ReportDetailsPage },
      { path: 'appeals', Component: AppealsPage },
      { path: 'unknown-vehicles', Component: UnknownVehiclesPage },
      { path: 'driver-search', Component: DriverSearchPage },
      { path: 'traffic-rules', Component: DriverTrafficRulesPage },
      { path: 'support', Component: DriverSupportPage },
      { path: 'profile', Component: ProfilePage },
      { path: 'notifications', Component: NotificationsPage },
      { path: 'notifications/details/:notificationId', Component: NotificationDetailsPage },
    ],
  },
  { path: '/admin', Component: RedirectToAdminPortal },
  { path: '/admin/*', Component: RedirectToAdminPortal },
  { path: '*', loader: () => redirect('/') },
]);
