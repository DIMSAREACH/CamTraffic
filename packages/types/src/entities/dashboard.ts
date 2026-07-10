export interface DashboardStats {
  total_users: number;
  total_drivers: number;
  total_officers: number;
  total_vehicles: number;
  total_cameras: number;
  cameras_online: number;
  cameras_offline: number;
  total_violations: number;
  violations_pending: number;
  violations_approved: number;
}

export interface DashboardChartPoint {
  label: string;
  value: number;
}

export interface DashboardCharts {
  violations_by_day: DashboardChartPoint[];
  violations_by_status: DashboardChartPoint[];
}

export interface DashboardActivityItem {
  type: string;
  title: string;
  subtitle: string;
  timestamp: string;
}

export interface DashboardActivities {
  items: DashboardActivityItem[];
}

export interface DashboardAiSummary {
  total_detections: number;
  detections_today: number;
  avg_confidence: number;
  active_model: string;
  active_model_accuracy: number;
  top_detected_sign: string;
}

export interface DashboardCameraHealthItem {
  code: string;
  name: string;
  status: string;
  location: string;
  last_health_check: string | null;
}

export interface DashboardCameraStatus {
  total_cameras: number;
  online: number;
  offline: number;
  maintenance: number;
  error: number;
  health_items: DashboardCameraHealthItem[];
}

export interface DashboardNotificationItem {
  id: string;
  title: string;
  is_read: boolean;
  created_at: string;
}

export interface DashboardNotificationCenter {
  total: number;
  unread: number;
  latest: DashboardNotificationItem[];
}
