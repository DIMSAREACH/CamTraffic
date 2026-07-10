import type {
  DetectionDetailRecord,
  DetectionMonitorRecord,
  DetectionMonitorSummary,
  OfficerLiveDetectionCameraOption,
} from '@camtraffic/types';
import type { ApiClient } from '../client';

export function createDetectionsEndpoints(client: ApiClient) {
  return {
    monitoringSummary: () => client.get<DetectionMonitorSummary>('/api/v1/detections/monitoring/summary/'),
    listMonitoring: (params?: {
      camera_id?: string;
      model_version_id?: string;
      min_confidence?: string;
      search?: string;
      limit?: number;
    }) => client.get<DetectionMonitorRecord[]>('/api/v1/detections/monitoring/', { params }),
    get: (detectionId: number) =>
      client.get<DetectionDetailRecord>(`/api/v1/detections/monitoring/${detectionId}/`),
    officer: {
      monitoringSummary: () =>
        client.get<DetectionMonitorSummary>('/api/v1/detections/officer/monitoring/summary/'),
      listMonitoring: (params?: {
        camera_id?: string;
        min_confidence?: string;
        search?: string;
        limit?: number;
      }) => client.get<DetectionMonitorRecord[]>('/api/v1/detections/officer/monitoring/', { params }),
      get: (detectionId: number) =>
        client.get<DetectionDetailRecord>(`/api/v1/detections/officer/monitoring/${detectionId}/`),
      cameras: () => client.get<OfficerLiveDetectionCameraOption[]>('/api/v1/detections/officer/cameras/'),
    },
  };
}
