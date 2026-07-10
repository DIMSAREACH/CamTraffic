import type { User } from './user';

export interface Driver extends User {
  role: 'driver';
  license_number: string;
  phone?: string;
}
