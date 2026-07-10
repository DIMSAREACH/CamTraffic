import type { UserRole } from './user';

export interface UserManagementRecord {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserPayload {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  is_active?: boolean;
  password?: string;
}

export interface UpdateUserPayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
  role?: UserRole;
  is_active?: boolean;
  is_email_verified?: boolean;
}
