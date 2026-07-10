export type CameraStatus = 'online' | 'offline' | 'maintenance' | 'error';

export interface Camera {
  id: string;
  name: string;
  location: string;
  stream_url?: string;
  status: CameraStatus;
  latitude?: number;
  longitude?: number;
  created_at: string;
}
