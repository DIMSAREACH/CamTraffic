export interface DetectionMonitorRecord {
  id: number;
  camera_id: number;
  camera_name: string;
  camera_code: string;
  model_version_id: number | null;
  model_name: string | null;
  version_label: string | null;
  traffic_sign_id: number | null;
  traffic_sign_code: string | null;
  traffic_sign_name: string | null;
  confidence: number;
  plate_number: string;
  plate_confidence: number | null;
  image_url: string | null;
  detected_at: string;
  created_at: string;
}

export interface DetectionMonitorSummary {
  total_detections: number;
  detections_today: number;
  average_confidence: number;
  low_confidence_count: number;
  latest_detected_at: string | null;
}
