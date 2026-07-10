export type ReportFormat = 'pdf' | 'excel' | 'csv';

export type ReportExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ReportTypeCode = 'violations' | 'detections' | 'fines' | 'cameras';

export interface ReportCatalogItem {
  code: ReportTypeCode;
  name: string;
  description: string;
  supported_formats: ReportFormat[];
}

export interface ReportExportRecord {
  id: number;
  report_type: string;
  format: ReportFormat;
  status: ReportExportStatus;
  file_url: string | null;
  parameters: Record<string, unknown>;
  error_message: string;
  requested_by_email: string;
  created_at: string;
  updated_at: string;
}

export interface CreateReportExportPayload {
  report_type: string;
  format?: ReportFormat;
  parameters?: Record<string, unknown>;
}
