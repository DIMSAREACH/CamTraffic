import { createCamTrafficApi, type LoginData } from '@camtraffic/api';
import type {
  AIModelManagementRecord,
  AIModelVersionRecord,
  AITrainingHistoryRecord,
  CreateAIModelPayload,
  CreateAIModelVersionPayload,
  CreateAITrainingHistoryPayload,
  CreateOfficerPayload,
  CreatePermissionPayload,
  CreatePoliceStationPayload,
  CreateReportExportPayload,
  CreateNotificationTemplatePayload,
  CreateSystemSettingPayload,
  BackupRecord,
  BackupRestoreResult,
  AnalyticsDashboard,
  AuditLogRecord,
  AuditLogSummary,
  CreateRolePayload,
  CreateSignCategoryPayload,
  CreateTrafficSignPayload,
  DashboardActivities,
  DashboardAiSummary,
  DashboardCameraStatus,
  DashboardCharts,
  DashboardNotificationCenter,
  DashboardStats,
  CreateUserPayload,
  CameraManagementRecord,
  CameraLiveDashboard,
  CameraHealthMonitoring,
  CreateCameraPayload,
  DetectionMonitorRecord,
  DetectionMonitorSummary,
  LoginHistoryRecord,
  OfficerManagementRecord,
  PermissionManagementRecord,
  PoliceStationManagementRecord,
  PoliceStationOption,
  ReportCatalogItem,
  ReportExportRecord,
  NotificationTemplateRecord,
  SystemSettingRecord,
  RoleManagementRecord,
  SignCategoryOption,
  SignCategoryManagementRecord,
  TrafficSignManagementRecord,
  UpdateProfilePayload,
  UpdateAIModelPayload,
  UpdateAIModelVersionPayload,
  UpdateAITrainingHistoryPayload,
  UpdateCameraPayload,
  UpdateOfficerPayload,
  UpdatePermissionPayload,
  UpdatePoliceStationPayload,
  UpdateRolePayload,
  UpdateSignCategoryPayload,
  UpdateTrafficSignPayload,
  UpdateNotificationTemplatePayload,
  UpdateSystemSettingPayload,
  UpdateUserPayload,
  User,
  UserManagementRecord,
} from '@camtraffic/types';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './authStorage';

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const api = createCamTrafficApi({
  baseUrl,
  getAccessToken,
  onUnauthorized: () => {
    clearTokens();
  },
});

export async function loginAdmin(email: string, password: string): Promise<LoginData> {
  const response = await api.auth.login({ email, password });
  setTokens(response.data.tokens);
  return response.data;
}

export async function loadCurrentUser(): Promise<User> {
  const response = await api.auth.me();
  return response.data;
}

export async function logoutAdmin(): Promise<void> {
  const refresh = getRefreshToken();
  if (!refresh) {
    clearTokens();
    return;
  }

  try {
    await api.auth.logout({ refresh });
  } finally {
    clearTokens();
  }
}

export async function requestPasswordReset(email: string): Promise<string> {
  const response = await api.auth.forgotPassword({ email, portal: 'admin' });
  return response.message ?? 'Password reset instructions have been sent.';
}

