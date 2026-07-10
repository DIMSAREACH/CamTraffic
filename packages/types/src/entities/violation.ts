export type ViolationStatus = 'pending' | 'approved' | 'rejected' | 'appealed';

export interface Violation {
  id: string;
  driver_id: string;
  vehicle_id: string;
  camera_id: string;
  sign_id: string;
  status: ViolationStatus;
  evidence_url?: string;
  detected_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}
