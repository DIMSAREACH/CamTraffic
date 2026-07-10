import type {
  CreateNotificationTemplatePayload,
  DriverNotificationReadAllResult,
  DriverNotificationRecord,
  DriverNotificationSummary,
  NotificationTemplateRecord,
  OfficerNotificationReadAllResult,
  OfficerNotificationRecord,
  OfficerNotificationSummary,
  UpdateNotificationTemplatePayload,
} from '@camtraffic/types';
import type { ApiClient } from '../client';

export function createNotificationsEndpoints(client: ApiClient) {
  return {
    listTemplates: (params?: { search?: string; channel?: string; is_active?: boolean }) =>
      client.get<NotificationTemplateRecord[]>('/api/v1/notifications/templates/manage/', {
        params: {
          search: params?.search,
          channel: params?.channel,
          is_active: params?.is_active,
        },
      }),
    createTemplate: (payload: CreateNotificationTemplatePayload) =>
      client.post<NotificationTemplateRecord>('/api/v1/notifications/templates/manage/', payload),
    getTemplate: (templateId: number) =>
      client.get<NotificationTemplateRecord>(`/api/v1/notifications/templates/manage/${templateId}/`),
    updateTemplate: (templateId: number, payload: UpdateNotificationTemplatePayload) =>
      client.patch<NotificationTemplateRecord>(
        `/api/v1/notifications/templates/manage/${templateId}/`,
        payload,
      ),
    deleteTemplate: (templateId: number) =>
      client.delete<null>(`/api/v1/notifications/templates/manage/${templateId}/`),
    officer: {
      summary: () => client.get<OfficerNotificationSummary>('/api/v1/notifications/officer/summary/'),
      list: (params?: { search?: string; is_read?: string; limit?: number }) =>
        client.get<OfficerNotificationRecord[]>('/api/v1/notifications/officer/', { params }),
      get: (notificationId: number) =>
        client.get<OfficerNotificationRecord>(`/api/v1/notifications/officer/${notificationId}/`),
      update: (notificationId: number, payload: { is_read: boolean }) =>
        client.patch<OfficerNotificationRecord>(`/api/v1/notifications/officer/${notificationId}/`, payload),
      markAllRead: () =>
        client.post<OfficerNotificationReadAllResult>('/api/v1/notifications/officer/read-all/'),
    },
    driver: {
      summary: () => client.get<DriverNotificationSummary>('/api/v1/notifications/driver/summary/'),
      list: (params?: { search?: string; is_read?: string; limit?: number }) =>
        client.get<DriverNotificationRecord[]>('/api/v1/notifications/driver/', { params }),
      get: (notificationId: number) =>
        client.get<DriverNotificationRecord>(`/api/v1/notifications/driver/${notificationId}/`),
      update: (notificationId: number, payload: { is_read: boolean }) =>
        client.patch<DriverNotificationRecord>(`/api/v1/notifications/driver/${notificationId}/`, payload),
      markAllRead: () =>
        client.post<DriverNotificationReadAllResult>('/api/v1/notifications/driver/read-all/'),
    },
  };
}
