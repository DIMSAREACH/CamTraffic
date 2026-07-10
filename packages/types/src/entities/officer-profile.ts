export interface OfficerProfileRecord {
  id: number;
  badge_number: string;
  rank: string;
  hire_date: string | null;
  station_id: number;
  station_code: string;
  station_name: string;
  station_province: string;
  station_address: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateOfficerProfilePayload {
  rank?: string;
}
