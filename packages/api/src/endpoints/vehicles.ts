import type {
  CreateOfficerVehiclePayload,
  DriverVehicleDetail,
  DriverVehicleRecord,
  OfficerVehicleManagementDetail,
  OfficerVehicleManagementRecord,
  UpdateOfficerVehiclePayload,
} from '@camtraffic/types';
import type { ApiClient } from '../client';

export function createVehiclesEndpoints(client: ApiClient) {
  return {
    officer: {
      list: (params?: { search?: string; is_active?: string; owner_id?: string }) =>
        client.get<OfficerVehicleManagementRecord[]>('/api/v1/vehicles/officer/management/', { params }),
      get: (vehicleId: number) =>
        client.get<OfficerVehicleManagementDetail>(`/api/v1/vehicles/officer/management/${vehicleId}/`),
      create: (payload: CreateOfficerVehiclePayload) =>
        client.post<OfficerVehicleManagementRecord>('/api/v1/vehicles/officer/management/', payload),
      update: (vehicleId: number, payload: UpdateOfficerVehiclePayload) =>
        client.patch<OfficerVehicleManagementRecord>(`/api/v1/vehicles/officer/management/${vehicleId}/`, payload),
      delete: (vehicleId: number) => client.delete<null>(`/api/v1/vehicles/officer/management/${vehicleId}/`),
    },
    driver: {
      list: (params?: { search?: string; is_active?: string }) =>
        client.get<DriverVehicleRecord[]>('/api/v1/vehicles/driver/mine/', { params }),
      get: (vehicleId: number) =>
        client.get<DriverVehicleDetail>(`/api/v1/vehicles/driver/mine/${vehicleId}/`),
    },
  };
}
