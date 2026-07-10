import type { CameraStatus } from './camera';

export interface CameraLiveFeedItem {
  id: number;
  name: string;
  code: string;
  location: string;
  stream_url: string;
  status: CameraStatus;
  station_id: number | null;
  station_code: string | null;
  station_name: string | null;
  is_active: boolean;
  is_stream_available: boolean;
  last_health_check: string | null;
}

export interface CameraLiveDashboard {
  total_cameras: number;
  online_cameras: number;
  offline_cameras: number;
  streaming_cameras: number;
  cameras: CameraLiveFeedItem[];
}
