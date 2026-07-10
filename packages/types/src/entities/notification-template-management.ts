export type NotificationChannel = 'email' | 'sms' | 'in_app';

export interface NotificationTemplateRecord {
  id: number;
  code: string;
  name: string;
  channel: NotificationChannel;
  subject_en: string;
  subject_km: string;
  body_en: string;
  body_km: string;
  is_active: boolean;
  notification_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationTemplatePayload {
  code: string;
  name: string;
  channel: NotificationChannel;
  subject_en: string;
  subject_km?: string;
  body_en: string;
  body_km?: string;
  is_active?: boolean;
}

export interface UpdateNotificationTemplatePayload {
  code?: string;
  name?: string;
  channel?: NotificationChannel;
  subject_en?: string;
  subject_km?: string;
  body_en?: string;
  body_km?: string;
  is_active?: boolean;
}
