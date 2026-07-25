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
import { BackupRestorePage } from '@admin/pages/BackupRestorePage';
import { ImportDataPage } from '@admin/pages/ImportDataPage';
import { AITrainingCenterPage } from '@admin/pages/AITrainingCenterPage';
import { AdminSystemSettingsPage } from '@admin/pages/AdminSystemSettingsPage';
import { AIModelsDashboardPage } from '@admin/pages/AIModelsDashboardPage';
import { AIModelDetailsPage } from '@admin/pages/AIModelDetailsPage';
import { AIDatasetsPage } from '@admin/pages/AIDatasetsPage';
import { AIDeploymentsPage } from '@admin/pages/AIDeploymentsPage';
import { AITrainingHistoryPage } from '@admin/pages/AITrainingHistoryPage';
import { AIModelsPage } from '@shared/pages/AIModelsPage';
import { EnterpriseAIDetectionCenterPage } from '@shared/pages/EnterpriseAIDetectionCenterPage';
import { AIDetectionDashboardPage } from '@shared/pages/AIDetectionDashboardPage';
import { ReportsPage } from '@shared/pages/ReportsPage';
import { ReportCenterPage } from '@shared/pages/ReportCenterPage';
import { ReportAnalyticsPage } from '@shared/pages/ReportAnalyticsPage';
import { ReportDetailsPage } from '@shared/pages/ReportDetailsPage';
import { ScheduledReportsPage } from '@shared/pages/ScheduledReportsPage';
import { EvidenceArchivePage } from '@shared/pages/EvidenceArchivePage';
import { AILogsPage } from '@shared/pages/AILogsPage';
import { FineManagement } from '@shared/pages/FineManagement';
import { ViolationsPage } from '@shared/pages/ViolationsPage';
import { TrafficSignsPage } from '@shared/pages/TrafficSignsPage';
import { CamerasPage } from '@shared/pages/CamerasPage';
import { VehiclesPage } from '@shared/pages/VehiclesPage';
import { ProfilePage } from '@shared/pages/ProfilePage';
import { NotificationsPage } from '@shared/pages/NotificationsPage';
import { NotificationListPage } from '@shared/pages/NotificationListPage';
import { SendNotificationPage } from '@shared/pages/SendNotificationPage';
import { ScheduledNotificationsPage } from '@shared/pages/ScheduledNotificationsPage';
import { NotificationTemplatesPage } from '@shared/pages/NotificationTemplatesPage';
import { NotificationDetailsPage } from '@shared/pages/NotificationDetailsPage';
import { AppealsPage } from '@shared/pages/AppealsPage';
import { AuditLogsPage } from '@shared/pages/AuditLogsPage';
import { UnknownVehiclesPage } from '@shared/pages/UnknownVehiclesPage';
import { ForgotPasswordPage } from '@shared/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@shared/pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from '@shared/pages/auth/VerifyEmailPage';
import { OAuthCallbackPage } from '@shared/pages/auth/OAuthCallbackPage';

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
      { path: 'ai-detection/source', loader: () => redirect('/admin/ai-detection/new') },
      { path: 'ai-detection', Component: AIDetectionDashboardPage },
      { path: 'ai-detection/new', Component: EnterpriseAIDetectionCenterPage },
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
      { path: 'ai-dashboard', loader: () => redirect('/admin/ai-models') },
      { path: 'ai-training', loader: () => redirect('/admin/ai-models/train') },
      { path: 'ai-models', Component: AIModelsDashboardPage },
      { path: 'ai-models/list', Component: AIModelsPage },
      { path: 'ai-models/train', Component: AITrainingCenterPage },
      { path: 'ai-models/datasets', Component: AIDatasetsPage },
      { path: 'ai-models/deployments', Component: AIDeploymentsPage },
      { path: 'ai-models/history', Component: AITrainingHistoryPage },
      { path: 'ai-models/:modelId', Component: AIModelDetailsPage },
      { path: 'settings', Component: AdminSystemSettingsPage },
      { path: 'reports', Component: ReportsPage },
      { path: 'reports/center', Component: ReportCenterPage },
      { path: 'reports/analytics', Component: ReportAnalyticsPage },
      { path: 'reports/scheduled', Component: ScheduledReportsPage },
      { path: 'reports/details/:reportId', Component: ReportDetailsPage },
      { path: 'analytics', loader: () => redirect('/admin/reports/analytics') },
      { path: 'appeals', Component: AppealsPage },
      { path: 'audit-logs', Component: AuditLogsPage },
      { path: 'unknown-vehicles', Component: UnknownVehiclesPage },
      { path: 'backup-restore', Component: BackupRestorePage },
      { path: 'import-data', Component: ImportDataPage },
      { path: 'profile', Component: ProfilePage },
      { path: 'notifications', Component: NotificationsPage },
      { path: 'notifications/list', Component: NotificationListPage },
      { path: 'notifications/send', Component: SendNotificationPage },
      { path: 'notifications/scheduled', Component: ScheduledNotificationsPage },
      { path: 'notifications/templates', Component: NotificationTemplatesPage },
      { path: 'notifications/details/:notificationId', Component: NotificationDetailsPage },
    ],
  },
  { path: '/dashboard', loader: () => redirect('/admin/dashboard') },
  { path: '/dashboard/*', loader: () => redirect('/admin/dashboard') },
  { path: '*', loader: () => redirect('/') },
]);
