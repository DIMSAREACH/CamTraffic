export type UserRole = 'admin' | 'police' | 'driver';
export type FineStatus = 'pending' | 'paid' | 'overdue' | 'dismissed';
export type SignCategory = 'warning' | 'prohibitory' | 'mandatory' | 'informative';
export type NotificationType = 'fine' | 'system' | 'detection' | 'alert';

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  phone: string;
  address: string;
  license_no?: string;
  profile_image?: string;
  created_at: string;
  is_active: boolean;
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
  sign_code: string;
  description: string;
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
  uploaded_image: string;
  detected_sign: string;
  confidence: number;
  description: string;
  guidance: string;
  created_at: string;
}

export interface AIDetectionSampleSign {
  id: number;
  sign_name: string;
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
    mode: 'yolo' | 'mock' | 'mock_fallback';
    weights_loaded: boolean;
    sign_classes: number;
    training_images: number;
  };
  stats: {
    total_scans: number;
    accuracy_avg: number;
    avg_speed_sec: number;
    sign_count: number;
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

export interface TrendBadge {
  value: number;
  up: boolean;
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
  fine_revenue: number;
  detection_accuracy: number;
  monthly_fines: MonthlyData[];
  monthly_detections: MonthlyData[];
  fine_by_reason: ReasonData[];
  user_distribution: RoleData[];
  trends?: {
    users?: TrendBadge | null;
    fines?: TrendBadge | null;
    detections?: TrendBadge | null;
    revenue?: TrendBadge | null;
  };
}
