import type { DashboardStats } from '@shared/types';
import type { DriverDashboardStats, PoliceDashboardStats } from '@shared/services/sampleDataFallback';

export const EMPTY_DASHBOARD_STATS: DashboardStats = {
  total_users: 0,
  total_drivers: 0,
  total_police: 0,
  total_fines: 0,
  paid_fines: 0,
  pending_fines: 0,
  total_detections: 0,
  total_vehicles: 0,
  fine_revenue: 0,
  detection_accuracy: 0,
  monthly_fines: [],
  monthly_detections: [],
  fine_by_reason: [],
  user_distribution: [],
};

export const EMPTY_POLICE_STATS: PoliceDashboardStats = {
  total_issued: 0,
  today_issued: 0,
  pending: 0,
  revenue: 0,
  recent: [],
};

export const EMPTY_DRIVER_STATS: DriverDashboardStats = {
  vehicles: 0,
  total_fines: 0,
  pending: 0,
  paid: 0,
  owed: 0,
  recent_detections: [],
  recent_fines: [],
};
