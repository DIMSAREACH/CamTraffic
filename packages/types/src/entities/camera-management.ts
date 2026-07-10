import type { CameraStatus } from './camera';

export interface CameraManagementRecord {
  id: number;
  name: string;
  code: string;
  location: string;
  stream_url: string;
  status: CameraStatus;
  station_id: number | null;
  station_code: string | null;
  station_name: string | null;
  latitude: string | null;
  longitude: string | null;
  is_active: boolean;
  last_health_check: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCameraPayload {
  name: string;
  code: string;
  location: string;
  stream_url?: string;
  status?: CameraStatus;
  station_id?: number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  is_active?: boolean;
}

export interface UpdateCameraPayload {
  name?: string;
  code?: string;
  location?: string;
  stream_url?: string;
  status?: CameraStatus;
  station_id?: number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  is_active?: boolean;
}
