import { ApiClient, createApiClient, type ApiClientConfig } from './client';
import { createAiModelsEndpoints } from './endpoints/ai-models';
import { createAppealsEndpoints } from './endpoints/appeals';
import { createAuthEndpoints } from './endpoints/auth';
import { createAuditEndpoints } from './endpoints/audit';
import { createCamerasEndpoints } from './endpoints/cameras';
import { createDetectionsEndpoints } from './endpoints/detections';
import { createDashboardEndpoints } from './endpoints/dashboard';
import { createDriversEndpoints } from './endpoints/drivers';
import { createFinesEndpoints } from './endpoints/fines';
import { createOfficersEndpoints } from './endpoints/officers';
import { createHealthEndpoints } from './endpoints/health';
import { createNotificationsEndpoints } from './endpoints/notifications';
import { createOCREndpoints } from './endpoints/ocr';
import { createPermissionsEndpoints } from './endpoints/permissions';
import { createPoliceStationsEndpoints } from './endpoints/police-stations';
import { createProfileEndpoints } from './endpoints/profile';
import { createReportsEndpoints } from './endpoints/reports';
import { createRolesEndpoints } from './endpoints/roles';
import { createSystemEndpoints } from './endpoints/system';
import { createTrafficSignsEndpoints } from './endpoints/traffic-signs';
import { createUsersEndpoints } from './endpoints/users';
import { createVehiclesEndpoints } from './endpoints/vehicles';
import { createViolationsEndpoints } from './endpoints/violations';

export { ApiClient, ApiError, createApiClient } from './client';
export type { ApiClientConfig, HttpMethod, RequestOptions } from './client';
export { withAuthToken, withUnauthorizedHandler } from './interceptors/auth';
export { getErrorMessage, isApiError } from './interceptors/error';
export { createAiModelsEndpoints } from './endpoints/ai-models';
export { createAppealsEndpoints } from './endpoints/appeals';
export { createAuthEndpoints } from './endpoints/auth';
export { createAuditEndpoints } from './endpoints/audit';
export { createCamerasEndpoints } from './endpoints/cameras';
export { createDetectionsEndpoints } from './endpoints/detections';
export { createDashboardEndpoints } from './endpoints/dashboard';
export { createDriversEndpoints } from './endpoints/drivers';
export { createFinesEndpoints } from './endpoints/fines';
export { createRolesEndpoints } from './endpoints/roles';
export { createSystemEndpoints } from './endpoints/system';
export { createPermissionsEndpoints } from './endpoints/permissions';
export { createOfficersEndpoints } from './endpoints/officers';
export { createPoliceStationsEndpoints } from './endpoints/police-stations';
export { createReportsEndpoints } from './endpoints/reports';
export { createTrafficSignsEndpoints } from './endpoints/traffic-signs';
export { createViolationsEndpoints } from './endpoints/violations';
export { createUsersEndpoints } from './endpoints/users';
export { createVehiclesEndpoints } from './endpoints/vehicles';
export type {
  LoginPayload,
  LogoutPayload,
  AuthTokens,
  LoginData,
  LoginResponse,
  AuthLoginResponse,
  AuthMeResponse,
  AuthRefreshResponse,
} from './endpoints/auth';
export type { LoginHistoryQuery, AuditLogQuery } from './endpoints/audit';
export type {
  DashboardActivities,
  DashboardAiSummary,
  AnalyticsDashboard,
  DashboardCameraStatus,
  DashboardCharts,
  DashboardNotificationCenter,
  DashboardStats,
  OfficerDashboardActivities,
  OfficerDashboardCameraStatus,
  OfficerDashboardCharts,
  OfficerDashboardNotificationCenter,
  OfficerDashboardStats,
} from '@camtraffic/types';
export type {
  OfficerViolationDecision,
  OfficerViolationDecisionPayload,
  OfficerViolationDecisionResult,
  OfficerViolationReviewDetail,
  OfficerViolationReviewRecord,
  ViolationReviewStatus,
} from '@camtraffic/types';
export type { OfficerEvidenceDetail, OfficerEvidenceRecord, OfficerEvidenceStatus } from '@camtraffic/types';
export type {
  CreateOfficerDriverPayload,
  OfficerDriverManagementDetail,
  OfficerDriverManagementRecord,
  OfficerDriverVehicleSummary,
  UpdateOfficerDriverPayload,
} from '@camtraffic/types';
export type {
  CreateOfficerVehiclePayload,
  OfficerVehicleManagementDetail,
  OfficerVehicleManagementRecord,
  OfficerVehicleStationViolationSummary,
  UpdateOfficerVehiclePayload,
} from '@camtraffic/types';
export type {
  OfficerNotificationReadAllResult,
  OfficerNotificationRecord,
  OfficerNotificationSummary,
} from '@camtraffic/types';
export { createHealthEndpoints } from './endpoints/health';
export { createNotificationsEndpoints } from './endpoints/notifications';
export { createOCREndpoints } from './endpoints/ocr';
export { createProfileEndpoints } from './endpoints/profile';
export type { AuditLogRecord, AuditLogSummary, LoginHistoryRecord, UpdateProfilePayload, UserProfile } from '@camtraffic/types';
export type { CreateUserPayload, UpdateUserPayload, UserManagementRecord } from '@camtraffic/types';
export type { CreateRolePayload, RoleManagementRecord, UpdateRolePayload } from '@camtraffic/types';
export type {
  CreatePermissionPayload,
  PermissionManagementRecord,
  UpdatePermissionPayload,
} from '@camtraffic/types';
export type {
  CreateOfficerPayload,
  OfficerManagementRecord,
  OfficerProfileRecord,
  PoliceStationOption,
  UpdateOfficerPayload,
  UpdateOfficerProfilePayload,
} from '@camtraffic/types';
export type {
  CreatePoliceStationPayload,
  PoliceStationManagementRecord,
  UpdatePoliceStationPayload,
} from '@camtraffic/types';
export type {
  AIModelManagementRecord,
  AIModelType,
  CreateAIModelPayload,
  UpdateAIModelPayload,
} from '@camtraffic/types';
export type {
  AIModelVersionRecord,
  AIModelVersionStatus,
  CreateAIModelVersionPayload,
  UpdateAIModelVersionPayload,
} from '@camtraffic/types';
export type {
  AITrainingHistoryRecord,
  AITrainingStatus,
  CreateAITrainingHistoryPayload,
  UpdateAITrainingHistoryPayload,
} from '@camtraffic/types';
export type { DetectionMonitorRecord, DetectionMonitorSummary, OfficerLiveDetectionCameraOption } from '@camtraffic/types';
export type {
  CameraManagementRecord,
  CreateCameraPayload,
  UpdateCameraPayload,
} from '@camtraffic/types';
export type { CameraLiveDashboard, CameraLiveFeedItem } from '@camtraffic/types';
export type {
  CameraHealthCheckAllResult,
  CameraHealthMonitoring,
  CameraHealthRecord,
  CameraHealthState,
} from '@camtraffic/types';
export type {
  CreateSignCategoryPayload,
  SignCategoryManagementRecord,
  UpdateSignCategoryPayload,
} from '@camtraffic/types';
export type {
  CreateTrafficSignPayload,
  SignCategoryOption,
  TrafficSignManagementRecord,
  UpdateTrafficSignPayload,
} from '@camtraffic/types';
export type {
  CreateReportExportPayload,
  ReportCatalogItem,
  ReportExportRecord,
  ReportExportStatus,
  ReportFormat,
  ReportTypeCode,
  CreateNotificationTemplatePayload,
  NotificationChannel,
  NotificationTemplateRecord,
  UpdateNotificationTemplatePayload,
  CreateSystemSettingPayload,
  SystemSettingRecord,
  SystemSettingValueType,
  UpdateSystemSettingPayload,
  BackupRecord,
  BackupRestoreResult,
  CreateBackupPayload,
} from '@camtraffic/types';

