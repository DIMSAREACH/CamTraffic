import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, LocaleToggle, ThemeToggle, useTheme, useTranslation } from '@camtraffic/ui';
import type { ApiError } from '@camtraffic/api';
import type { User } from '@camtraffic/types';
import { formatDateTime } from '@camtraffic/utils';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoginForm } from './features/auth/LoginForm';
import { ForgotPasswordForm } from './features/auth/ForgotPasswordForm';
import { ResetPasswordForm } from './features/auth/ResetPasswordForm';
import { ChangePasswordForm } from './features/auth/ChangePasswordForm';
import { VerifyEmailPage } from './features/auth/VerifyEmailPage';
import { EmailVerificationPanel } from './features/auth/EmailVerificationPanel';
import { DashboardHome } from './features/dashboard/DashboardHome';
import { ProfileForm } from './features/profile/ProfileForm';
import { BackupRestorePage } from './features/backup/BackupRestorePage';
import { SystemSettingsManagementPage } from './features/system-settings/SystemSettingsManagementPage';
import { NotificationTemplatesManagementPage } from './features/notifications/NotificationTemplatesManagementPage';
import { LoginHistoryCard } from './features/audit-logs/LoginHistoryCard';
import { AuditLogsManagementPage } from './features/audit-logs/AuditLogsManagementPage';
import { AnalyticsDashboardPage } from './features/analytics/AnalyticsDashboardPage';
import { CameraHealthMonitoringPanel } from './features/cameras/CameraHealthMonitoringPanel';
import { CamerasManagementPage } from './features/cameras/CamerasManagementPage';
import { LiveCameraDashboardPanel } from './features/cameras/LiveCameraDashboardPanel';
import { ReportsManagementPage } from './features/reports/ReportsManagementPage';
import { RolesManagementPage } from './features/roles/RolesManagementPage';
import { AiTrainingHistoryPanel } from './features/ai-models/AiTrainingHistoryPanel';
import { DetectionMonitoringPanel } from './features/ai-models/DetectionMonitoringPanel';
import { AiModelVersionsPanel } from './features/ai-models/AiModelVersionsPanel';
import { AiModelsManagementPage } from './features/ai-models/AiModelsManagementPage';
import { OfficersManagementPage } from './features/officers/OfficersManagementPage';
import { PoliceStationsManagementPage } from './features/police-stations/PoliceStationsManagementPage';
import { PermissionsManagementPage } from './features/permissions/PermissionsManagementPage';
import { SignCategoriesManagementPage } from './features/traffic-signs/SignCategoriesManagementPage';
import { TrafficSignsManagementPage } from './features/traffic-signs/TrafficSignsManagementPage';
import { UsersManagementPage } from './features/users/UsersManagementPage';
import { AdminLayout } from './layouts';
import { getAccessToken } from './lib/authStorage';
import {
  changePassword,
  loadCurrentUser,
  loadProfile,
  loginAdmin,
  logoutAdmin,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  loadDashboardAiSummary,
  loadDashboardCameraStatus,
  loadDashboardNotifications,
  loadDashboardActivities,
  loadDashboardCharts,
  loadLoginHistory,
  loadAuditLogSummary,
  loadAuditLogs,
  loadDashboardStats,
  createUser,
  createAiModel,
  createAiModelVersion,
  createAiTrainingHistory,
  createCamera,
  createOfficer,
  createPoliceStation,
  createPermission,
  createRole,
  createTrafficSign,
  createSignCategory,
  createReportExport,
  deleteOfficer,
  deleteAiModel,
  deleteAiModelVersion,
  deleteAiTrainingHistory,
  deleteCamera,
  deletePoliceStation,
  deletePermission,
  deleteRole,
  deleteTrafficSign,
  deleteSignCategory,
  deleteUser,
  loadDetectionMonitoring,
  loadDetectionSummary,
  updateProfile,
  updateUser,
  uploadAvatar,
  deleteAvatar,
  loadAnalyticsDashboard,
  loadNotificationTemplates,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  loadSystemSettings,
  createSystemSetting,
  updateSystemSetting,
  deleteSystemSetting,
  loadBackups,
  createBackup,
  restoreBackup,
  deleteBackup,
  loadUsers,
  loadAiModels,
  loadAiModelVersions,
  loadAiTrainingHistory,
  loadCameras,
  loadCameraLiveDashboard,
  loadCameraHealthMonitoring,
  loadOfficers,
  loadPoliceStationRecords,
  loadPoliceStations,
  loadPermissions,
  loadRoles,
  loadReportCatalog,
  loadReportExports,
  loadSignCategories,
  loadSignCategoryRecords,
  loadTrafficSigns,
  updateOfficer,
  updateAiModel,
  updateAiModelVersion,
  updateAiTrainingHistory,
  updateCamera,
  runCameraHealthCheck,
  runCameraHealthCheckAll,
  activateAiModelVersion,
  updatePoliceStation,
  updatePermission,
  verifyEmail,
  updateRole,
  updateTrafficSign,
  updateSignCategory,
} from './lib/api';

