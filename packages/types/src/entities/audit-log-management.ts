export type AuditLogAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'other';

export interface AuditLogActionCount {
  action: AuditLogAction;
  count: number;
}

export interface AuditLogModuleCount {
  module: string;
  count: number;
}

export interface AuditLogSummary {
  total_logs: number;
  logs_today: number;
  by_action: AuditLogActionCount[];
  by_module: AuditLogModuleCount[];
}

export interface AuditLogRecord {
  id: number;
  user_id: number | null;
  user_email: string | null;
  user_full_name: string;
  action: AuditLogAction;
  module: string;
  object_type: string;
  object_id: string;
  description: string;
  ip_address: string | null;
  user_agent: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
