import { createCamTrafficApi, type LoginData } from '@camtraffic/api';
import type { OfficerViolationDecision, User } from '@camtraffic/types';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './authStorage';

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const api = createCamTrafficApi({
  baseUrl,
  getAccessToken,
  onUnauthorized: () => {
    clearTokens();
  },
});

export async function loginUser(email: string, password: string): Promise<LoginData> {
  const response = await api.auth.login({ email, password });
  setTokens(response.data.tokens);
  return response.data;
}

export async function loadCurrentUser(): Promise<User> {
  const response = await api.auth.me();
  return response.data;
}

export async function logoutUser(): Promise<void> {
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
  const response = await api.auth.forgotPassword({ email, portal: 'user' });
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
  const response = await api.auth.sendVerificationEmail({ portal: 'user' });
  return response.message ?? 'Verification email sent.';
}

export async function verifyEmail(uid: string, token: string) {
  const response = await api.auth.verifyEmail({ uid, token });
  return {
    user: response.data,
    message: response.message ?? 'Email verified successfully.',
  };
}

export async function loadOfficerDashboardStats() {
  const response = await api.dashboard.officer.stats();
  return response.data;
}

export async function loadOfficerDashboardCharts() {
  const response = await api.dashboard.officer.charts();
  return response.data;
}

export async function loadOfficerDashboardActivities() {
  const response = await api.dashboard.officer.activities();
  return response.data;
}

export async function loadOfficerDashboardCameraStatus() {
  const response = await api.dashboard.officer.cameraStatus();
  return response.data;
}

export async function loadOfficerDashboardNotifications() {
  const response = await api.dashboard.officer.notifications();
  return response.data;
}

export async function loadDriverDashboardStats() {
  const response = await api.dashboard.driver.stats();
  return response.data;
}

export async function loadDriverDashboardCharts() {
  const response = await api.dashboard.driver.charts();
  return response.data;
}

export async function loadDriverDashboardActivities() {
  const response = await api.dashboard.driver.activities();
  return response.data;
}

export async function loadDriverDashboardNotifications() {
  const response = await api.dashboard.driver.notifications();
  return response.data;
}

export async function loadOfficerLiveDetectionSummary() {
  const response = await api.detections.officer.monitoringSummary();
  return response.data;
}

export async function loadOfficerLiveDetections(params?: {
  camera_id?: string;
  min_confidence?: string;
  search?: string;
  limit?: number;
}) {
  const response = await api.detections.officer.listMonitoring(params);
  return response.data;
}

export async function loadOfficerLiveDetectionCameras() {
  const response = await api.detections.officer.cameras();
  return response.data;
}

export async function loadOfficerLiveCameraDashboard(params?: { search?: string; status?: string }) {
  const response = await api.cameras.officer.liveDashboard(params);
  return response.data;
}

export async function loadOfficerViolationReviews(params?: {
  status?: string;
  search?: string;
  limit?: number;
}) {
  const response = await api.violations.officer.listReview(params);
  return response.data;
}

export async function loadOfficerViolationReview(violationId: number) {
  const response = await api.violations.officer.getReview(violationId);
  return response.data;
}

export async function decideOfficerViolation(
  violationId: number,
  decision: OfficerViolationDecision,
  officerNotes?: string,
) {
  const response = await api.violations.officer.decide(violationId, {
    decision,
    officer_notes: officerNotes,
  });
  return {
    ...response.data,
    message: response.message ?? response.data.message,
  };
}

export async function loadOfficerDrivers(params?: { search?: string; is_active?: string }) {
  const response = await api.drivers.officer.list(params);
  return response.data;
}

export async function loadOfficerDriver(driverId: number) {
  const response = await api.drivers.officer.get(driverId);
  return response.data;
}

export async function createOfficerDriver(payload: Parameters<typeof api.drivers.officer.create>[0]) {
  const response = await api.drivers.officer.create(payload);
  return {
    driver: response.data,
    message: response.message ?? 'Driver created successfully.',
  };
}

