import type { DashboardActivityItem, DashboardChartPoint, DashboardNotificationItem } from './dashboard';

export interface DriverDashboardStats {
  license_number: string;
  license_expiry: string | null;
  total_vehicles: number;
  total_violations: number;
  violations_pending: number;
  violations_approved: number;
  violations_rejected: number;
  total_fines: number;
  fines_unpaid: number;
  fines_paid: number;
  fines_overdue: number;
  outstanding_amount: number;
  appeals_active: number;
}

export interface DriverDashboardCharts {
  violations_by_day: DashboardChartPoint[];
  violations_by_status: DashboardChartPoint[];
  fines_by_status: DashboardChartPoint[];
}

export interface DriverDashboardActivities {
  items: DashboardActivityItem[];
}

export interface DriverDashboardNotificationCenter {
  total: number;
  unread: number;
  latest: DashboardNotificationItem[];
}
