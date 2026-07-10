import type {
  CreateOfficerPayload,
  OfficerManagementRecord,
  OfficerProfileRecord,
  PoliceStationOption,
  UpdateOfficerPayload,
  UpdateOfficerProfilePayload,
} from '@camtraffic/types';
import type { ApiClient } from '../client';

export function createOfficersEndpoints(client: ApiClient) {
  return {
    listStations: () => client.get<PoliceStationOption[]>('/api/v1/officers/stations/'),
    list: (params?: { search?: string; station_id?: string }) =>
      client.get<OfficerManagementRecord[]>('/api/v1/officers/management/', { params }),
    get: (officerId: number) =>
      client.get<OfficerManagementRecord>(`/api/v1/officers/management/${officerId}/`),
    create: (payload: CreateOfficerPayload) =>
      client.post<OfficerManagementRecord>('/api/v1/officers/management/', payload),
    update: (officerId: number, payload: UpdateOfficerPayload) =>
      client.patch<OfficerManagementRecord>(`/api/v1/officers/management/${officerId}/`, payload),
    delete: (officerId: number) => client.delete<null>(`/api/v1/officers/management/${officerId}/`),
    profile: {
      me: () => client.get<OfficerProfileRecord>('/api/v1/officers/officer/profile/'),
      updateMe: (payload: UpdateOfficerProfilePayload) =>
        client.patch<OfficerProfileRecord>('/api/v1/officers/officer/profile/', payload),
    },
  };
}
