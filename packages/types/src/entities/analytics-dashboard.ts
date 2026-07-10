export interface AnalyticsChartPoint {
  label: string;
  value: number;
}

export interface AnalyticsRankedItem {
  label: string;
  value: number;
}

export interface AnalyticsDashboard {
  period_days: number;
  total_violations: number;
  total_detections: number;
  total_fines: number;
  fines_collected: number;
  fines_outstanding: number;
  average_detection_confidence: number;
  violations_by_day: AnalyticsChartPoint[];
  detections_by_day: AnalyticsChartPoint[];
  violations_by_status: AnalyticsChartPoint[];
  fines_by_status: AnalyticsChartPoint[];
  camera_status_breakdown: AnalyticsChartPoint[];
  top_traffic_signs: AnalyticsRankedItem[];
  top_cameras: AnalyticsRankedItem[];
}
