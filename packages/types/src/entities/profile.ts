import type { UserRole } from './user';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: UserRole;
  is_email_verified: boolean;
  avatar_url?: string | null;
  locale: 'en' | 'km';
  bio: string;
  address: string;
  province: string;
  district: string;
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
  locale?: 'en' | 'km';
  bio?: string;
  address?: string;
  province?: string;
  district?: string;
  date_of_birth?: string | null;
}
