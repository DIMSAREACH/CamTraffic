import type { DashboardActivityItem, DashboardCameraHealthItem, DashboardChartPoint, DashboardNotificationItem } from './dashboard';

export interface OfficerDashboardStats {
  station_name: string;
  badge_number: string;
  rank: string;
  total_cameras: number;
  cameras_online: number;
  cameras_offline: number;
  total_violations: number;
  violations_pending: number;
  violations_approved: number;
  violations_rejected: number;
  detections_today: number;
  reviewed_by_me: number;
}

export interface OfficerDashboardCharts {
  violations_by_day: DashboardChartPoint[];
  violations_by_status: DashboardChartPoint[];
}

export interface OfficerDashboardActivities {
  items: DashboardActivityItem[];
}

export interface OfficerDashboardCameraStatus {
  total_cameras: number;
  online: number;
  offline: number;
  maintenance: number;
  error: number;
  health_items: DashboardCameraHealthItem[];
}

export interface OfficerDashboardNotificationCenter {
  total: number;
  unread: number;
  latest: DashboardNotificationItem[];
}
