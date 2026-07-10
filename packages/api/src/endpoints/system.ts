import type {
  BackupRecord,
  BackupRestoreResult,
  CreateBackupPayload,
  CreateSystemSettingPayload,
  SystemSettingRecord,
  UpdateSystemSettingPayload,
} from '@camtraffic/types';
import type { ApiClient } from '../client';

export function createSystemEndpoints(client: ApiClient) {
  return {
    listSettings: (params?: { search?: string; value_type?: string; is_public?: boolean }) =>
      client.get<SystemSettingRecord[]>('/api/v1/system/settings/manage/', {
        params: {
          search: params?.search,
          value_type: params?.value_type,
          is_public: params?.is_public,
        },
      }),
    createSetting: (payload: CreateSystemSettingPayload) =>
      client.post<SystemSettingRecord>('/api/v1/system/settings/manage/', payload),
    updateSetting: (settingId: number, payload: UpdateSystemSettingPayload) =>
      client.patch<SystemSettingRecord>(`/api/v1/system/settings/manage/${settingId}/`, payload),
    deleteSetting: (settingId: number) =>
      client.delete<null>(`/api/v1/system/settings/manage/${settingId}/`),
    listBackups: (params?: { status?: string; limit?: number }) =>
      client.get<BackupRecord[]>('/api/v1/system/backups/', { params }),
    createBackup: (payload?: CreateBackupPayload) =>
      client.post<BackupRecord>('/api/v1/system/backups/', payload ?? {}),
    getBackup: (backupId: number) => client.get<BackupRecord>(`/api/v1/system/backups/${backupId}/`),
    restoreBackup: (backupId: number) =>
      client.post<BackupRestoreResult>(`/api/v1/system/backups/${backupId}/restore/`, {}),
    deleteBackup: (backupId: number) => client.delete<null>(`/api/v1/system/backups/${backupId}/`),
  };
}
