export type UserRole = 'admin' | 'police' | 'driver';
export type FineStatus = 'pending' | 'paid' | 'overdue' | 'dismissed';
export type SignCategory = 'warning' | 'prohibitory' | 'mandatory' | 'informative';
export type NotificationType = 'fine' | 'system' | 'detection' | 'alert';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone: string;
  address: string;
  license_no?: string;
  profile_image?: string;
  created_at: string;
  updated_at?: string;
  last_login?: string | null;
  auth_provider?: 'email' | 'google' | 'github';
  is_active: boolean;
}

export interface UserPreferences {
  notify_fines: boolean;
  notify_detections: boolean;
  notify_alerts: boolean;
  notify_system: boolean;
  two_factor_enabled: boolean;
  login_notifications: boolean;
  suspicious_alerts: boolean;
  muted_until?: string | null;
}

export interface ProfileActivityItem {
  action: string;
  time: string;
  time_label: string;
  type: string;
  color: string;
}

export interface ProfileSessionItem {
  id?: number;
  device: string;
  location: string;
  ip_masked: string;
  time_label: string;
  current: boolean;
}

export interface ProfileLoginEvent {
  status: 'success' | 'failed';
  device: string;
  ip_masked: string;
  time: string;
  time_label: string;
}

export interface ProfileOverview {
  user: User;
  preferences: UserPreferences;
  activity: ProfileActivityItem[];
  sessions: ProfileSessionItem[];
  login_history: ProfileLoginEvent[];
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RegisterResponse {
  user: User;
}

/** Sent with login so the API enforces portal + role for this email. */
export interface LoginOptions {
  portal: 'admin' | 'user';
  role?: 'police' | 'driver';
}

export interface Vehicle {
  id: number;
  owner_id: number;
  owner_name: string;
  plate_number: string;
  vehicle_type: 'car' | 'motorcycle' | 'truck' | 'bus' | 'tuk-tuk';
  model: string;
  color: string;
  year: number;
  created_at: string;
}

export interface TrafficSign {
  id: number;
  sign_name: string;
  sign_name_km?: string;
  sign_name_en?: string;
  sign_code: string;
  description: string;
  description_en?: string;
  guidance?: string;
  guidance_en?: string;
  image: string;
  category: SignCategory;
  penalty?: string;
  rules?: string[];
}

export interface Fine {
  id: number;
  driver_id: number;
  driver_name: string;
  driver_license: string;
  police_id: number;
  police_name: string;
  amount: number;
  reason: string;
  status: FineStatus;
  evidence_image?: string;
  location: string;
  vehicle_plate: string;
  created_at: string;
  paid_at?: string;
}

export interface AIDetectionLog {
  id: number;
  user_id: number;
  user_name: string;
  user_profile_image?: string;
  uploaded_image: string;
  detected_sign: string;
  confidence: number;
  description: string;
  guidance: string;
  vehicle_count?: number;
  detected_vehicles?: Array<{
    vehicle_type: string;
    label: string;
    confidence: number;
    bbox: { x1: number; y1: number; x2: number; y2: number };
  }>;
  detection_mode?: 'sign' | 'vehicle' | 'plate' | 'unknown_sign' | 'no_sign';
  display_label?: string;
  display_label_en?: string;
  display_label_km?: string;
  display_confidence?: number;
  display_description?: string;
  display_description_en?: string;
  detected_plate?: string;
  plate_confidence?: number;
  plate_type?: string;
  plate_ocr_details?: Array<{
    text: string;
    raw_text?: string;
    confidence: number;
    region?: string;
  }>;
  matched_vehicle_id?: number | null;
  matched_vehicle?: {
    id: number;
    plate_number: string;
    owner_name: string;
    vehicle_type: string;
  } | null;
  created_at: string;
}

export interface AIDetectionSampleSign {
  id: number;
  sign_name: string;
  sign_name_km?: string;
  sign_name_en?: string;
  sign_code: string;
  category: SignCategory;
  image: string;
  label: string;
  color: string;
}

export interface AIDetectionCategoryStat {
  key: string;
  name: string;
  count: number;
  color: string;
  desc: string;
}

export interface AIDetectionPageStats {
  model: {
    name: string;
    version: string;
    mode: 'local' | 'yolo' | 'hybrid' | 'mock' | 'mock_fallback';
    detection_mode?: string;
    catalog_sign_count?: number;
    yolo_trained_classes?: number;
    catalog_visual_refs?: number;
    live_catalog_coverage?: number;
    weights_loaded: boolean;
    gemini_enabled?: boolean;
    plate_ocr_enabled?: boolean;
    plate_ocr_engine?: string;
    hybrid_threshold?: number;
    sign_classes: number;
    training_images: number;
    last_trained_at?: number;
    trained_sign_codes?: string[];
    vehicle_detection_enabled?: boolean;
    vehicle_model?: string;
    vehicle_classes?: string[];
  };
  stats: {
    total_scans: number;
    accuracy_avg: number;
    avg_speed_sec: number;
    sign_count: number;
    vehicles_detected_total?: number;
  };
  categories: AIDetectionCategoryStat[];
  sample_signs: AIDetectionSampleSign[];
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  is_read: boolean;
  type: NotificationType;
  created_at: string;
}

export interface MonthlyData {
  month: string;
  count: number;
  revenue?: number;
}

export interface ReasonData {
  reason: string;
  count: number;
}

export interface RoleData {
  role: string;
  count: number;
}

export interface ReportSignCount {
  sign: string;
  count: number;
}

export interface ReportLocationRow {
  name: string;
  fines: number;
  detections: number;
}

export interface ReportHourCount {
  hour: string;
  count: number;
}

export interface TrendBadge {
  value: number;
  up: boolean;
}

export type RoadStatus = 'active' | 'inactive' | 'maintenance';
export type RoadType = 'highway' | 'urban' | 'rural' | 'intersection';
export type CameraStatus = 'active' | 'inactive' | 'maintenance';
export type CameraType = 'fixed' | 'ptz' | 'speed';

export interface Road {
  id: number;
  name: string;
  road_type: RoadType;
  length_km?: number | null;
  speed_limit: number;
  region: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  status: RoadStatus;
  camera_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Camera {
  id: number;
  road_id: number;
  road_name: string;
  road?: number;
  name: string;
  code: string;
  model: string;
  camera_type: CameraType;
  installed_date?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: CameraStatus;
  frame_source_url: string;
  created_at: string;
  updated_at: string;
}

export interface TrafficViolation {
  id: number;
  driver_id: number;
  driver_name: string;
  driver_license: string;
  officer_name?: string | null;
  vehicle_plate?: string | null;
  violation_type: string;
  observed_action: string;
  detected_sign_code: string;
  detected_class_key: string;
  violation_date: string;
  location: string;
  description: string;
  evidence_image?: string | null;
  vehicle_evidence_image?: string | null;
  plate_evidence_image?: string | null;
  status: 'draft' | 'pending_review' | 'confirmed' | 'rejected';
  ai_detection_log?: number | null;
  fine_id?: number | null;
  driver_user_id?: number;
  created_at: string;
  updated_at: string;
}

export interface ViolationRule {
  id: number;
  sign_class_key: string;
  prohibited_action: string;
  violation_type: string;
  title: string;
  description: string;
  default_fine_amount: number;
  is_active: boolean;
}

export interface EvidenceArchiveItem {
  id: string;
  source_type: 'detection' | 'violation' | 'fine';
  source_id: number;
  title: string;
  plate: string;
  location: string;
  image_url: string | null;
  vehicle_image_url: string | null;
  plate_image_url: string | null;
  created_at: string;
}

export interface DashboardStats {
  total_users: number;
  total_drivers: number;
  total_police: number;
  total_fines: number;
  paid_fines: number;
  pending_fines: number;
  total_detections: number;
  total_vehicles: number;
  total_signs?: number;
  total_violations?: number;
  pending_violations?: number;
  confirmed_violations?: number;
  fine_revenue: number;
  detection_accuracy: number;
  monthly_fines: MonthlyData[];
  monthly_detections: MonthlyData[];
  monthly_violations?: MonthlyData[];
  fine_by_reason: ReasonData[];
  violation_by_type?: Array<{ reason?: string; violation_type?: string; count: number }>;
  user_distribution: RoleData[];
  detection_by_sign?: ReportSignCount[];
  top_locations?: ReportLocationRow[];
  peak_hours?: ReportHourCount[];
  monthly_registrations?: MonthlyData[];
  trends?: {
    users?: TrendBadge | null;
    fines?: TrendBadge | null;
    detections?: TrendBadge | null;
    violations?: TrendBadge | null;
    revenue?: TrendBadge | null;
  };
}
