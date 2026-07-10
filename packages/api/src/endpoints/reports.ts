import type {
  CreateReportExportPayload,
  ReportCatalogItem,
  ReportExportRecord,
} from '@camtraffic/types';
import type { ApiClient } from '../client';

export function createReportsEndpoints(client: ApiClient) {
  return {
    catalog: () => client.get<ReportCatalogItem[]>('/api/v1/reports/catalog/'),
    listExports: (params?: { report_type?: string; status?: string; limit?: number }) =>
      client.get<ReportExportRecord[]>('/api/v1/reports/exports/', { params }),
    createExport: (payload: CreateReportExportPayload) =>
      client.post<ReportExportRecord>('/api/v1/reports/exports/', payload),
    getExport: (exportId: number) => client.get<ReportExportRecord>(`/api/v1/reports/exports/${exportId}/`),
    officer: {
      catalog: () => client.get<ReportCatalogItem[]>('/api/v1/reports/officer/catalog/'),
      listExports: (params?: { report_type?: string; status?: string; limit?: number }) =>
        client.get<ReportExportRecord[]>('/api/v1/reports/officer/exports/', { params }),
      createExport: (payload: CreateReportExportPayload) =>
        client.post<ReportExportRecord>('/api/v1/reports/officer/exports/', payload),
      getExport: (exportId: number) =>
        client.get<ReportExportRecord>(`/api/v1/reports/officer/exports/${exportId}/`),
    },
  };
}
