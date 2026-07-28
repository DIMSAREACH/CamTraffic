import { createBrowserRouter, redirect, type LoaderFunctionArgs } from 'react-router';
import { lazy, Suspense, type ComponentType } from 'react';
import { LoginPage } from '@shared/pages/auth/LoginPage';
import { RegisterPage } from '@shared/pages/auth/RegisterPage';
import { OAuthCallbackPage } from '@shared/pages/auth/OAuthCallbackPage';
import { ForgotPasswordPage } from '@shared/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@shared/pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from '@shared/pages/auth/VerifyEmailPage';
import { OfficerLayout } from '@officer/layout/OfficerLayout';
import { CitizenLayout } from '@citizen/layout/CitizenLayout';
import { DashboardPage } from '@user/pages/dashboard/DashboardPage';
import { ReportsPage } from '@shared/pages/ReportsPage';
import { ReportAnalyticsPage } from '@shared/pages/ReportAnalyticsPage';
import { ReportDetailsPage } from '@shared/pages/ReportDetailsPage';
import { AILogsPage } from '@shared/pages/AILogsPage';
import { FineManagement } from '@shared/pages/FineManagement';
import { TrafficSignsPage } from '@shared/pages/TrafficSignsPage';
import { VehiclesPage } from '@shared/pages/VehiclesPage';
import { ProfilePage } from '@shared/pages/ProfilePage';
import { NotificationsPage } from '@shared/pages/NotificationsPage';
import { NotificationDetailsPage } from '@shared/pages/NotificationDetailsPage';
import { EvidenceArchivePage } from '@shared/pages/EvidenceArchivePage';
import { AppealsPage } from '@shared/pages/AppealsPage';
import { AuditLogsPage } from '@shared/pages/AuditLogsPage';
import { UnknownVehiclesPage } from '@shared/pages/UnknownVehiclesPage';
import { CamerasPage } from '@shared/pages/CamerasPage';
import { CitizenPaymentHistoryPage } from '@citizen/pages/CitizenPaymentHistoryPage';
import { OfficerDriverSearchPage } from '@officer/pages/OfficerDriverSearchPage';
import { OfficerDetectionQueuePage } from '@officer/pages/OfficerDetectionQueuePage';
import { CitizenTrafficRulesPage } from '@citizen/pages/CitizenTrafficRulesPage';
import { CitizenSupportPage } from '@citizen/pages/CitizenSupportPage';
import { UserSettingsPage } from '@user/pages/UserSettingsPage';
import FineDetailPage from '@citizen/pages/fines/FineDetailPage';
import InstallmentPlanPage from '@citizen/pages/fines/InstallmentPlanPage';
import ViolationMapPage from '@citizen/pages/violations/ViolationMapPage';
import CitizenViolationHeatmapPage from '@citizen/pages/CitizenViolationHeatmapPage';
import NotificationSettingsPage from '@citizen/pages/settings/NotificationSettingsPage';
import { OperationalAiGuard } from '@shared/components/auth/OperationalAiGuard';
import { RedirectToAdminPortal } from '@shared/components/PortalRedirect';
import {
  CITIZEN_PORTAL_BASE,
  OFFICER_PORTAL_BASE,
  remapLegacyDashboardPath,
} from '@shared/constants/userPortalPaths';

const AIDetectionDashboardPage = lazy(() =>
  import('@shared/pages/AIDetectionDashboardPage').then((m) => ({
    default: m.AIDetectionDashboardPage,
  })),
);
const EnterpriseAIDetectionCenterPage = lazy(() =>
  import('@shared/pages/EnterpriseAIDetectionCenterPage').then((m) => ({
    default: m.EnterpriseAIDetectionCenterPage,
  })),
);

function withAiSuspense(Page: ComponentType) {
  return function AiRouteSuspense() {
    return (
      <Suspense
        fallback={
          <div className="enforcement-page" style={{ padding: '2rem', display: 'grid', placeItems: 'center' }}>
            <p>Loading AI Detection…</p>
          </div>
        }
      >
        <Page />
      </Suspense>
    );
  };
}

// Heavy table page with large dialogs — keep it out of the initial bundle.
const ViolationsPage = lazy(() =>
  import('@shared/pages/ViolationsPage').then((m) => ({ default: m.ViolationsPage })),
);

function withRouteSuspense(Page: ComponentType) {
  return function RouteSuspense() {
    return (
      <Suspense
        fallback={
          <div className="enforcement-page" style={{ padding: '2rem', display: 'grid', placeItems: 'center' }}>
            <p>Loading…</p>
          </div>
        }
      >
        <Page />
      </Suspense>
    );
  };
}

const LazyAiDetectionDashboard = withAiSuspense(AIDetectionDashboardPage);
const LazyEnterpriseAiDetection = withAiSuspense(EnterpriseAIDetectionCenterPage);
const LazyViolationsPage = withRouteSuspense(ViolationsPage);

