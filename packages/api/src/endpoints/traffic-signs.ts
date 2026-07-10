import type {
  CreateSignCategoryPayload,
  CreateTrafficSignPayload,
  SignCategoryManagementRecord,
  SignCategoryOption,
  TrafficSignManagementRecord,
  UpdateSignCategoryPayload,
  UpdateTrafficSignPayload,
} from '@camtraffic/types';
import type { ApiClient } from '../client';

export function createTrafficSignsEndpoints(client: ApiClient) {
  return {
    listCategories: () => client.get<SignCategoryOption[]>('/api/v1/traffic-signs/categories/'),
    listCategoryRecords: (params?: { search?: string; is_active?: string }) =>
      client.get<SignCategoryManagementRecord[]>('/api/v1/traffic-signs/categories/manage/', { params }),
    getCategory: (categoryId: number) =>
      client.get<SignCategoryManagementRecord>(`/api/v1/traffic-signs/categories/manage/${categoryId}/`),
    createCategory: (payload: CreateSignCategoryPayload) =>
      client.post<SignCategoryManagementRecord>('/api/v1/traffic-signs/categories/manage/', payload),
    updateCategory: (categoryId: number, payload: UpdateSignCategoryPayload) =>
      client.patch<SignCategoryManagementRecord>(`/api/v1/traffic-signs/categories/manage/${categoryId}/`, payload),
    deleteCategory: (categoryId: number) =>
      client.delete<null>(`/api/v1/traffic-signs/categories/manage/${categoryId}/`),
    list: (params?: { search?: string; category_id?: string; is_active?: string }) =>
      client.get<TrafficSignManagementRecord[]>('/api/v1/traffic-signs/management/', { params }),
    get: (signId: number) =>
      client.get<TrafficSignManagementRecord>(`/api/v1/traffic-signs/management/${signId}/`),
    create: (payload: CreateTrafficSignPayload) =>
      client.post<TrafficSignManagementRecord>('/api/v1/traffic-signs/management/', payload),
    update: (signId: number, payload: UpdateTrafficSignPayload) =>
      client.patch<TrafficSignManagementRecord>(`/api/v1/traffic-signs/management/${signId}/`, payload),
    delete: (signId: number) => client.delete<null>(`/api/v1/traffic-signs/management/${signId}/`),
  };
}
