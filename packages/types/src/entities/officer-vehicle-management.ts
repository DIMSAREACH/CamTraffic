export interface OfficerVehicleStationViolationSummary {
  id: number;
  status: string;
  detected_at: string;
  traffic_sign_code: string;
  traffic_sign_name: string;
}

export interface OfficerVehicleManagementRecord {
  id: number;
  owner_id: string;
  owner_email: string;
  owner_name: string;
  owner_license_number: string;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  color: string;
  registration_date: string | null;
  station_violation_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfficerVehicleManagementDetail extends OfficerVehicleManagementRecord {
  station_violations: OfficerVehicleStationViolationSummary[];
}

export interface CreateOfficerVehiclePayload {
  owner_id: string;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  registration_date?: string | null;
  is_active?: boolean;
}

export interface UpdateOfficerVehiclePayload {
  owner_id?: string;
  plate_number?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  registration_date?: string | null;
  is_active?: boolean;
}
