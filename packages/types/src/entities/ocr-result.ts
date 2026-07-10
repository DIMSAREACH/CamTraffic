export interface OCRResultRecord {
  id: number;
  detection_id: number;
  plate_number: string;
  raw_text: string;
  confidence: number;
  language: string;
  bounding_box: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateOCRResultPayload {
  detection_id: number;
  raw_text: string;
  confidence: number;
  language?: string;
  bounding_box?: Record<string, unknown>;
}

export interface DetectionOCRSummary {
  id: number;
  raw_text: string;
  confidence: number;
  language: string;
}

export interface DetectionDetailRecord {
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
  bounding_box: Record<string, unknown>;
  metadata: Record<string, unknown>;
  ocr_result: DetectionOCRSummary | null;
}
