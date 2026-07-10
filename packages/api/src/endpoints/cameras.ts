import type {
  CameraHealthCheckAllResult,
  CameraHealthMonitoring,
  CameraHealthRecord,
  CameraLiveDashboard,
  CameraManagementRecord,
  CreateCameraPayload,
  UpdateCameraPayload,
} from '@camtraffic/types';
import type { ApiClient } from '../client';

export function createCamerasEndpoints(client: ApiClient) {
  return {
    list: (params?: { search?: string; station_id?: string; status?: string; is_active?: string }) =>
      client.get<CameraManagementRecord[]>('/api/v1/cameras/management/', { params }),
    get: (cameraId: number) =>
      client.get<CameraManagementRecord>(`/api/v1/cameras/management/${cameraId}/`),
    liveDashboard: (params?: { search?: string; station_id?: string; status?: string }) =>
      client.get<CameraLiveDashboard>('/api/v1/cameras/live-dashboard/', { params }),
    officer: {
      liveDashboard: (params?: { search?: string; status?: string }) =>
        client.get<CameraLiveDashboard>('/api/v1/cameras/officer/live/', { params }),
    },
    healthMonitoring: (params?: {
      search?: string;
      station_id?: string;
      status?: string;
      health_state?: string;
    }) => client.get<CameraHealthMonitoring>('/api/v1/cameras/health/', { params }),
    runHealthCheck: (cameraId: number) =>
      client.post<CameraHealthRecord>(`/api/v1/cameras/health/${cameraId}/check/`),
    runHealthCheckAll: () => client.post<CameraHealthCheckAllResult>('/api/v1/cameras/health/check-all/'),
    create: (payload: CreateCameraPayload) =>
      client.post<CameraManagementRecord>('/api/v1/cameras/management/', payload),
    update: (cameraId: number, payload: UpdateCameraPayload) =>
      client.patch<CameraManagementRecord>(`/api/v1/cameras/management/${cameraId}/`, payload),
    delete: (cameraId: number) => client.delete<null>(`/api/v1/cameras/management/${cameraId}/`),
  };
}
