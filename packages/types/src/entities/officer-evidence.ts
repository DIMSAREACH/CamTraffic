export type OfficerEvidenceStatus = 'pending' | 'approved' | 'rejected' | 'appealed';

export interface OfficerEvidenceRecord {
  id: number;
  status: OfficerEvidenceStatus;
  detected_at: string;
  driver_name: string;
  vehicle_plate: string;
  camera_name: string;
  camera_code: string;
  traffic_sign_code: string;
  traffic_sign_name: string;
  evidence_image_url: string | null;
  detection_image_url: string | null;
  has_evidence: boolean;
}

export interface OfficerEvidenceDetail extends OfficerEvidenceRecord {
  detection_id: number;
  detection_confidence: number;
  bounding_box: Record<string, unknown>;
  driver_email: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_color: string;
  camera_location: string;
  station_name: string | null;
  traffic_sign_name_km: string;
  fine_amount: number;
  officer_notes: string;
  reviewed_by_email: string | null;
  reviewed_at: string | null;
}