export async function updateOfficerDriver(
  driverId: number,
  payload: Parameters<typeof api.drivers.officer.update>[1],
) {
  const response = await api.drivers.officer.update(driverId, payload);
  return {
    driver: response.data,
    message: response.message ?? 'Driver updated successfully.',
  };
}

export async function deleteOfficerDriver(driverId: number) {
  const response = await api.drivers.officer.delete(driverId);
  return response.message ?? 'Driver deleted successfully.';
}

export async function loadOfficerVehicles(params?: { search?: string; is_active?: string; owner_id?: string }) {
  const response = await api.vehicles.officer.list(params);
  return response.data;
}

export async function loadOfficerVehicle(vehicleId: number) {
  const response = await api.vehicles.officer.get(vehicleId);
  return response.data;
}

export async function createOfficerVehicle(payload: Parameters<typeof api.vehicles.officer.create>[0]) {
  const response = await api.vehicles.officer.create(payload);
  return {
    vehicle: response.data,
    message: response.message ?? 'Vehicle registered successfully.',
  };
}

export async function updateOfficerVehicle(
  vehicleId: number,
  payload: Parameters<typeof api.vehicles.officer.update>[1],
) {
  const response = await api.vehicles.officer.update(vehicleId, payload);
  return {
    vehicle: response.data,
    message: response.message ?? 'Vehicle updated successfully.',
  };
}

export async function deleteOfficerVehicle(vehicleId: number) {
  const response = await api.vehicles.officer.delete(vehicleId);
  return response.message ?? 'Vehicle deleted successfully.';
}

export async function loadDriverVehicles(params?: { search?: string; is_active?: string }) {
  const response = await api.vehicles.driver.list(params);
  return response.data;
}

export async function loadDriverVehicle(vehicleId: number) {
  const response = await api.vehicles.driver.get(vehicleId);
  return response.data;
}

export async function loadDriverViolations(params?: { status?: string; search?: string; limit?: number }) {
  const response = await api.violations.driver.list(params);
  return response.data;
}

export async function loadDriverViolation(violationId: number) {
  const response = await api.violations.driver.get(violationId);
  return response.data;
}

export async function loadDriverFines(params?: { status?: string; search?: string; limit?: number }) {
  const response = await api.fines.driver.list(params);
  return response.data;
}

export async function loadDriverFine(fineId: number) {
  const response = await api.fines.driver.get(fineId);
  return response.data;
}

export async function payDriverFine(
  fineId: number,
  method: Parameters<typeof api.fines.driver.pay>[1]['method'],
  transactionId?: string,
) {
  const response = await api.fines.driver.pay(fineId, {
    method,
    transaction_id: transactionId,
  });
  return {
    fine: response.data.fine,
    message: response.message ?? response.data.message,
  };
}

export async function loadDriverFinePayments(params?: { method?: string; search?: string; limit?: number }) {
  const response = await api.fines.driver.listPayments(params);
  return response.data;
}

export async function loadDriverFinePayment(paymentId: number) {
  const response = await api.fines.driver.getPayment(paymentId);
  return response.data;
}

export async function loadDriverAppealableViolations() {
  const response = await api.appeals.driver.listAppealable();
  return response.data;
}

export async function loadDriverAppeals(params?: { status?: string; search?: string; limit?: number }) {
  const response = await api.appeals.driver.list(params);
  return response.data;
}

export async function loadDriverAppeal(appealId: number) {
  const response = await api.appeals.driver.get(appealId);
  return response.data;
}

export async function submitDriverAppeal(payload: {
  violation_id: number;
  reason: string;
  evidence?: File | null;
}) {
  const response = await api.appeals.driver.create(payload);
  return {
    appeal: response.data,
    message: response.message ?? 'Appeal submitted successfully.',
  };
}

