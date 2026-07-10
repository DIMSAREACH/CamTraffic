import type {
  DashboardActivities,
  DashboardAiSummary,
  AnalyticsDashboard,
  DashboardCameraStatus,
  DashboardCharts,
  DashboardNotificationCenter,
  DashboardStats,
  OfficerDashboardActivities,
  OfficerDashboardCameraStatus,
  OfficerDashboardCharts,
  OfficerDashboardNotificationCenter,
  OfficerDashboardStats,
  DriverDashboardActivities,
  DriverDashboardCharts,
  DriverDashboardNotificationCenter,
  DriverDashboardStats,
} from '@camtraffic/types';
import type { ApiClient } from '../client';

export function createDashboardEndpoints(client: ApiClient) {
  return {
    stats: () => client.get<DashboardStats>('/api/v1/dashboard/stats/'),
    charts: () => client.get<DashboardCharts>('/api/v1/dashboard/charts/'),
    activities: () => client.get<DashboardActivities>('/api/v1/dashboard/activities/'),
    aiSummary: () => client.get<DashboardAiSummary>('/api/v1/dashboard/ai-summary/'),
    cameraStatus: () => client.get<DashboardCameraStatus>('/api/v1/dashboard/camera-status/'),
    notifications: () => client.get<DashboardNotificationCenter>('/api/v1/dashboard/notifications/'),
    analytics: (params?: { days?: number }) =>
      client.get<AnalyticsDashboard>('/api/v1/dashboard/analytics/', { params }),
    officer: {
      stats: () => client.get<OfficerDashboardStats>('/api/v1/dashboard/officer/stats/'),
      charts: () => client.get<OfficerDashboardCharts>('/api/v1/dashboard/officer/charts/'),
      activities: () => client.get<OfficerDashboardActivities>('/api/v1/dashboard/officer/activities/'),
      cameraStatus: () => client.get<OfficerDashboardCameraStatus>('/api/v1/dashboard/officer/camera-status/'),
      notifications: () =>
        client.get<OfficerDashboardNotificationCenter>('/api/v1/dashboard/officer/notifications/'),
    },
    driver: {
      stats: () => client.get<DriverDashboardStats>('/api/v1/dashboard/driver/stats/'),
      charts: () => client.get<DriverDashboardCharts>('/api/v1/dashboard/driver/charts/'),
      activities: () => client.get<DriverDashboardActivities>('/api/v1/dashboard/driver/activities/'),
      notifications: () =>
        client.get<DriverDashboardNotificationCenter>('/api/v1/dashboard/driver/notifications/'),
    },
  };
}
