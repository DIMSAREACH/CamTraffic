export type UserRole = 'admin' | 'police' | 'driver';
export type FineStatus = 'pending' | 'paid' | 'overdue' | 'dismissed' | 'disputed';
export type SignCategory = 'warning' | 'prohibitory' | 'mandatory' | 'informative';
export type NotificationType = 'fine' | 'violation' | 'system' | 'detection' | 'alert';

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
  deleted_at?: string | null;
  is_superuser?: boolean;
  email_verified?: boolean;
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
  id: string;
  owner_id: string;
  owner_name: string;
  plate_number: string;
  vehicle_type: 'car' | 'motorcycle' | 'truck' | 'bus' | 'tuk-tuk';
  model: string;
  color: string;
  year: number;
  registration_photo?: string | null;
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
  id: string;
  driver_id: string;
  driver_name: string;
  driver_license: string;
  police_id?: string;
  police_name: string;
  amount: number;
  reason: string;
  status: FineStatus;
  evidence_image?: string;
  location: string;
  vehicle_plate: string;
  violation_id?: string;
  payment_method?: string;
  payment_reference?: string;
  payment_screenshot?: string;
  created_at: string;
  paid_at?: string;
}

export type AppealStatus = 'pending' | 'upheld' | 'dismissed';

export interface ViolationAppeal {
  id: string;
  violation_id: string;
  fine_id?: string | null;
  driver_id: string;
  driver_name: string;
  driver_license: string;
  reason: string;
  evidence_image?: string | null;
  status: AppealStatus;
  submitted_at: string;
  review_date?: string | null;
  reviewed_by?: string | null;
  reviewed_by_name?: string | null;
  officer_comments?: string;
  violation_type?: string;
  violation_location?: string;
  updated_at?: string;
}

export interface AuditLogEntry {
  id: string;
  user_id?: string | null;
  user_name?: string | null;
  user_role?: string | null;
  action: string;
  resource: string;
  resource_id: string;
  ip_address?: string | null;
  timestamp: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  extra_data?: Record<string, unknown>;
}

export interface UnknownVehicleRecord {
  id: string;
  plate_detected: string;
  camera_id?: string | null;
  camera_name?: string | null;
  violation_type?: string;
  evidence_photo?: string | null;
  ai_confidence_score?: number | null;
  is_resolved: boolean;
  resolved_by?: string | null;
  resolved_by_name?: string | null;
  linked_vehicle?: string | null;
  linked_vehicle_plate?: string | null;
  linked_violation?: string | null;
  officer_note?: string;
  detected_at: string;
  resolved_at?: string | null;
}

export interface AIModelVersion {
  id: string;
  version: string;
  model_file: string;
  description?: string;
  accuracy?: number | null;
  is_active: boolean;
  uploaded_by?: string | null;
  uploaded_by_name?: string | null;
  uploaded_at: string;
}

export interface AIDetectionLog {
  id: number;
  user_id: number;
  user_name: string;
  user_email?: string;
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
  processing_time?: number;
  model_version?: string;
  review_status?: 'pending' | 'approved' | 'rejected';
  vehicle_snapshot?: string;
  plate_snapshot?: string;
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
  name?: string;
  /** Backend alias for name (camera — road). */
  location?: string;
  fines?: number;
  detections?: number;
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
  id: string;
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
  id: string;
  road_id: string;
  road_name: string;
  road?: string;
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
  id: string;
  driver_id: string;
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
  ai_detection_log?: string | null;
  fine_id?: string | null;
  driver_user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ViolationRule {
  id: string;
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

export interface RBACPermission {
  id: string;
  perm_name: string;
  action_type: string;
  resource: string;
  description?: string;
  created_at?: string;
}

export interface RBACRole {
  id: string;
  role_name: string;
  description?: string;
  status: 'active' | 'inactive';
  assigned_date?: string | null;
  created_at?: string;
  permissions?: RBACPermission[];
}

export interface PoliceStation {
  id: string;
  name: string;
  code: string;
  city?: string;
  region?: string;
  address?: string;
  phone?: string;
  latitude?: string | null;
  longitude?: string | null;
  status: 'active' | 'inactive';
  officer_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface OfficerProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  badge_no: string;
  rank?: string;
  department?: string;
  status: 'active' | 'inactive' | 'suspended';
  station?: string | null;
  station_name?: string | null;
  created_at?: string;
}

export interface DriverProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  license_no: string;
  national_id?: string | null;
  license_expiry?: string | null;
  date_of_birth?: string | null;
  kyc_status: 'unverified' | 'pending' | 'approved' | 'rejected';
  status: 'active' | 'inactive' | 'suspended';
  created_at?: string;
  updated_at?: string;
}

export interface SystemBackupItem {
  filename: string;
  size_bytes: number;
  created_at: string;
}

export type ImportDataType = 'users' | 'vehicles' | 'signs' | 'cameras' | 'violations';

export type ImportRowStatus = 'ok' | 'error' | 'skip' | 'success' | 'failed';

export interface ImportRowReport {
  row: number;
  status: ImportRowStatus;
  errors: string[];
  data: Record<string, unknown>;
}

export interface ImportValidateCounts {
  total: number;
  valid: number;
  skipped: number;
  failed: number;
  success: number;
  error: number;
}

export interface ImportValidateResult {
  job_id: string;
  import_type: ImportDataType;
  file_name: string;
  rows: ImportRowReport[];
  counts: ImportValidateCounts;
}

export interface ImportJobSummary {
  id: string;
  import_type: ImportDataType;
  file_name: string;
  status: string;
  created_by_email?: string | null;
  created_by_name?: string | null;
  total_rows: number;
  valid_rows: number;
  success_count: number;
  failed_count: number;
  skipped_count: number;
  created_at: string;
}

export interface ImportTypeInfo {
  type: ImportDataType;
  label: string;
  unique_key: string;
  columns: Array<{ key: string; required: boolean; note: string }>;
}
