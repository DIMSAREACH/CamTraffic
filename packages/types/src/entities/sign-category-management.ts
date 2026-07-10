export interface SignCategoryManagementRecord {
  id: number;
  code: string;
  name_en: string;
  name_km: string;
  description: string;
  is_active: boolean;
  sign_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSignCategoryPayload {
  code: string;
  name_en: string;
  name_km: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateSignCategoryPayload {
  code?: string;
  name_en?: string;
  name_km?: string;
  description?: string;
  is_active?: boolean;
}
