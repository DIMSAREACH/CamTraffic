export type UserRole = 'admin' | 'police' | 'driver';

export type FineStatus = 'pending' | 'paid' | 'overdue' | 'dismissed' | 'disputed';

export type SignCategory = 'warning' | 'prohibitory' | 'mandatory' | 'informative';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone: string;
  address: string;
  license_no?: string;
  profile_image?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}
