export interface DriverVehicleViolationSummary {
  id: number;
  status: string;
  detected_at: string;
  traffic_sign_code: string;
  traffic_sign_name: string;
}

export interface DriverVehicleRecord {
  id: number;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  color: string;
  registration_date: string | null;
  violation_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DriverVehicleDetail extends DriverVehicleRecord {
  violations: DriverVehicleViolationSummary[];
}
