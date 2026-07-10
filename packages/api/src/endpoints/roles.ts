import type { CreateRolePayload, RoleManagementRecord, UpdateRolePayload } from '@camtraffic/types';
import type { ApiClient } from '../client';

export function createRolesEndpoints(client: ApiClient) {
  return {
    list: () => client.get<RoleManagementRecord[]>('/api/v1/rbac/roles/manage/'),
    create: (payload: CreateRolePayload) =>
      client.post<RoleManagementRecord>('/api/v1/rbac/roles/manage/', payload),
    update: (roleId: number, payload: UpdateRolePayload) =>
      client.patch<RoleManagementRecord>(`/api/v1/rbac/roles/manage/${roleId}/`, payload),
    delete: (roleId: number) => client.delete<null>(`/api/v1/rbac/roles/manage/${roleId}/`),
  };
}
