export type AppealReviewDecision = 'approved' | 'rejected';

export interface OfficerAppealRecord {
  id: number;
  status: string;
  reason: string;
  driver_email: string;
  driver_name: string;
  violation_id: number;
  vehicle_plate: string;
  traffic_sign_code: string;
  traffic_sign_name: string;
  created_at: string;
  updated_at: string;
}

export interface OfficerAppealDetail extends OfficerAppealRecord {
  evidence_url: string | null;
  response: string;
  reviewed_at: string | null;
  reviewed_by_email: string | null;
  detected_at: string;
  violation_status: string;
  camera_name: string;
  station_name: string | null;
}

export interface OfficerAppealDecisionPayload {
  decision: AppealReviewDecision;
  response: string;
}