export async function resetPassword(uid: string, token: string, newPassword: string): Promise<string> {
  const response = await api.auth.resetPassword({ uid, token, new_password: newPassword });
  return response.message ?? 'Password has been reset successfully.';
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<string> {
  const response = await api.auth.changePassword({
    current_password: currentPassword,
    new_password: newPassword,
  });
  return response.message ?? 'Password changed successfully.';
}

export async function sendVerificationEmail(): Promise<string> {
  const response = await api.auth.sendVerificationEmail({ portal: 'admin' });
  return response.message ?? 'Verification email sent.';
}

export async function verifyEmail(uid: string, token: string) {
  const response = await api.auth.verifyEmail({ uid, token });
  return {
    user: response.data,
    message: response.message ?? 'Email verified successfully.',
  };
}

export async function loadProfile() {
  const response = await api.profile.me();
  return response.data;
}

export async function updateProfile(payload: UpdateProfilePayload) {
  const response = await api.profile.updateMe(payload);
  return {
    profile: response.data,
    message: response.message ?? 'Profile updated successfully.',
  };
}

export async function uploadAvatar(file: File) {
  const response = await api.profile.uploadAvatar(file);
  return {
    avatar_url: response.data.avatar_url ?? null,
    message: response.message ?? 'Profile photo updated successfully.',
  };
}

export async function deleteAvatar() {
  const response = await api.profile.deleteAvatar();
  return {
    avatar_url: response.data.avatar_url ?? null,
    message: response.message ?? 'Profile photo removed successfully.',
  };
}

export async function loadLoginHistory(limit = 20): Promise<LoginHistoryRecord[]> {
  const response = await api.audit.listLoginHistory({ limit });
  return response.data;
}

export async function loadAuditLogSummary(): Promise<AuditLogSummary> {
  const response = await api.audit.auditLogSummary();
  return response.data;
}

export async function loadAuditLogs(params?: {
  action?: string;
  module?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}): Promise<AuditLogRecord[]> {
  const response = await api.audit.listAuditLogs(params);
  return response.data;
}

export async function loadDashboardStats(): Promise<DashboardStats> {
  const response = await api.dashboard.stats();
  return response.data;
}

export async function loadDashboardCharts(): Promise<DashboardCharts> {
  const response = await api.dashboard.charts();
  return response.data;
}

export async function loadDashboardActivities(): Promise<DashboardActivities> {
  const response = await api.dashboard.activities();
  return response.data;
}

export async function loadDashboardAiSummary(): Promise<DashboardAiSummary> {
  const response = await api.dashboard.aiSummary();
  return response.data;
}

export async function loadDashboardCameraStatus(): Promise<DashboardCameraStatus> {
  const response = await api.dashboard.cameraStatus();
  return response.data;
}

export async function loadDashboardNotifications(): Promise<DashboardNotificationCenter> {
  const response = await api.dashboard.notifications();
  return response.data;
}

export async function loadUsers(params?: { search?: string; role?: string }): Promise<UserManagementRecord[]> {
  const response = await api.users.list(params);
  return response.data;
}

export async function createUser(payload: CreateUserPayload) {
  const response = await api.users.create(payload);
  return {
    user: response.data,
    message: response.message ?? 'User created successfully.',
  };
}

export async function updateUser(userId: string, payload: UpdateUserPayload) {
  const response = await api.users.update(userId, payload);
  return {
    user: response.data,
    message: response.message ?? 'User updated successfully.',
  };
}

export async function deleteUser(userId: string) {
  const response = await api.users.delete(userId);
  return response.message ?? 'User deleted successfully.';
}

export async function loadRoles(): Promise<RoleManagementRecord[]> {
  const response = await api.roles.list();
  return response.data;
}

export async function createRole(payload: CreateRolePayload) {
  const response = await api.roles.create(payload);
  return {
    role: response.data,
    message: response.message ?? 'Role created successfully.',
  };
}

export async function updateRole(roleId: number, payload: UpdateRolePayload) {
  const response = await api.roles.update(roleId, payload);
  return {
    role: response.data,
    message: response.message ?? 'Role updated successfully.',
  };
}

export async function deleteRole(roleId: number) {
  const response = await api.roles.delete(roleId);
  return response.message ?? 'Role deleted successfully.';
}

export async function loadPermissions(): Promise<PermissionManagementRecord[]> {
  const response = await api.permissions.list();
  return response.data;
}

export async function createPermission(payload: CreatePermissionPayload) {
  const response = await api.permissions.create(payload);
  return {
    permission: response.data,
    message: response.message ?? 'Permission created successfully.',
  };
}

export async function updatePermission(permissionId: number, payload: UpdatePermissionPayload) {
  const response = await api.permissions.update(permissionId, payload);
  return {
    permission: response.data,
    message: response.message ?? 'Permission updated successfully.',
  };
}

export async function deletePermission(permissionId: number) {
  const response = await api.permissions.delete(permissionId);
  return response.message ?? 'Permission deleted successfully.';
}

export async function loadPoliceStations(): Promise<PoliceStationOption[]> {
  const response = await api.officers.listStations();
  return response.data;
}

export async function loadOfficers(params?: {
  search?: string;
  station_id?: string;
}): Promise<OfficerManagementRecord[]> {
  const response = await api.officers.list(params);
  return response.data;
}

export async function createOfficer(payload: CreateOfficerPayload) {
  const response = await api.officers.create(payload);
  return {
    officer: response.data,
    message: response.message ?? 'Officer created successfully.',
  };
}

export async function updateOfficer(officerId: number, payload: UpdateOfficerPayload) {
  const response = await api.officers.update(officerId, payload);
  return {
    officer: response.data,
    message: response.message ?? 'Officer updated successfully.',
  };
}

export async function deleteOfficer(officerId: number) {
  const response = await api.officers.delete(officerId);
  return response.message ?? 'Officer deleted successfully.';
}

export async function loadPoliceStationRecords(params?: {
  search?: string;
  province?: string;
}): Promise<PoliceStationManagementRecord[]> {
  const response = await api.policeStations.list(params);
  return response.data;
}

export async function createPoliceStation(payload: CreatePoliceStationPayload) {
  const response = await api.policeStations.create(payload);
  return {
    station: response.data,
    message: response.message ?? 'Police station created successfully.',
  };
}

export async function updatePoliceStation(stationId: number, payload: UpdatePoliceStationPayload) {
  const response = await api.policeStations.update(stationId, payload);
  return {
    station: response.data,
    message: response.message ?? 'Police station updated successfully.',
  };
}

export async function deletePoliceStation(stationId: number) {
  const response = await api.policeStations.delete(stationId);
  return response.message ?? 'Police station deleted successfully.';
}

export async function loadAiModels(params?: {
  search?: string;
  model_type?: string;
}): Promise<AIModelManagementRecord[]> {
  const response = await api.aiModels.list(params);
  return response.data;
}

export async function createAiModel(payload: CreateAIModelPayload) {
  const response = await api.aiModels.create(payload);
  return {
    model: response.data,
    message: response.message ?? 'AI model created successfully.',
  };
}

export async function updateAiModel(modelId: number, payload: UpdateAIModelPayload) {
  const response = await api.aiModels.update(modelId, payload);
  return {
    model: response.data,
    message: response.message ?? 'AI model updated successfully.',
  };
}

export async function deleteAiModel(modelId: number) {
  const response = await api.aiModels.delete(modelId);
  return response.message ?? 'AI model deleted successfully.';
}

export async function loadAiModelVersions(params?: {
  model_id?: string;
  status?: string;
}): Promise<AIModelVersionRecord[]> {
  const response = await api.aiModels.listVersions(params);
  return response.data;
}

export async function createAiModelVersion(payload: CreateAIModelVersionPayload) {
  const response = await api.aiModels.createVersion(payload);
  return {
    version: response.data,
    message: response.message ?? 'AI model version created successfully.',
  };
}

export async function updateAiModelVersion(versionId: number, payload: UpdateAIModelVersionPayload) {
  const response = await api.aiModels.updateVersion(versionId, payload);
  return {
    version: response.data,
    message: response.message ?? 'AI model version updated successfully.',
  };
}

export async function activateAiModelVersion(versionId: number) {
  const response = await api.aiModels.activateVersion(versionId);
  return {
    version: response.data,
    message: response.message ?? 'AI model version activated successfully.',
  };
}

export async function deleteAiModelVersion(versionId: number) {
  const response = await api.aiModels.deleteVersion(versionId);
  return response.message ?? 'AI model version deleted successfully.';
}

export async function loadAiTrainingHistory(params?: {
  model_id?: string;
  version_id?: string;
  status?: string;
}): Promise<AITrainingHistoryRecord[]> {
  const response = await api.aiModels.listTrainingHistory(params);
  return response.data;
}

export async function createAiTrainingHistory(payload: CreateAITrainingHistoryPayload) {
  const response = await api.aiModels.createTrainingHistory(payload);
  return {
    record: response.data,
    message: response.message ?? 'Training history record created successfully.',
  };
}

export async function updateAiTrainingHistory(recordId: number, payload: UpdateAITrainingHistoryPayload) {
  const response = await api.aiModels.updateTrainingHistory(recordId, payload);
  return {
    record: response.data,
    message: response.message ?? 'Training history record updated successfully.',
  };
}

export async function deleteAiTrainingHistory(recordId: number) {
  const response = await api.aiModels.deleteTrainingHistory(recordId);
  return response.message ?? 'Training history record deleted successfully.';
}

export async function loadDetectionSummary(): Promise<DetectionMonitorSummary> {
  const response = await api.detections.monitoringSummary();
  return response.data;
}

export async function loadDetectionMonitoring(params?: {
  camera_id?: string;
  model_version_id?: string;
  min_confidence?: string;
  search?: string;
  limit?: number;
}): Promise<DetectionMonitorRecord[]> {
  const response = await api.detections.listMonitoring(params);
  return response.data;
}

export async function loadCameras(params?: {
  search?: string;
  station_id?: string;
  status?: string;
  is_active?: string;
}): Promise<CameraManagementRecord[]> {
  const response = await api.cameras.list(params);
  return response.data;
}

export async function createCamera(payload: CreateCameraPayload) {
  const response = await api.cameras.create(payload);
  return {
    camera: response.data,
    message: response.message ?? 'Camera created successfully.',
  };
}

export async function updateCamera(cameraId: number, payload: UpdateCameraPayload) {
  const response = await api.cameras.update(cameraId, payload);
  return {
    camera: response.data,
    message: response.message ?? 'Camera updated successfully.',
  };
}

export async function deleteCamera(cameraId: number) {
  const response = await api.cameras.delete(cameraId);
  return response.message ?? 'Camera deleted successfully.';
}

export async function loadCameraLiveDashboard(params?: {
  search?: string;
  station_id?: string;
  status?: string;
}): Promise<CameraLiveDashboard> {
  const response = await api.cameras.liveDashboard(params);
  return response.data;
}

export async function loadCameraHealthMonitoring(params?: {
  search?: string;
  station_id?: string;
  status?: string;
  health_state?: string;
}): Promise<CameraHealthMonitoring> {
  const response = await api.cameras.healthMonitoring(params);
  return response.data;
}

export async function runCameraHealthCheck(cameraId: number) {
  const response = await api.cameras.runHealthCheck(cameraId);
  return {
    record: response.data,
    message: response.message ?? 'Camera health check completed successfully.',
  };
}

export async function runCameraHealthCheckAll() {
  const response = await api.cameras.runHealthCheckAll();
  return {
    checkedCount: response.data.checked_count,
    message: response.message ?? 'Health checks completed successfully.',
  };
}

export async function loadSignCategories(): Promise<SignCategoryOption[]> {
  const response = await api.trafficSigns.listCategories();
  return response.data;
}

export async function loadSignCategoryRecords(params?: {
  search?: string;
  is_active?: string;
}): Promise<SignCategoryManagementRecord[]> {
  const response = await api.trafficSigns.listCategoryRecords(params);
  return response.data;
}

export async function createSignCategory(payload: CreateSignCategoryPayload) {
  const response = await api.trafficSigns.createCategory(payload);
  return {
    category: response.data,
    message: response.message ?? 'Sign category created successfully.',
  };
}

export async function updateSignCategory(categoryId: number, payload: UpdateSignCategoryPayload) {
  const response = await api.trafficSigns.updateCategory(categoryId, payload);
  return {
    category: response.data,
    message: response.message ?? 'Sign category updated successfully.',
  };
}

export async function deleteSignCategory(categoryId: number) {
  const response = await api.trafficSigns.deleteCategory(categoryId);
  return response.message ?? 'Sign category deleted successfully.';
}

export async function loadTrafficSigns(params?: {
  search?: string;
  category_id?: string;
  is_active?: string;
}): Promise<TrafficSignManagementRecord[]> {
  const response = await api.trafficSigns.list(params);
  return response.data;
}

export async function createTrafficSign(payload: CreateTrafficSignPayload) {
  const response = await api.trafficSigns.create(payload);
  return {
    sign: response.data,
    message: response.message ?? 'Traffic sign created successfully.',
  };
}

export async function updateTrafficSign(signId: number, payload: UpdateTrafficSignPayload) {
  const response = await api.trafficSigns.update(signId, payload);
  return {
    sign: response.data,
    message: response.message ?? 'Traffic sign updated successfully.',
  };
}

export async function deleteTrafficSign(signId: number) {
  const response = await api.trafficSigns.delete(signId);
  return response.message ?? 'Traffic sign deleted successfully.';
}

export async function loadReportCatalog(): Promise<ReportCatalogItem[]> {
  const response = await api.reports.catalog();
  return response.data;
}

export async function loadReportExports(params?: {
  report_type?: string;
  status?: string;
  limit?: number;
}): Promise<ReportExportRecord[]> {
  const response = await api.reports.listExports(params);
  return response.data;
}

export async function createReportExport(payload: CreateReportExportPayload) {
  const response = await api.reports.createExport(payload);
  return {
    exportRecord: response.data,
    message: response.message ?? 'Report export generated successfully.',
  };
}

export async function loadAnalyticsDashboard(params?: { days?: number }): Promise<AnalyticsDashboard> {
  const response = await api.dashboard.analytics(params);
  return response.data;
}

export async function loadNotificationTemplates(params?: {
  search?: string;
  channel?: string;
}): Promise<NotificationTemplateRecord[]> {
  const response = await api.notifications.listTemplates(params);
  return response.data;
}

export async function createNotificationTemplate(payload: CreateNotificationTemplatePayload) {
  const response = await api.notifications.createTemplate(payload);
  return {
    template: response.data,
    message: response.message ?? 'Notification template created successfully.',
  };
}

export async function updateNotificationTemplate(templateId: number, payload: UpdateNotificationTemplatePayload) {
  const response = await api.notifications.updateTemplate(templateId, payload);
  return {
    template: response.data,
    message: response.message ?? 'Notification template updated successfully.',
  };
}

export async function deleteNotificationTemplate(templateId: number) {
  const response = await api.notifications.deleteTemplate(templateId);
  return response.message ?? 'Notification template deleted successfully.';
}

export async function loadSystemSettings(params?: {
  search?: string;
  value_type?: string;
  is_public?: boolean;
}): Promise<SystemSettingRecord[]> {
  const response = await api.system.listSettings(params);
  return response.data;
}

export async function createSystemSetting(payload: CreateSystemSettingPayload) {
  const response = await api.system.createSetting(payload);
  return {
    setting: response.data,
    message: response.message ?? 'System setting created successfully.',
  };
}

export async function updateSystemSetting(settingId: number, payload: UpdateSystemSettingPayload) {
  const response = await api.system.updateSetting(settingId, payload);
  return {
    setting: response.data,
    message: response.message ?? 'System setting updated successfully.',
  };
}

export async function deleteSystemSetting(settingId: number) {
  const response = await api.system.deleteSetting(settingId);
  return response.message ?? 'System setting deleted successfully.';
}

export async function loadBackups(params?: { status?: string; limit?: number }): Promise<BackupRecord[]> {
  const response = await api.system.listBackups(params);
  return response.data;
}

export async function createBackup(notes?: string) {
  const response = await api.system.createBackup(notes ? { notes } : {});
  return {
    backup: response.data,
    message: response.message ?? 'Backup created successfully.',
  };
}

export async function restoreBackup(backupId: number): Promise<{ result: BackupRestoreResult; message: string }> {
  const response = await api.system.restoreBackup(backupId);
  return {
    result: response.data,
    message: response.message ?? 'Backup restored successfully.',
  };
}

export async function deleteBackup(backupId: number) {
  const response = await api.system.deleteBackup(backupId);
  return response.message ?? 'Backup deleted successfully.';
}
