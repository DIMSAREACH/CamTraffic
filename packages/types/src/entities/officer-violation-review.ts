export type ViolationReviewStatus = 'pending' | 'approved' | 'rejected' | 'appealed';

export interface OfficerViolationReviewRecord {
  id: number;
  status: ViolationReviewStatus;
  detected_at: string;
  driver_email: string;
  driver_name: string;
  vehicle_plate: string;
  camera_name: string;
  camera_code: string;
  traffic_sign_code: string;
  traffic_sign_name: string;
  fine_amount: number;
  evidence_image_url: string | null;
}

export interface OfficerViolationReviewDetail extends OfficerViolationReviewRecord {
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
  reviewed_by_email: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type OfficerViolationDecision = 'approve' | 'reject';

export interface OfficerViolationDecisionPayload {
  decision: OfficerViolationDecision;
  officer_notes?: string;
}

export interface OfficerViolationDecisionResult {
  violation: OfficerViolationReviewDetail;
  fine_reference_number: string | null;
  message: string;
}
