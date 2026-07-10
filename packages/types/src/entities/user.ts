export type UserRole = 'super_admin' | 'admin' | 'officer' | 'driver';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  is_email_verified: boolean;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}
