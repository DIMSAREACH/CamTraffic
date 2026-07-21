/** Catalog of generated / scheduled reports for the Report Center UI. */

export type ReportCategory =
  | 'traffic'
  | 'ai'
  | 'finance'
  | 'enforcement'
  | 'vehicles'
  | 'users'
  | 'system'
  | 'audit';

export type ReportFormat = 'PDF' | 'Excel' | 'CSV';
export type ReportStatus = 'ready' | 'generating' | 'failed' | 'scheduled';
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface CatalogReport {
  id: string;
  name: string;
  category: ReportCategory;
  createdBy: string;
  dateLabel: string;
  generatedAt: string;
  period: string;
  format: ReportFormat;
  status: ReportStatus;
  charts: string[];
  summary: {
    violations: number;
    detections: number;
    revenue: number;
    accuracy: number;
  };
}

export interface ScheduledReport {
  id: string;
  reportName: string;
  frequency: ScheduleFrequency;
  recipients: string[];
  format: ReportFormat;
  status: 'active' | 'disabled';
  nextRun: string;
  category: ReportCategory;
}

export const REPORT_CATEGORIES: { value: ReportCategory | 'all'; labelKey: string }[] = [
  { value: 'all', labelKey: 'reports.filterAllCategories' },
  { value: 'traffic', labelKey: 'reports.catTraffic' },
  { value: 'ai', labelKey: 'reports.catAi' },
  { value: 'enforcement', labelKey: 'reports.catEnforcement' },
  { value: 'vehicles', labelKey: 'reports.catVehicles' },
  { value: 'finance', labelKey: 'reports.catFinance' },
  { value: 'users', labelKey: 'reports.catUsers' },
  { value: 'system', labelKey: 'reports.catSystem' },
  { value: 'audit', labelKey: 'reports.catAudit' },
];

export const CATALOG_REPORTS: CatalogReport[] = [
  {
    id: 'monthly-violations',
    name: 'Monthly Traffic Violation Report',
    category: 'enforcement',
    createdBy: 'Administrator',
    dateLabel: 'Today',
    generatedAt: '2026-07-14',
    period: 'January – July 2026',
    format: 'PDF',
    status: 'ready',
    charts: ['Monthly Violations', 'AI Detection Trend', 'Revenue Analysis', 'Camera Performance'],
    summary: { violations: 12540, detections: 25432, revenue: 58200, accuracy: 98.7 },
  },
  {
    id: 'ai-detection',
    name: 'AI Detection Report',
    category: 'ai',
    createdBy: 'Administrator',
    dateLabel: 'Today',
    generatedAt: '2026-07-14',
    period: 'July 2026',
    format: 'Excel',
    status: 'ready',
    charts: ['Detection Trend', 'Confidence Distribution', 'False Positive Analysis'],
    summary: { violations: 0, detections: 25432, revenue: 0, accuracy: 98.7 },
  },
  {
    id: 'revenue',
    name: 'Revenue Report',
    category: 'finance',
    createdBy: 'Administrator',
    dateLabel: 'Today',
    generatedAt: '2026-07-14',
    period: 'Q2 2026',
    format: 'PDF',
    status: 'ready',
    charts: ['Fine Revenue', 'Payment Status', 'Outstanding Fines'],
    summary: { violations: 3240, detections: 0, revenue: 58200, accuracy: 0 },
  },
  {
    id: 'camera-stats',
    name: 'Camera Statistics Report',
    category: 'traffic',
    createdBy: 'Administrator',
    dateLabel: 'Yesterday',
    generatedAt: '2026-07-13',
    period: 'June 2026',
    format: 'PDF',
    status: 'ready',
    charts: ['Camera Uptime', 'Top Cameras by Detection'],
    summary: { violations: 840, detections: 9120, revenue: 0, accuracy: 97.2 },
  },
  {
    id: 'officer-performance',
    name: 'Officer Performance Report',
    category: 'users',
    createdBy: 'Administrator',
    dateLabel: '2 days ago',
    generatedAt: '2026-07-12',
    period: 'Q2 2026',
    format: 'Excel',
    status: 'ready',
    charts: ['Fines Issued', 'Reviews Completed'],
    summary: { violations: 2100, detections: 0, revenue: 21400, accuracy: 0 },
  },
  {
    id: 'audit-logs',
    name: 'System Audit Report',
    category: 'audit',
    createdBy: 'System',
    dateLabel: '3 days ago',
    generatedAt: '2026-07-11',
    period: 'June 2026',
    format: 'CSV',
    status: 'ready',
    charts: ['Login History', 'API Usage'],
    summary: { violations: 0, detections: 0, revenue: 0, accuracy: 0 },
  },
  {
    id: 'vehicle-registry',
    name: 'Vehicle Registry Report',
    category: 'vehicles',
    createdBy: 'Administrator',
    dateLabel: 'Last week',
    generatedAt: '2026-07-07',
    period: 'H1 2026',
    format: 'Excel',
    status: 'ready',
    charts: ['Vehicle Types', 'License Plate Statistics'],
    summary: { violations: 0, detections: 0, revenue: 0, accuracy: 0 },
  },
  {
    id: 'weekly-enforcement-run',
    name: 'Weekly Enforcement Digest',
    category: 'enforcement',
    createdBy: 'System',
    dateLabel: 'Today',
    generatedAt: '2026-07-14',
    period: 'Week 28 · 2026',
    format: 'PDF',
    status: 'generating',
    charts: ['Violations by Day', 'Fine Status'],
    summary: { violations: 420, detections: 1180, revenue: 9800, accuracy: 0 },
  },
  {
    id: 'camera-health-failed',
    name: 'Camera Health Report',
    category: 'system',
    createdBy: 'System',
    dateLabel: 'Yesterday',
    generatedAt: '2026-07-13',
    period: 'July 2026',
    format: 'CSV',
    status: 'failed',
    charts: ['Camera Uptime'],
    summary: { violations: 0, detections: 0, revenue: 0, accuracy: 0 },
  },
  {
    id: 'scheduled-audit-preview',
    name: 'Quarterly Audit Preview',
    category: 'audit',
    createdBy: 'Administrator',
    dateLabel: 'Today',
    generatedAt: '2026-07-14',
    period: 'Q3 2026',
    format: 'PDF',
    status: 'scheduled',
    charts: ['API Usage', 'Login History'],
    summary: { violations: 0, detections: 0, revenue: 0, accuracy: 0 },
  },
];

