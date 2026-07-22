export type UserRole = 'admin' | 'police' | 'driver';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone?: string;
}

export interface Fine {
  id: string;
  driver_id: string;
  amount: number | string;
  status: 'pending' | 'paid' | 'overdue' | 'dismissed' | 'disputed';
  reason?: string;
  location?: string;
  vehicle_plate?: string;
  due_date?: string;
  created_at?: string;
}

export interface Violation {
  id: string;
  violation_type: string;
  status: string;
  location?: string;
  violation_date?: string;
  vehicle_plate?: string;
}

export interface Appeal {
  id: string;
  fine_id: string;
  status: string;
  reason?: string;
  created_at?: string;
}

export interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type?: string;
  make?: string;
  model?: string;
}

export interface DriverDashboardStats {
  total_fines?: number;
  pending_fines?: number;
  paid_fines?: number;
  total_violations?: number;
  pending_amount?: number | string;
  recent_fines?: Fine[];
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface Paginated<T> {
  results: T[];
  count: number;
}
