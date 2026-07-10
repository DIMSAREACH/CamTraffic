export type AppealStatus = 'submitted' | 'under_review' | 'approved' | 'rejected';

export interface DriverAppealableViolationRecord {
  id: number;
  detected_at: string;
  vehicle_plate: string;
  traffic_sign_code: string;
  traffic_sign_name: string;
  fine_reference_number: string | null;
  fine_amount: number | null;
  fine_currency: string | null;
}

export interface DriverAppealRecord {
  id: number;
  status: AppealStatus;
  reason: string;
  violation_id: number;
  vehicle_plate: string;
  traffic_sign_code: string;
  traffic_sign_name: string;
  created_at: string;
  updated_at: string;
}

export interface DriverAppealDetail extends DriverAppealRecord {
  evidence_url: string | null;
  response: string;
  reviewed_at: string | null;
  detected_at: string;
  violation_status: string;
  camera_name: string;
  camera_code: string;
  station_name: string | null;
}

export interface CreateDriverAppealPayload {
  violation_id: number;
  reason: string;
  evidence?: File | null;
}
