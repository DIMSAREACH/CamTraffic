export type SystemSettingValueType = 'string' | 'integer' | 'boolean' | 'json';

export interface SystemSettingRecord {
  id: number;
  key: string;
  value: string;
  value_type: SystemSettingValueType;
  description: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSystemSettingPayload {
  key: string;
  value: string;
  value_type: SystemSettingValueType;
  description?: string;
  is_public?: boolean;
}

export interface UpdateSystemSettingPayload {
  key?: string;
  value?: string;
  value_type?: SystemSettingValueType;
  description?: string;
  is_public?: boolean;
}
