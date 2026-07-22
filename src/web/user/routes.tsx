import { createBrowserRouter, redirect, type LoaderFunctionArgs } from 'react-router';
import { LoginPage } from '@shared/pages/auth/LoginPage';
import { RegisterPage } from '@shared/pages/auth/RegisterPage';
import { OAuthCallbackPage } from '@shared/pages/auth/OAuthCallbackPage';
import { ForgotPasswordPage } from '@shared/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@shared/pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from '@shared/pages/auth/VerifyEmailPage';
import { OfficerLayout } from '@officer/layout/OfficerLayout';
import { CitizenLayout } from '@citizen/layout/CitizenLayout';
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
import { CitizenPaymentHistoryPage } from '@citizen/pages/CitizenPaymentHistoryPage';
import { OfficerDriverSearchPage } from '@officer/pages/OfficerDriverSearchPage';
import { OfficerDetectionQueuePage } from '@officer/pages/OfficerDetectionQueuePage';
import { CitizenTrafficRulesPage } from '@citizen/pages/CitizenTrafficRulesPage';
import { CitizenSupportPage } from '@citizen/pages/CitizenSupportPage';
import { UserSettingsPage } from '@user/pages/UserSettingsPage';
import { OperationalAiGuard } from '@shared/components/auth/OperationalAiGuard';
import { RedirectToAdminPortal } from '@shared/components/PortalRedirect';
import {
  CITIZEN_PORTAL_BASE,
  OFFICER_PORTAL_BASE,
  remapLegacyDashboardPath,
} from '@shared/constants/userPortalPaths';

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

/** Shared child routes under /officer and /citizen (role-gated by layout). */
const domainChildren = [
  { index: true, Component: DashboardPage },
  { path: 'ai-detection/source', loader: () => redirect(`${OFFICER_PORTAL_BASE}/ai-detection/new`) },
  { path: 'ai-detection', Component: GuardedAiDetectionDashboardPage },
  { path: 'ai-detection/new', Component: GuardedEnterpriseAiDetectionPage },
  { path: 'cameras', Component: GuardedCamerasPage },
  { path: 'ai-logs', Component: GuardedAiLogsPage },
  { path: 'evidence', Component: GuardedEvidencePage },
  { path: 'fines', Component: FineManagement },
  { path: 'fines/payments', Component: CitizenPaymentHistoryPage },
  { path: 'settings', Component: UserSettingsPage },
  { path: 'violations', Component: ViolationsPage },
  { path: 'detection-queue', Component: OfficerDetectionQueuePage },
  { path: 'signs', Component: TrafficSignsPage },
  { path: 'vehicles', Component: VehiclesPage },
  { path: 'reports', Component: ReportsPage },
  { path: 'reports/center', Component: ReportCenterPage },
  { path: 'reports/analytics', Component: ReportAnalyticsPage },
  { path: 'reports/scheduled', Component: ScheduledReportsPage },
  { path: 'reports/details/:reportId', Component: ReportDetailsPage },
  { path: 'appeals', Component: AppealsPage },
  { path: 'unknown-vehicles', Component: UnknownVehiclesPage },
  { path: 'driver-search', Component: OfficerDriverSearchPage },
  { path: 'traffic-rules', Component: CitizenTrafficRulesPage },
  { path: 'support', Component: CitizenSupportPage },
  { path: 'profile', Component: ProfilePage },
  { path: 'notifications', Component: NotificationsPage },
  { path: 'notifications/details/:notificationId', Component: NotificationDetailsPage },
];

/** Redirect /dashboard/* → /officer/* or /citizen/* using stored role when available. */
function legacyDashboardLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  let role: 'police' | 'driver' = 'police';
  try {
    const keys = ['traffic_user_user', 'traffic_user'];
    for (const key of keys) {
      const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { role?: string };
      if (parsed.role === 'driver') {
        role = 'driver';
        break;
      }
      if (parsed.role === 'police') {
        role = 'police';
        break;
      }
    }
  } catch {
    /* ignore */
  }
  const target = remapLegacyDashboardPath(pathname, role);
  const search = url.search || '';
  return redirect(`${target}${search}`);
}

export const router = createBrowserRouter([
  { path: '/', Component: LoginPage },
  { path: '/register', Component: RegisterPage },
  { path: '/auth/oauth/callback', Component: OAuthCallbackPage },
  { path: '/forgot-password', Component: ForgotPasswordPage },
  { path: '/reset-password', Component: ResetPasswordPage },
  { path: '/verify-email', Component: VerifyEmailPage },
  {
    path: OFFICER_PORTAL_BASE,
    Component: OfficerLayout,
    children: domainChildren.map((child) =>
      child.path === 'ai-detection/source'
        ? { ...child, loader: () => redirect(`${OFFICER_PORTAL_BASE}/ai-detection/new`) }
        : child,
    ),
  },
  {
    path: CITIZEN_PORTAL_BASE,
    Component: CitizenLayout,
    children: domainChildren.map((child) =>
      child.path === 'ai-detection/source'
        ? { ...child, loader: () => redirect(`${CITIZEN_PORTAL_BASE}/ai-detection/new`) }
        : child,
    ),
  },
  { path: '/dashboard', loader: legacyDashboardLoader },
  { path: '/dashboard/*', loader: legacyDashboardLoader },
  { path: '/admin', Component: RedirectToAdminPortal },
  { path: '/admin/*', Component: RedirectToAdminPortal },
  { path: '*', loader: () => redirect('/') },
]);
