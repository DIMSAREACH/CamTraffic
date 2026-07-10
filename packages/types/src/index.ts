export type { ApiResponse, ApiErrorResponse, PaginatedResponse, PaginationParams } from './api/common';
export type {
  DependencyCheck,
  HealthCheckStatus,
  HealthStatus,
} from './api/monitoring';

export type { User, UserRole } from './entities/user';
export type {
  CreateUserPayload,
  UpdateUserPayload,
  UserManagementRecord,
} from './entities/user-management';
export type {
  CreateRolePayload,
  RoleManagementRecord,
  UpdateRolePayload,
} from './entities/role-management';
export type {
  CreatePermissionPayload,
  PermissionManagementRecord,
  UpdatePermissionPayload,
} from './entities/permission-management';
export type { UserProfile, UpdateProfilePayload } from './entities/profile';
export type { LoginHistoryRecord } from './entities/audit';
export type { AuditLogAction, AuditLogRecord, AuditLogSummary } from './entities/audit-log-management';
export type {
  CreateNotificationTemplatePayload,
  NotificationChannel,
  NotificationTemplateRecord,
  UpdateNotificationTemplatePayload,
} from './entities/notification-template-management';
export type {
  DashboardActivities,
  DashboardActivityItem,
  DashboardAiSummary,
  DashboardCameraHealthItem,
  DashboardCameraStatus,
  DashboardNotificationCenter,
  DashboardNotificationItem,
  DashboardChartPoint,
  DashboardCharts,
  DashboardStats,
} from './entities/dashboard';
export type { AnalyticsDashboard, AnalyticsChartPoint, AnalyticsRankedItem } from './entities/analytics-dashboard';
export type {
  OfficerDashboardActivities,
  OfficerDashboardCameraStatus,
  OfficerDashboardCharts,
  OfficerDashboardNotificationCenter,
  OfficerDashboardStats,
} from './entities/officer-dashboard';
export type {
  DriverDashboardActivities,
  DriverDashboardCharts,
  DriverDashboardNotificationCenter,
  DriverDashboardStats,
} from './entities/driver-dashboard';
export type {
  OfficerViolationDecision,
  OfficerViolationDecisionPayload,
  OfficerViolationDecisionResult,
  OfficerViolationReviewDetail,
  OfficerViolationReviewRecord,
  ViolationReviewStatus,
} from './entities/officer-violation-review';
export type { OfficerEvidenceDetail, OfficerEvidenceRecord, OfficerEvidenceStatus } from './entities/officer-evidence';
export type {
  CreateOfficerDriverPayload,
  OfficerDriverManagementDetail,
  OfficerDriverManagementRecord,
  OfficerDriverVehicleSummary,
  UpdateOfficerDriverPayload,
} from './entities/officer-driver-management';
export type {
  CreateOfficerVehiclePayload,
  OfficerVehicleManagementDetail,
  OfficerVehicleManagementRecord,
  OfficerVehicleStationViolationSummary,
  UpdateOfficerVehiclePayload,
} from './entities/officer-vehicle-management';
export type {
  OfficerNotificationReadAllResult,
  OfficerNotificationRecord,
  OfficerNotificationSummary,
} from './entities/officer-notifications';
export type { Officer } from './entities/officer';
export type {
  CreateOfficerPayload,
  OfficerManagementRecord,
  PoliceStationOption,
  UpdateOfficerPayload,
} from './entities/officer-management';
export type { OfficerProfileRecord, UpdateOfficerProfilePayload } from './entities/officer-profile';
export type { DriverProfileRecord, UpdateDriverProfilePayload } from './entities/driver-profile';
export type {
  DriverVehicleDetail,
  DriverVehicleRecord,
  DriverVehicleViolationSummary,
} from './entities/driver-vehicles';
export type { DriverViolationDetail, DriverViolationRecord } from './entities/driver-violations';
export type {
  DriverFineDetail,
  DriverFinePaymentPayload,
  DriverFinePaymentResult,
  DriverFinePaymentHistoryDetail,
  DriverFinePaymentHistoryRecord,
  DriverFineRecord,
  FinePaymentMethod,
} from './entities/driver-fines';
export type {
  AppealStatus,
  CreateDriverAppealPayload,
  DriverAppealDetail,
  DriverAppealRecord,
  DriverAppealableViolationRecord,
} from './entities/driver-appeals';
export type {
  AppealReviewDecision,
  OfficerAppealDecisionPayload,
  OfficerAppealDetail,
  OfficerAppealRecord,
} from './entities/officer-appeal-review';
export type {
  DriverNotificationReadAllResult,
  DriverNotificationRecord,
  DriverNotificationSummary,
} from './entities/driver-notifications';
export type { DriverSettingsRecord, UpdateDriverSettingsPayload } from './entities/driver-settings';
export type {
  CreatePoliceStationPayload,
  PoliceStationManagementRecord,
  UpdatePoliceStationPayload,
} from './entities/police-station-management';
export type {
  AIModelManagementRecord,
  AIModelType,
  CreateAIModelPayload,
  UpdateAIModelPayload,
} from './entities/ai-model-management';
export type {
  AIModelVersionRecord,
  AIModelVersionStatus,
  CreateAIModelVersionPayload,
  UpdateAIModelVersionPayload,
} from './entities/ai-model-version';
export type {
  AITrainingHistoryRecord,
  AITrainingStatus,
  CreateAITrainingHistoryPayload,
  UpdateAITrainingHistoryPayload,
} from './entities/ai-training-history';
export type { DetectionMonitorRecord, DetectionMonitorSummary } from './entities/detection-monitoring';
export type { DetectionDetailRecord, CreateOCRResultPayload, OCRResultRecord } from './entities/ocr-result';
export type { OfficerLiveDetectionCameraOption } from './entities/officer-live-detection';
export type {
  CameraManagementRecord,
  CreateCameraPayload,
  UpdateCameraPayload,
} from './entities/camera-management';
export type { CameraLiveDashboard, CameraLiveFeedItem } from './entities/camera-live-dashboard';
export type {
  CameraHealthCheckAllResult,
  CameraHealthMonitoring,
  CameraHealthRecord,
  CameraHealthState,
} from './entities/camera-health-monitoring';
export type { Driver } from './entities/driver';
export type { Vehicle } from './entities/vehicle';
export type { Camera, CameraStatus } from './entities/camera';
export type { TrafficSign } from './entities/traffic-sign';
export type {
  CreateSignCategoryPayload,
  SignCategoryManagementRecord,
  UpdateSignCategoryPayload,
} from './entities/sign-category-management';
export type {
  CreateSystemSettingPayload,
  SystemSettingRecord,
  SystemSettingValueType,
  UpdateSystemSettingPayload,
} from './entities/system-setting-management';
export type { BackupRecord, BackupRestoreResult, BackupStatus, CreateBackupPayload } from './entities/backup-management';
export type {
  CreateTrafficSignPayload,
  SignCategoryOption,
  TrafficSignManagementRecord,
  UpdateTrafficSignPayload,
} from './entities/traffic-sign-management';
export type { Violation, ViolationStatus } from './entities/violation';
export type { Fine, FineStatus } from './entities/fine';
export type {
  CreateReportExportPayload,
  ReportCatalogItem,
  ReportExportRecord,
  ReportExportStatus,
  ReportFormat,
  ReportTypeCode,
} from './entities/report-management';
