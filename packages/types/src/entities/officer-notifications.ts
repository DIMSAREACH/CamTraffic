export interface OfficerNotificationRecord {
  id: number;
  title: string;
  body: string;
  is_read: boolean;
  read_at: string | null;
  template_code: string | null;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OfficerNotificationSummary {
  total: number;
  unread: number;
}

export interface OfficerNotificationReadAllResult {
  updated: number;
}