export async function loadDriverNotificationSummary() {
  const response = await api.notifications.driver.summary();
  return response.data;
}

export async function loadDriverNotifications(params?: { search?: string; is_read?: string; limit?: number }) {
  const response = await api.notifications.driver.list(params);
  return response.data;
}

export async function loadDriverNotification(notificationId: number) {
  const response = await api.notifications.driver.get(notificationId);
  return response.data;
}

export async function updateDriverNotification(notificationId: number, isRead: boolean) {
  const response = await api.notifications.driver.update(notificationId, { is_read: isRead });
  return {
    notification: response.data,
    message: response.message ?? 'Notification updated successfully.',
  };
}

export async function markAllDriverNotificationsRead() {
  const response = await api.notifications.driver.markAllRead();
  return {
    updated: response.data.updated,
    message: response.message ?? 'All notifications marked as read.',
  };
}

export async function loadDriverSettings() {
  const response = await api.drivers.settings.me();
  return response.data;
}

export async function updateDriverSettings(payload: Parameters<typeof api.drivers.settings.updateMe>[0]) {
  const response = await api.drivers.settings.updateMe(payload);
  return {
    settings: response.data,
    message: response.message ?? 'Driver settings updated successfully.',
  };
}

export async function loadOfficerEvidenceList(params?: {
  status?: string;
  search?: string;
  has_evidence?: string;
  limit?: number;
}) {
  const response = await api.violations.officer.listEvidence(params);
  return response.data;
}

export async function loadOfficerEvidenceDetail(violationId: number) {
  const response = await api.violations.officer.getEvidence(violationId);
  return response.data;
}

export async function loadOfficerReportCatalog() {
  const response = await api.reports.officer.catalog();
  return response.data;
}

export async function loadOfficerReportExports(params?: { report_type?: string; status?: string }) {
  const response = await api.reports.officer.listExports(params);
  return response.data;
}

export async function createOfficerReportExport(payload: Parameters<typeof api.reports.officer.createExport>[0]) {
  const response = await api.reports.officer.createExport(payload);
  return {
    exportRecord: response.data,
    message: response.message ?? 'Report export generated successfully.',
  };
}

export async function loadOfficerNotificationSummary() {
  const response = await api.notifications.officer.summary();
  return response.data;
}

export async function loadOfficerNotifications(params?: { search?: string; is_read?: string; limit?: number }) {
  const response = await api.notifications.officer.list(params);
  return response.data;
}

export async function loadOfficerNotification(notificationId: number) {
  const response = await api.notifications.officer.get(notificationId);
  return response.data;
}

export async function updateOfficerNotification(notificationId: number, isRead: boolean) {
  const response = await api.notifications.officer.update(notificationId, { is_read: isRead });
  return {
    notification: response.data,
    message: response.message ?? 'Notification updated successfully.',
  };
}

export async function markAllOfficerNotificationsRead() {
  const response = await api.notifications.officer.markAllRead();
  return {
    updated: response.data.updated,
    message: response.message ?? 'All notifications marked as read.',
  };
}

export async function loadProfile() {
  const response = await api.profile.me();
  return response.data;
}

export async function updateProfile(payload: Parameters<typeof api.profile.updateMe>[0]) {
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

export async function loadOfficerProfile() {
  const response = await api.officers.profile.me();
  return response.data;
}

export async function updateOfficerProfile(payload: Parameters<typeof api.officers.profile.updateMe>[0]) {
  const response = await api.officers.profile.updateMe(payload);
  return {
    profile: response.data,
    message: response.message ?? 'Officer profile updated successfully.',
  };
}

export async function loadDriverProfile() {
  const response = await api.drivers.profile.me();
  return response.data;
}

export async function updateDriverProfile(payload: Parameters<typeof api.drivers.profile.updateMe>[0]) {
  const response = await api.drivers.profile.updateMe(payload);
  return {
    profile: response.data,
    message: response.message ?? 'Driver profile updated successfully.',
  };
}
