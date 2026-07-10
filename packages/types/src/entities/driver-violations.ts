import type { ViolationReviewStatus } from './officer-violation-review';

export interface DriverViolationRecord {
  id: number;
  status: ViolationReviewStatus;
  detected_at: string;
  vehicle_plate: string;
  camera_name: string;
  camera_code: string;
  traffic_sign_code: string;
  traffic_sign_name: string;
  fine_amount: number;
  evidence_image_url: string | null;
}

export interface DriverViolationDetail extends DriverViolationRecord {
  detection_id: number;
  detection_confidence: number;
  detection_image_url: string | null;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_color: string;
  camera_location: string;
  station_name: string | null;
  traffic_sign_name_km: string;
  officer_notes: string;
  reviewed_at: string | null;
  fine_reference_number: string | null;
  fine_status: string | null;
  issued_fine_amount: number | null;
  created_at: string;
  updated_at: string;
}
