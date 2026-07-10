export interface DriverProfileRecord {
  id: number;
  license_number: string;
  license_class: string;
  license_expiry: string | null;
  national_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateDriverProfilePayload {
  national_id?: string;
}
