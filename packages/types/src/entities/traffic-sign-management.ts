export interface SignCategoryOption {
  id: number;
  code: string;
  name_en: string;
  name_km: string;
  is_active: boolean;
}

export interface TrafficSignManagementRecord {
  id: number;
  code: string;
  name_en: string;
  name_km: string;
  category_id: number;
  category_code: string;
  category_name: string;
  description: string;
  image_url: string | null;
  fine_amount: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTrafficSignPayload {
  code: string;
  name_en: string;
  name_km: string;
  category_id: number;
  description?: string;
  fine_amount?: string | number;
  is_active?: boolean;
}

export interface UpdateTrafficSignPayload {
  code?: string;
  name_en?: string;
  name_km?: string;
  category_id?: number;
  description?: string;
  fine_amount?: string | number;
  is_active?: boolean;
}