type AuthView = 'login' | 'forgot-password' | 'reset-password' | 'verify-email';

function App() {
  const { mode } = useTheme();
  const { t, locale } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [booting, setBooting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<{ uid: string; token: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);
  const [verifyToken, setVerifyToken] = useState<{ uid: string; token: string } | null>(null);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);
  const verifyStarted = useRef(false);

  const isAuthenticated = user !== null;
  const sampleDate = useMemo(() => formatDateTime(new Date(), locale), [locale]);
  const portalPath = location.pathname.replace('/portal', '') || '/dashboard';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const uid = params.get('uid');
    const resetTokenParam = params.get('token');
    if (location.pathname === '/verify-email' && uid && resetTokenParam) {
      setAuthView('verify-email');
      setVerifyToken({ uid, token: resetTokenParam });
      setBooting(false);
      return;
    }
    if (location.pathname === '/reset-password' && uid && resetTokenParam) {
      setAuthView('reset-password');
      setResetToken({ uid, token: resetTokenParam });
      setBooting(false);
      return;
    }
    if (location.pathname === '/forgot-password') {
      setAuthView('forgot-password');
      setBooting(false);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setAuthView('login');
      setBooting(false);
      return;
    }

    loadCurrentUser()
      .then((currentUser) => {
        if (currentUser.role === 'admin' || currentUser.role === 'super_admin') {
          setUser(currentUser);
          setErrorMessage(null);
        } else {
          setErrorMessage('This account does not have admin access.');
        }
      })
      .catch(() => {
        setErrorMessage('Session expired. Please login again.');
      })
      .finally(() => setBooting(false));
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (authView !== 'verify-email' || !verifyToken || verifyStarted.current) {
      return;
    }

    verifyStarted.current = true;
    const tokenPair = verifyToken;

    async function confirmEmail() {
      setIsSubmitting(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      try {
        const result = await verifyEmail(tokenPair.uid, tokenPair.token);
        setSuccessMessage(result.message);
      } catch (error) {
        const message = (error as ApiError).message || 'Unable to verify email. Please request a new link.';
        setErrorMessage(message);
      } finally {
        setIsSubmitting(false);
      }
    }

    void confirmEmail();
  }, [authView, verifyToken]);

  async function handleLogin(email: string, password: string, rememberMe: boolean = false) {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const data = await loginAdmin(email, password);
      if (data.user.role !== 'admin' && data.user.role !== 'super_admin') {
        await logoutAdmin();
        setErrorMessage('This account does not have admin access.');
        setUser(null);
        return;
      }
      
      // Store remember me preference (future enhancement: implement token refresh logic)
      if (rememberMe && typeof localStorage !== 'undefined') {
        localStorage.setItem('camtraffic_remember_me', 'true');
      }
      
      setUser(data.user);
      navigate('/portal/dashboard', { replace: true });
    } catch (error) {
      const message = (error as ApiError).message || 'Login failed. Please try again.';
      setErrorMessage(message);
      setUser(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setIsSubmitting(true);
    try {
      await logoutAdmin();
      setUser(null);
      setErrorMessage(null);
      setSuccessMessage(null);
      setAuthView('login');
      navigate('/', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotPassword(email: string) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const message = await requestPasswordReset(email);
      setSuccessMessage(message);
    } catch (error) {
      const message = (error as ApiError).message || 'Unable to send reset instructions. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBackToLogin() {
    setAuthView('login');
    setErrorMessage(null);
    setSuccessMessage(null);
    setResetToken(null);
    setVerifyToken(null);
    verifyStarted.current = false;
    navigate('/', { replace: true });
  }

  async function handleResetPassword(newPassword: string) {
    if (!resetToken) {
      setErrorMessage('Invalid or expired reset link.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const message = await resetPassword(resetToken.uid, resetToken.token, newPassword);
      setSuccessMessage(message);
    } catch (error) {
      const message = (error as ApiError).message || 'Unable to reset password. Please request a new link.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleChangePassword(currentPassword: string, newPassword: string) {
    setIsChangingPassword(true);
    setChangePasswordError(null);
    setChangePasswordSuccess(null);
    try {
      const message = await changePassword(currentPassword, newPassword);
      setChangePasswordSuccess(message);
    } catch (error) {
      const message = (error as ApiError).message || 'Unable to change password. Please try again.';
      setChangePasswordError(message);
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleSendVerificationEmail() {
    setIsSendingVerification(true);
    setVerificationError(null);
    setVerificationSuccess(null);
    try {
      const message = await sendVerificationEmail();
      setVerificationSuccess(message);
    } catch (error) {
      const message = (error as ApiError).message || 'Unable to send verification email. Please try again.';
      setVerificationError(message);
    } finally {
      setIsSendingVerification(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <>
        {booting ? (
          <main className="auth-page">
            <Card title={t.common.loading}>
              <p>Checking existing session...</p>
            </Card>
          </main>
        ) : authView === 'forgot-password' ? (
          <ForgotPasswordForm
            portalTitle={`${t.common.appName} Admin`}
            portalSubtitle="Super Administrator Portal"
            onSubmit={handleForgotPassword}
            onBackToLogin={handleBackToLogin}
            isLoading={isSubmitting}
            errorMessage={errorMessage}
            successMessage={successMessage}
          />
        ) : authView === 'reset-password' ? (
          <ResetPasswordForm
            portalTitle={`${t.common.appName} Admin`}
            portalSubtitle="Super Administrator Portal"
            onSubmit={handleResetPassword}
            onBackToLogin={handleBackToLogin}
            isLoading={isSubmitting}
            errorMessage={errorMessage}
            successMessage={successMessage}
          />
        ) : authView === 'verify-email' ? (
          <VerifyEmailPage
            portalTitle={`${t.common.appName} Admin`}
            portalSubtitle="Super Administrator Portal"
            onBackToLogin={handleBackToLogin}
            isLoading={isSubmitting}
            errorMessage={errorMessage}
            successMessage={successMessage}
          />
        ) : (
          <LoginForm
            onSubmit={handleLogin}
            onForgotPassword={() => {
              navigate('/forgot-password');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            isLoading={isSubmitting}
            errorMessage={errorMessage}
          />
        )}
      </>
    );
  }

  return (
    <AdminLayout
      title={`${t.common.appName} Admin`}
      subtitle={`Welcome, ${user.first_name || user.email}`}
      badge={`${t.portal.badge} · ${t.theme[mode]}`}
      toolbar={
        <>
          <LocaleToggle />
          <ThemeToggle />
          <Button type="button" variant="ghost" onClick={handleLogout} isLoading={isSubmitting}>
            {t.auth.logout}
          </Button>
        </>
      }
      footer={<p className="auth-form__hint">Task 030 — Footer component in layout shell</p>}
    >
      {portalPath === '/dashboard' ? (
        <DashboardHome
          role={user.role}
          sampleDate={sampleDate}
          onLoadStats={loadDashboardStats}
          onLoadCharts={loadDashboardCharts}
          onLoadActivities={loadDashboardActivities}
          onLoadAiSummary={loadDashboardAiSummary}
          onLoadCameraStatus={loadDashboardCameraStatus}
          onLoadNotifications={loadDashboardNotifications}
        />
      ) : null}

      {portalPath === '/profile' ? (
        <>
          <ProfileForm
            onLoad={loadProfile}
            onSubmit={async (payload) => {
              const result = await updateProfile(payload);
              setUser((current) =>
                current
                  ? {
                      ...current,
                      first_name: result.profile.first_name,
                      last_name: result.profile.last_name,
                    }
                  : current,
              );
              return result.message;
            }}
            onUploadAvatar={uploadAvatar}
            onDeleteAvatar={deleteAvatar}
            onAvatarChange={(avatarUrl) =>
              setUser((current) => (current ? { ...current, avatar_url: avatarUrl } : current))
            }
          />

          <ChangePasswordForm
            onSubmit={handleChangePassword}
            isLoading={isChangingPassword}
            errorMessage={changePasswordError}
            successMessage={changePasswordSuccess}
          />

          <EmailVerificationPanel
            user={user}
            onSendVerification={handleSendVerificationEmail}
            isLoading={isSendingVerification}
            errorMessage={verificationError}
            successMessage={verificationSuccess}
          />
        </>
      ) : null}

      {portalPath === '/system-settings' ? (
        <SystemSettingsManagementPage
          onLoad={loadSystemSettings}
          onCreate={createSystemSetting}
          onUpdate={updateSystemSetting}
          onDelete={deleteSystemSetting}
        />
      ) : null}

      {portalPath === '/backup' ? (
        <BackupRestorePage
          onLoad={loadBackups}
          onCreate={createBackup}
          onRestore={restoreBackup}
          onDelete={deleteBackup}
        />
      ) : null}

      {portalPath === '/notifications' ? (
        <NotificationTemplatesManagementPage
          onLoad={loadNotificationTemplates}
          onCreate={createNotificationTemplate}
          onUpdate={updateNotificationTemplate}
          onDelete={deleteNotificationTemplate}
        />
      ) : null}

      {portalPath === '/audit' ? (
        <>
          <AuditLogsManagementPage onLoadSummary={loadAuditLogSummary} onLoad={loadAuditLogs} />
          <LoginHistoryCard onLoad={() => loadLoginHistory(25)} />
        </>
      ) : null}

      {portalPath === '/users' ? (
        <UsersManagementPage
          onLoad={loadUsers}
          onCreate={createUser}
          onUpdate={updateUser}
          onDelete={deleteUser}
        />
      ) : null}

      {portalPath === '/roles' ? (
        <RolesManagementPage onLoad={loadRoles} onCreate={createRole} onUpdate={updateRole} onDelete={deleteRole} />
      ) : null}

      {portalPath === '/permissions' ? (
        <PermissionsManagementPage
          onLoad={loadPermissions}
          onCreate={createPermission}
          onUpdate={updatePermission}
          onDelete={deletePermission}
        />
      ) : null}

      {portalPath === '/officers' ? (
        <OfficersManagementPage
          onLoadStations={loadPoliceStations}
          onLoad={loadOfficers}
          onCreate={createOfficer}
          onUpdate={updateOfficer}
          onDelete={deleteOfficer}
        />
      ) : null}

      {portalPath === '/police-stations' ? (
        <PoliceStationsManagementPage
          onLoad={loadPoliceStationRecords}
          onCreate={createPoliceStation}
          onUpdate={updatePoliceStation}
          onDelete={deletePoliceStation}
        />
      ) : null}

      {portalPath === '/cameras' ? (
        <>
          <CamerasManagementPage
            onLoadStations={loadPoliceStations}
            onLoad={loadCameras}
            onCreate={createCamera}
            onUpdate={updateCamera}
            onDelete={deleteCamera}
          />
          <LiveCameraDashboardPanel onLoadStations={loadPoliceStations} onLoad={loadCameraLiveDashboard} />
          <CameraHealthMonitoringPanel
            onLoadStations={loadPoliceStations}
            onLoad={loadCameraHealthMonitoring}
            onRunCheck={runCameraHealthCheck}
            onRunCheckAll={runCameraHealthCheckAll}
          />
        </>
      ) : null}

      {portalPath === '/traffic-signs' ? (
        <>
          <TrafficSignsManagementPage
            onLoadCategories={loadSignCategories}
            onLoad={loadTrafficSigns}
            onCreate={createTrafficSign}
            onUpdate={updateTrafficSign}
            onDelete={deleteTrafficSign}
          />
          <SignCategoriesManagementPage
            onLoad={loadSignCategoryRecords}
            onCreate={createSignCategory}
            onUpdate={updateSignCategory}
            onDelete={deleteSignCategory}
          />
        </>
      ) : null}

      {portalPath === '/reports' ? (
        <ReportsManagementPage
          onLoadCatalog={loadReportCatalog}
          onLoadExports={loadReportExports}
          onCreateExport={createReportExport}
        />
      ) : null}

      {portalPath === '/analytics' ? <AnalyticsDashboardPage onLoad={loadAnalyticsDashboard} /> : null}

      {portalPath === '/ai-models' ? (
        <>
          <AiModelsManagementPage
            onLoad={loadAiModels}
            onCreate={createAiModel}
            onUpdate={updateAiModel}
            onDelete={deleteAiModel}
          />
          <AiModelVersionsPanel
            onLoadModels={loadAiModels}
            onLoadVersions={loadAiModelVersions}
            onCreate={createAiModelVersion}
            onUpdate={updateAiModelVersion}
            onActivate={activateAiModelVersion}
            onDelete={deleteAiModelVersion}
          />
          <AiTrainingHistoryPanel
            onLoadVersions={loadAiModelVersions}
            onLoad={loadAiTrainingHistory}
            onCreate={createAiTrainingHistory}
            onUpdate={updateAiTrainingHistory}
            onDelete={deleteAiTrainingHistory}
          />
          <DetectionMonitoringPanel
            onLoadSummary={loadDetectionSummary}
            onLoad={loadDetectionMonitoring}
            onLoadVersions={loadAiModelVersions}
          />
        </>
      ) : null}
    </AdminLayout>
  );
}

export default App;
