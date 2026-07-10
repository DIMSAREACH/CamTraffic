import type { AuditLogRecord, AuditLogSummary, LoginHistoryRecord } from '@camtraffic/types';
import type { ApiClient } from '../client';

export interface LoginHistoryQuery {
  user_id?: string;
  success?: boolean;
  limit?: number;
}

export interface AuditLogQuery {
  action?: string;
  module?: string;
  user_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}

export function createAuditEndpoints(client: ApiClient) {
  return {
    auditLogSummary: () => client.get<AuditLogSummary>('/api/v1/audit/logs/summary/'),
    listAuditLogs: (query: AuditLogQuery = {}) =>
      client.get<AuditLogRecord[]>('/api/v1/audit/logs/', {
        params: {
          action: query.action,
          module: query.module,
          user_id: query.user_id,
          search: query.search,
          date_from: query.date_from,
          date_to: query.date_to,
          limit: query.limit,
        },
      }),
    listLoginHistory: (query: LoginHistoryQuery = {}) =>
      client.get<LoginHistoryRecord[]>('/api/v1/audit/login-history/', {
        params: {
          user_id: query.user_id,
          success: query.success,
          limit: query.limit,
        },
      }),
  };
}
