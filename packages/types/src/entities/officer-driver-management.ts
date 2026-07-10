export interface OfficerDriverVehicleSummary {
  id: number;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  color: string;
  is_active: boolean;
}

export interface OfficerDriverManagementRecord {
  id: number;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  license_number: string;
  license_class: string;
  license_expiry: string | null;
  national_id: string;
  vehicle_count: number;
  station_violation_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfficerDriverManagementDetail extends OfficerDriverManagementRecord {
  vehicles: OfficerDriverVehicleSummary[];
}

export interface CreateOfficerDriverPayload {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  password?: string;
  license_number: string;
  license_class?: string;
  license_expiry?: string | null;
  national_id?: string;
  is_active?: boolean;
}

export interface UpdateOfficerDriverPayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
  license_number?: string;
  license_class?: string;
  license_expiry?: string | null;
  national_id?: string;
  is_active?: boolean;
}