export interface CamTrafficApi {
  client: ApiClient;
  auth: ReturnType<typeof createAuthEndpoints>;
  aiModels: ReturnType<typeof createAiModelsEndpoints>;
  appeals: ReturnType<typeof createAppealsEndpoints>;
  audit: ReturnType<typeof createAuditEndpoints>;
  cameras: ReturnType<typeof createCamerasEndpoints>;
  dashboard: ReturnType<typeof createDashboardEndpoints>;
  detections: ReturnType<typeof createDetectionsEndpoints>;
  drivers: ReturnType<typeof createDriversEndpoints>;
  fines: ReturnType<typeof createFinesEndpoints>;
  health: ReturnType<typeof createHealthEndpoints>;
  notifications: ReturnType<typeof createNotificationsEndpoints>;
  ocr: ReturnType<typeof createOCREndpoints>;
  officers: ReturnType<typeof createOfficersEndpoints>;
  permissions: ReturnType<typeof createPermissionsEndpoints>;
  policeStations: ReturnType<typeof createPoliceStationsEndpoints>;
  profile: ReturnType<typeof createProfileEndpoints>;
  reports: ReturnType<typeof createReportsEndpoints>;
  roles: ReturnType<typeof createRolesEndpoints>;
  system: ReturnType<typeof createSystemEndpoints>;
  trafficSigns: ReturnType<typeof createTrafficSignsEndpoints>;
  users: ReturnType<typeof createUsersEndpoints>;
  vehicles: ReturnType<typeof createVehiclesEndpoints>;
  violations: ReturnType<typeof createViolationsEndpoints>;
}

export function createCamTrafficApi(config: ApiClientConfig): CamTrafficApi {
  const client = createApiClient(config);

  return {
    client,
    auth: createAuthEndpoints(client),
    aiModels: createAiModelsEndpoints(client),
    appeals: createAppealsEndpoints(client),
    audit: createAuditEndpoints(client),
    cameras: createCamerasEndpoints(client),
    dashboard: createDashboardEndpoints(client),
    detections: createDetectionsEndpoints(client),
    drivers: createDriversEndpoints(client),
    fines: createFinesEndpoints(client),
    health: createHealthEndpoints(client),
    notifications: createNotificationsEndpoints(client),
    ocr: createOCREndpoints(client),
    officers: createOfficersEndpoints(client),
    permissions: createPermissionsEndpoints(client),
    policeStations: createPoliceStationsEndpoints(client),
    profile: createProfileEndpoints(client),
    reports: createReportsEndpoints(client),
    roles: createRolesEndpoints(client),
    system: createSystemEndpoints(client),
    trafficSigns: createTrafficSignsEndpoints(client),
    users: createUsersEndpoints(client),
    vehicles: createVehiclesEndpoints(client),
    violations: createViolationsEndpoints(client),
  };
}