function GuardedEnterpriseAiDetectionPage() {
  return (
    <OperationalAiGuard>
      <LazyEnterpriseAiDetection />
    </OperationalAiGuard>
  );
}

function GuardedAiDetectionDashboardPage() {
  return (
    <OperationalAiGuard>
      <LazyAiDetectionDashboard />
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

/** Shared account + enforcement outcome routes (officer + citizen). */
const sharedAccountChildren = [
  { index: true, Component: DashboardPage },
  { path: 'fines', Component: FineManagement },
  { path: 'fines/:fineId', Component: FineDetailPage },
  { path: 'settings', Component: UserSettingsPage },
  { path: 'settings/notifications', Component: NotificationSettingsPage },
  { path: 'violations', Component: LazyViolationsPage },
  { path: 'signs', Component: TrafficSignsPage },
  { path: 'profile', Component: ProfilePage },
  { path: 'notifications', Component: NotificationsPage },
  { path: 'notifications/details/:notificationId', Component: NotificationDetailsPage },
];

/** Officer operational routes — AI, cameras, reports, queue. */
const officerChildren = [
  ...sharedAccountChildren,
  { path: 'ai-detection', Component: GuardedAiDetectionDashboardPage },
  { path: 'ai-detection/new', Component: GuardedEnterpriseAiDetectionPage },
  { path: 'ai-detection/source', loader: () => redirect(`${OFFICER_PORTAL_BASE}/ai-detection/new`) },
  { path: 'cameras', Component: GuardedCamerasPage },
  { path: 'ai-logs', Component: GuardedAiLogsPage },
  { path: 'evidence', Component: GuardedEvidencePage },
  { path: 'reports', Component: ReportsPage },
  { path: 'reports/analytics', Component: ReportAnalyticsPage },
  { path: 'reports/details/:reportId', Component: ReportDetailsPage },
  { path: 'appeals', Component: AppealsPage },
  { path: 'detection-queue', Component: OfficerDetectionQueuePage },
  { path: 'unknown-vehicles', Component: UnknownVehiclesPage },
  { path: 'driver-search', Component: OfficerDriverSearchPage },
  { path: 'audit-logs', Component: AuditLogsPage },
  { path: 'reports/center', loader: () => redirect(`${OFFICER_PORTAL_BASE}/reports`) },
  { path: 'reports/scheduled', loader: () => redirect(`${OFFICER_PORTAL_BASE}/reports`) },
  /** Driver-only map/heatmap APIs — keep officers on operational list views. */
  { path: 'violations/map', loader: () => redirect(`${OFFICER_PORTAL_BASE}/violations`) },
  { path: 'violations/heatmap', loader: () => redirect(`${OFFICER_PORTAL_BASE}/violations`) },
];

/** Citizen-only: personal fines/vehicles/appeals — no operational AI or fabricated reports. */
const citizenChildren = [
  ...sharedAccountChildren,
  { path: 'violations/map', Component: ViolationMapPage },
  { path: 'violations/heatmap', Component: CitizenViolationHeatmapPage },
  { path: 'fines/payments', Component: CitizenPaymentHistoryPage },
  { path: 'fines/:fineId/installments', Component: InstallmentPlanPage },
  { path: 'fines/:fineId/payment', Component: FineManagement },
  { path: 'vehicles', Component: VehiclesPage },
  { path: 'appeals', Component: AppealsPage },
  { path: 'traffic-rules', Component: CitizenTrafficRulesPage },
  { path: 'support', Component: CitizenSupportPage },
  /** Block legacy / mistyped operational paths → home. */
  { path: 'ai-detection/*', loader: () => redirect(CITIZEN_PORTAL_BASE) },
  { path: 'cameras', loader: () => redirect(CITIZEN_PORTAL_BASE) },
  { path: 'ai-logs', loader: () => redirect(CITIZEN_PORTAL_BASE) },
  { path: 'evidence', loader: () => redirect(CITIZEN_PORTAL_BASE) },
  { path: 'reports/*', loader: () => redirect(CITIZEN_PORTAL_BASE) },
  { path: 'reports', loader: () => redirect(CITIZEN_PORTAL_BASE) },
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
    children: officerChildren,
  },
  {
    path: CITIZEN_PORTAL_BASE,
    Component: CitizenLayout,
    children: citizenChildren,
  },
  { path: '/dashboard', loader: legacyDashboardLoader },
  { path: '/dashboard/*', loader: legacyDashboardLoader },
  { path: '/admin', Component: RedirectToAdminPortal },
  { path: '/admin/*', Component: RedirectToAdminPortal },
  { path: '*', loader: () => redirect('/') },
]);
