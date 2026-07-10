export interface DriverSettingsRecord {
  notify_email: boolean;
  notify_violations: boolean;
  notify_fines: boolean;
  notify_appeals: boolean;
  updated_at: string;
}

export interface UpdateDriverSettingsPayload {
  notify_email?: boolean;
  notify_violations?: boolean;
  notify_fines?: boolean;
  notify_appeals?: boolean;
}
