import type {
  CreateOfficerDriverPayload,
  DriverProfileRecord,
  DriverSettingsRecord,
  OfficerDriverManagementDetail,
  OfficerDriverManagementRecord,
  UpdateDriverProfilePayload,
  UpdateDriverSettingsPayload,
  UpdateOfficerDriverPayload,
} from '@camtraffic/types';
import type { ApiClient } from '../client';

export function createDriversEndpoints(client: ApiClient) {
  return {
    officer: {
      list: (params?: { search?: string; is_active?: string }) =>
        client.get<OfficerDriverManagementRecord[]>('/api/v1/drivers/officer/management/', { params }),
      get: (driverId: number) =>
        client.get<OfficerDriverManagementDetail>(`/api/v1/drivers/officer/management/${driverId}/`),
      create: (payload: CreateOfficerDriverPayload) =>
        client.post<OfficerDriverManagementRecord>('/api/v1/drivers/officer/management/', payload),
      update: (driverId: number, payload: UpdateOfficerDriverPayload) =>
        client.patch<OfficerDriverManagementRecord>(`/api/v1/drivers/officer/management/${driverId}/`, payload),
      delete: (driverId: number) => client.delete<null>(`/api/v1/drivers/officer/management/${driverId}/`),
    },
    profile: {
      me: () => client.get<DriverProfileRecord>('/api/v1/drivers/driver/profile/'),
      updateMe: (payload: UpdateDriverProfilePayload) =>
        client.patch<DriverProfileRecord>('/api/v1/drivers/driver/profile/', payload),
    },
    settings: {
      me: () => client.get<DriverSettingsRecord>('/api/v1/drivers/driver/settings/'),
      updateMe: (payload: UpdateDriverSettingsPayload) =>
        client.patch<DriverSettingsRecord>('/api/v1/drivers/driver/settings/', payload),
    },
  };
}
