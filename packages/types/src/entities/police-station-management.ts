export interface PoliceStationManagementRecord {
  id: number;
  code: string;
  name: string;
  name_km: string;
  address: string;
  province: string;
  district: string;
  phone: string;
  latitude: string | null;
  longitude: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePoliceStationPayload {
  code: string;
  name: string;
  name_km?: string;
  address: string;
  province: string;
  district?: string;
  phone?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  is_active?: boolean;
}

export interface UpdatePoliceStationPayload {
  code?: string;
  name?: string;
  name_km?: string;
  address?: string;
  province?: string;
  district?: string;
  phone?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  is_active?: boolean;
}
