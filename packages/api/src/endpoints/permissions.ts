import type {
  CreatePermissionPayload,
  PermissionManagementRecord,
  UpdatePermissionPayload,
} from '@camtraffic/types';
import type { ApiClient } from '../client';

export function createPermissionsEndpoints(client: ApiClient) {
  return {
    list: () => client.get<PermissionManagementRecord[]>('/api/v1/rbac/permissions/manage/'),
    create: (payload: CreatePermissionPayload) =>
      client.post<PermissionManagementRecord>('/api/v1/rbac/permissions/manage/', payload),
    update: (permissionId: number, payload: UpdatePermissionPayload) =>
      client.patch<PermissionManagementRecord>(`/api/v1/rbac/permissions/manage/${permissionId}/`, payload),
    delete: (permissionId: number) => client.delete<null>(`/api/v1/rbac/permissions/manage/${permissionId}/`),
  };
}
