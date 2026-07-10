export interface PoliceStationOption {
  id: number;
  code: string;
  name: string;
  province: string;
  is_active: boolean;
}

export interface OfficerManagementRecord {
  id: number;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  badge_number: string;
  rank: string;
  hire_date: string | null;
  station_id: number;
  station_code: string;
  station_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateOfficerPayload {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  password?: string;
  badge_number: string;
  station_id: number;
  rank?: string;
  hire_date?: string | null;
  is_active?: boolean;
}

export interface UpdateOfficerPayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
  badge_number?: string;
  station_id?: number;
  rank?: string;
  hire_date?: string | null;
  is_active?: boolean;
}
