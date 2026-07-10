import type { CameraStatus } from './camera';

export type CameraHealthState = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface CameraHealthRecord {
  id: number;
  name: string;
  code: string;
  location: string;
  status: CameraStatus;
  station_id: number | null;
  station_code: string | null;
  station_name: string | null;
  is_active: boolean;
  last_health_check: string | null;
  health_state: CameraHealthState;
  minutes_since_check: number | null;
  has_stream_url: boolean;
}

export interface CameraHealthMonitoring {
  total_cameras: number;
  healthy_cameras: number;
  warning_cameras: number;
  critical_cameras: number;
  unknown_cameras: number;
  stale_check_cameras: number;
  cameras: CameraHealthRecord[];
}

export interface CameraHealthCheckAllResult {
  checked_count: number;
}
