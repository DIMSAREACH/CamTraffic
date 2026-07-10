import type {
  CreatePoliceStationPayload,
  PoliceStationManagementRecord,
  UpdatePoliceStationPayload,
} from '@camtraffic/types';
import type { ApiClient } from '../client';

export function createPoliceStationsEndpoints(client: ApiClient) {
  return {
    list: (params?: { search?: string; province?: string }) =>
      client.get<PoliceStationManagementRecord[]>('/api/v1/officers/stations/manage/', { params }),
    get: (stationId: number) =>
      client.get<PoliceStationManagementRecord>(`/api/v1/officers/stations/manage/${stationId}/`),
    create: (payload: CreatePoliceStationPayload) =>
      client.post<PoliceStationManagementRecord>('/api/v1/officers/stations/manage/', payload),
    update: (stationId: number, payload: UpdatePoliceStationPayload) =>
      client.patch<PoliceStationManagementRecord>(`/api/v1/officers/stations/manage/${stationId}/`, payload),
    delete: (stationId: number) => client.delete<null>(`/api/v1/officers/stations/manage/${stationId}/`),
  };
}
