export interface LoginHistoryRecord {
  id: string;
  user_id: string;
  user_email: string;
  user_full_name: string;
  ip_address: string | null;
  user_agent: string;
  success: boolean;
  failure_reason: string;
  created_at: string;
  updated_at: string;
}
