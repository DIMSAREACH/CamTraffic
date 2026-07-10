import type { FineStatus } from './fine';

export type { FineStatus };
export type FinePaymentMethod = 'cash' | 'bank' | 'mobile';

export interface DriverFineRecord {
  id: number;
  reference_number: string;
  amount: number;
  currency: string;
  status: FineStatus;
  due_date: string;
  paid_at: string | null;
  violation_id: number;
  vehicle_plate: string;
  traffic_sign_code: string;
  traffic_sign_name: string;
  detected_at: string;
  created_at: string;
  updated_at: string;
}

export interface DriverFineDetail extends DriverFineRecord {
  violation_status: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  camera_name: string;
  camera_code: string;
  camera_location: string;
  station_name: string | null;
  traffic_sign_name_km: string;
  officer_notes: string;
  can_pay: boolean;
}

export interface DriverFinePaymentPayload {
  method: FinePaymentMethod;
  transaction_id?: string;
}

export interface DriverFinePaymentResult {
  fine: DriverFineDetail;
  payment_id: number;
  message: string;
}

export interface DriverFinePaymentHistoryRecord {
  id: number;
  fine_id: number;
  fine_reference_number: string;
  amount: number;
  currency: string;
  method: FinePaymentMethod;
  transaction_id: string;
  paid_at: string;
  vehicle_plate: string;
  traffic_sign_code: string;
  traffic_sign_name: string;
  created_at: string;
}

export interface DriverFinePaymentHistoryDetail extends DriverFinePaymentHistoryRecord {
  violation_id: number;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  detected_at: string;
  camera_name: string;
  camera_code: string;
  station_name: string | null;
}
