import type { CreateUserPayload, UpdateUserPayload, UserManagementRecord } from '@camtraffic/types';
import type { ApiClient } from '../client';

export function createUsersEndpoints(client: ApiClient) {
  return {
    list: (params?: { search?: string; role?: string }) =>
      client.get<UserManagementRecord[]>('/api/v1/users/management/', { params }),
    get: (userId: string) =>
      client.get<UserManagementRecord>(`/api/v1/users/management/${userId}/`),
    create: (payload: CreateUserPayload) =>
      client.post<UserManagementRecord>('/api/v1/users/management/', payload),
    update: (userId: string, payload: UpdateUserPayload) =>
      client.patch<UserManagementRecord>(`/api/v1/users/management/${userId}/`, payload),
    delete: (userId: string) => client.delete<null>(`/api/v1/users/management/${userId}/`),
  };
}