export const SCHEDULED_REPORTS: ScheduledReport[] = [
  {
    id: 'sch-monthly',
    reportName: 'Monthly Traffic Violation Report',
    frequency: 'monthly',
    recipients: ['admin@camtraffic.gov.kh'],
    format: 'PDF',
    status: 'active',
    nextRun: '2026-08-01',
    category: 'enforcement',
  },
  {
    id: 'sch-weekly-ai',
    reportName: 'Weekly AI Detection Summary',
    frequency: 'weekly',
    recipients: ['admin@camtraffic.gov.kh', 'ai-ops@camtraffic.gov.kh'],
    format: 'Excel',
    status: 'active',
    nextRun: '2026-07-20',
    category: 'ai',
  },
  {
    id: 'sch-daily-fines',
    reportName: 'Daily Fine Revenue Snapshot',
    frequency: 'daily',
    recipients: ['finance@camtraffic.gov.kh'],
    format: 'CSV',
    status: 'active',
    nextRun: '2026-07-15',
    category: 'finance',
  },
  {
    id: 'sch-quarterly-audit',
    reportName: 'Quarterly Audit Report',
    frequency: 'quarterly',
    recipients: ['compliance@camtraffic.gov.kh'],
    format: 'PDF',
    status: 'disabled',
    nextRun: '2026-10-01',
    category: 'audit',
  },
];

/** Cambodia provinces for dashboard filters / bar charts. */
export const CAMBODIA_PROVINCES = [
  'Phnom Penh',
  'Kandal',
  'Siem Reap',
  'Battambang',
  'Kampong Cham',
  'Preah Sihanouk',
  'Takeo',
  'Kampot',
] as const;

export const VEHICLE_TYPE_DISTRIBUTION = [
  { name: 'Motorcycle', value: 42 },
  { name: 'Car', value: 28 },
  { name: 'Tuk-tuk', value: 12 },
  { name: 'Truck', value: 10 },
  { name: 'Bus', value: 5 },
  { name: 'Other', value: 3 },
] as const;

export function getCatalogReport(id: string): CatalogReport | undefined {
  return CATALOG_REPORTS.find((r) => r.id === id);
}
