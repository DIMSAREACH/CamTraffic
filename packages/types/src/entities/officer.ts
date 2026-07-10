import type { User } from './user';

export interface Officer extends User {
  role: 'officer';
  badge_number: string;
  station_id: string;
  rank?: string;
}
