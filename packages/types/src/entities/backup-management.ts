export type BackupStatus = 'pending' | 'completed' | 'failed';

export interface BackupRecord {
  id: number;
  filename: string;
  file_path: string;
  file_url: string | null;
  file_size: number;
  status: BackupStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBackupPayload {
  notes?: string;
}

export interface BackupRestoreResult {
  system_settings: number;
  notification_templates: number;
  sign_categories: number;
  traffic_signs: number;
}
