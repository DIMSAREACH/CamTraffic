import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, LocaleToggle, ThemeToggle, useTheme, useTranslation } from '@camtraffic/ui';
import type { ApiError } from '@camtraffic/api';
import type { User, UserRole } from '@camtraffic/types';
import { formatDateTime } from '@camtraffic/utils';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoginForm } from './features/auth/LoginForm';
import { ForgotPasswordForm } from './features/auth/ForgotPasswordForm';
import { ResetPasswordForm } from './features/auth/ResetPasswordForm';
import { ChangePasswordForm } from './features/auth/ChangePasswordForm';
import { VerifyEmailPage } from './features/auth/VerifyEmailPage';
import { EmailVerificationPanel } from './features/auth/EmailVerificationPanel';
import { OfficerDashboardHome } from './features/officer/dashboard';
import { OfficerLiveDetectionPage } from './features/officer/live-detection';
import { OfficerLiveCameraPage } from './features/officer/live-camera';
import { OfficerViolationReviewPage } from './features/officer/violations';
import { OfficerDriversManagementPage } from './features/officer/drivers';
import { OfficerVehiclesManagementPage } from './features/officer/vehicles';
import { OfficerEvidenceViewerPage } from './features/officer/evidence';
import { OfficerReportsPage } from './features/officer/reports';
import { OfficerNotificationsPage } from './features/officer/notifications';
import { OfficerProfilePage } from './features/officer/profile';
import { DriverDashboardHome } from './features/driver/dashboard';
import { DriverProfilePage } from './features/driver/profile';
import { DriverVehiclesPage } from './features/driver/vehicles';
import { DriverViolationsPage } from './features/driver/violations';
import { DriverFinesPage, DriverPaymentHistoryPage } from './features/driver/fines';
import { DriverAppealsPage } from './features/driver/appeals';
import { DriverNotificationsPage } from './features/driver/notifications';
import { DriverSettingsPage } from './features/driver/settings';
import { OfficerLayout } from './layouts/officer';
import { DriverLayout } from './layouts/driver';
import { getAccessToken } from './lib/authStorage';
import { USER_APP_NAME } from './lib/constants';
import {
  DRIVER_PORTAL_BASE,
  getPortalHomeRoute,
  OFFICER_PORTAL_BASE,
  USER_PORTAL_ROLES,
} from './lib/constants';
import {
  changePassword,
  loadCurrentUser,
  loadOfficerDashboardActivities,
  loadOfficerDashboardCameraStatus,
  loadOfficerDashboardCharts,
  loadOfficerDashboardNotifications,
  loadOfficerDashboardStats,
  loadDriverDashboardActivities,
  loadDriverDashboardCharts,
  loadDriverDashboardNotifications,
  loadDriverDashboardStats,
  loadOfficerLiveDetectionCameras,
  loadOfficerLiveDetections,
  loadOfficerLiveDetectionSummary,
  loadOfficerLiveCameraDashboard,
  loadOfficerViolationReview,
  loadOfficerViolationReviews,
  decideOfficerViolation,
  loadOfficerDrivers,
  loadOfficerDriver,
  createOfficerDriver,
  updateOfficerDriver,
  deleteOfficerDriver,
  loadOfficerVehicles,
  loadOfficerVehicle,
  createOfficerVehicle,
  updateOfficerVehicle,
  deleteOfficerVehicle,
  loadOfficerEvidenceList,
  loadOfficerEvidenceDetail,
  loadOfficerReportCatalog,
  loadOfficerReportExports,
  createOfficerReportExport,
  loadOfficerNotificationSummary,
  loadOfficerNotifications,
  loadOfficerNotification,
  updateOfficerNotification,
  markAllOfficerNotificationsRead,
  loadProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  loadOfficerProfile,
  updateOfficerProfile,
  loadDriverProfile,
  updateDriverProfile,
  loadDriverVehicles,
  loadDriverVehicle,
  loadDriverViolations,
  loadDriverViolation,
  loadDriverFines,
  loadDriverFine,
  payDriverFine,
  loadDriverFinePayments,
  loadDriverFinePayment,
  loadDriverAppealableViolations,
  loadDriverAppeals,
  loadDriverAppeal,
  submitDriverAppeal,
  loadDriverNotificationSummary,
  loadDriverNotifications,
  loadDriverNotification,
  updateDriverNotification,
  markAllDriverNotificationsRead,
  loadDriverSettings,
  updateDriverSettings,
  loginUser,
  logoutUser,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
} from './lib/api';

function isUserPortalRole(role: UserRole): boolean {
  return USER_PORTAL_ROLES.includes(role);
}

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
  const isOfficerPortal = location.pathname.startsWith(OFFICER_PORTAL_BASE);
  const isDriverPortal = location.pathname.startsWith(DRIVER_PORTAL_BASE);
  const portalBase = isOfficerPortal
    ? OFFICER_PORTAL_BASE
    : isDriverPortal
      ? DRIVER_PORTAL_BASE
      : '';
  const portalPath = portalBase ? location.pathname.replace(portalBase, '') || '/dashboard' : '/dashboard';

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
        if (isUserPortalRole(currentUser.role)) {
          setUser(currentUser);
          setErrorMessage(null);
        } else {
          setErrorMessage('This account does not have officer or driver access.');
        }
      })
      .catch(() => {
        setErrorMessage('Session expired. Please login again.');
      })
      .finally(() => setBooting(false));
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const homeRoute = getPortalHomeRoute(user.role);

    if (user.role === 'officer' && isDriverPortal) {
      navigate(homeRoute, { replace: true });
      return;
    }
    if (user.role === 'driver' && isOfficerPortal) {
      navigate(homeRoute, { replace: true });
      return;
    }
    if (!isOfficerPortal && !isDriverPortal) {
      navigate(homeRoute, { replace: true });
    }
  }, [user, isOfficerPortal, isDriverPortal, navigate]);

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
      const data = await loginUser(email, password);
      if (!isUserPortalRole(data.user.role)) {
        await logoutUser();
        setErrorMessage('This account does not have officer or driver access.');
        setUser(null);
        return;
      }
      
      // Store remember me preference (future enhancement: implement token refresh logic)
      if (rememberMe && typeof localStorage !== 'undefined') {
        localStorage.setItem('camtraffic_remember_me', 'true');
      }
      
      setUser(data.user);
      navigate(getPortalHomeRoute(data.user.role), { replace: true });
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
      await logoutUser();
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
    return booting ? (
      <main className="auth-page">
        <Card title={t.common.loading}>
          <p>Checking existing session...</p>
        </Card>
      </main>
    ) : authView === 'forgot-password' ? (
      <ForgotPasswordForm
        onSubmit={handleForgotPassword}
        onBackToLogin={handleBackToLogin}
        isLoading={isSubmitting}
        errorMessage={errorMessage}
        successMessage={successMessage}
      />
    ) : authView === 'reset-password' ? (
      <ResetPasswordForm
        onSubmit={handleResetPassword}
        onBackToLogin={handleBackToLogin}
        isLoading={isSubmitting}
        errorMessage={errorMessage}
        successMessage={successMessage}
      />
    ) : authView === 'verify-email' ? (
      <VerifyEmailPage
        onBackToLogin={handleBackToLogin}
        isLoading={isSubmitting}
        errorMessage={errorMessage}
        successMessage={successMessage}
      />
    ) : (
      <LoginForm
        onSubmit={handleLogin}
        onForgotPassword={() => {
          setAuthView('forgot-password');
          setErrorMessage(null);
          setSuccessMessage(null);
          navigate('/forgot-password');
        }}
        isLoading={isSubmitting}
        errorMessage={errorMessage}
      />
    );
  }

  const portalLabel = user.role === 'officer' ? t.nav.officers : t.nav.drivers;
  const portalToolbar = (
    <>
      <LocaleToggle />
      <ThemeToggle />
      <Button type="button" variant="ghost" onClick={handleLogout} isLoading={isSubmitting}>
        {t.auth.logout}
      </Button>
    </>
  );

  if (user.role === 'officer') {
    return (
      <OfficerLayout
        title={`${USER_APP_NAME} ${t.nav.officers}`}
        subtitle={`${t.common.welcome}, ${user.first_name || user.email}`}
        badge={`${portalLabel} · ${t.theme[mode]}`}
        toolbar={portalToolbar}
        footer={<p className="auth-form__hint">Task 061 — Officer layout shell</p>}
      >
        {portalPath === '/dashboard' ? (
          <OfficerDashboardHome
            sampleDate={sampleDate}
            onLoadStats={loadOfficerDashboardStats}
            onLoadCharts={loadOfficerDashboardCharts}
            onLoadActivities={loadOfficerDashboardActivities}
            onLoadCameraStatus={loadOfficerDashboardCameraStatus}
            onLoadNotifications={loadOfficerDashboardNotifications}
          />
        ) : null}

        {portalPath === '/profile' ? (
          <OfficerProfilePage
            user={user}
            onLoadProfile={loadProfile}
            onUpdateProfile={updateProfile}
            onUploadAvatar={uploadAvatar}
            onDeleteAvatar={deleteAvatar}
            onLoadOfficerProfile={loadOfficerProfile}
            onUpdateOfficerProfile={updateOfficerProfile}
            securitySection={
              <>
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
            }
          />
        ) : null}

        {portalPath === '/live-detection' ? (
          <OfficerLiveDetectionPage
            onLoadSummary={loadOfficerLiveDetectionSummary}
            onLoadDetections={loadOfficerLiveDetections}
            onLoadCameras={loadOfficerLiveDetectionCameras}
          />
        ) : null}

        {portalPath === '/live-camera' ? (
          <OfficerLiveCameraPage onLoad={loadOfficerLiveCameraDashboard} />
        ) : null}

        {portalPath === '/violations' ? (
          <OfficerViolationReviewPage
            onLoadList={loadOfficerViolationReviews}
            onLoadDetail={loadOfficerViolationReview}
            onDecide={(violationId, decision, officerNotes) =>
              decideOfficerViolation(violationId, decision, officerNotes)
            }
          />
        ) : null}

        {portalPath === '/drivers' ? (
          <OfficerDriversManagementPage
            onLoadList={loadOfficerDrivers}
            onLoadDetail={loadOfficerDriver}
            onCreate={createOfficerDriver}
            onUpdate={updateOfficerDriver}
            onDelete={deleteOfficerDriver}
          />
        ) : null}

        {portalPath === '/vehicles' ? (
          <OfficerVehiclesManagementPage
            onLoadDrivers={() => loadOfficerDrivers({ is_active: 'true' })}
            onLoadList={loadOfficerVehicles}
            onLoadDetail={loadOfficerVehicle}
            onCreate={createOfficerVehicle}
            onUpdate={updateOfficerVehicle}
            onDelete={deleteOfficerVehicle}
          />
        ) : null}

        {portalPath === '/evidence' ? (
          <OfficerEvidenceViewerPage
            onLoadList={loadOfficerEvidenceList}
            onLoadDetail={loadOfficerEvidenceDetail}
          />
        ) : null}

        {portalPath === '/reports' ? (
          <OfficerReportsPage
            onLoadCatalog={loadOfficerReportCatalog}
            onLoadExports={loadOfficerReportExports}
            onCreateExport={createOfficerReportExport}
          />
        ) : null}

        {portalPath === '/notifications' ? (
          <OfficerNotificationsPage
            onLoadSummary={loadOfficerNotificationSummary}
            onLoadList={loadOfficerNotifications}
            onLoadDetail={loadOfficerNotification}
            onUpdate={updateOfficerNotification}
            onMarkAllRead={markAllOfficerNotificationsRead}
          />
        ) : null}

        {portalPath !== '/dashboard' &&
        portalPath !== '/profile' &&
        portalPath !== '/live-detection' &&
        portalPath !== '/live-camera' &&
        portalPath !== '/violations' &&
        portalPath !== '/drivers' &&
        portalPath !== '/vehicles' &&
        portalPath !== '/evidence' &&
        portalPath !== '/reports' &&
        portalPath !== '/notifications' ? (
          <Card title={portalPath.replace('/', '') || 'Officer'} subtitle="Feature coming in a later task">
            <p>
              Route: <strong>{location.pathname}</strong>
            </p>
          </Card>
        ) : null}
      </OfficerLayout>
    );
  }

  return (
    <DriverLayout
      title={`${USER_APP_NAME} ${t.nav.drivers}`}
      subtitle={`${t.common.welcome}, ${user.first_name || user.email}`}
      badge={`${portalLabel} · ${t.theme[mode]}`}
      toolbar={portalToolbar}
      footer={<p className="auth-form__hint">Task 062 — Driver layout shell</p>}
    >
      {portalPath === '/dashboard' ? (
        <DriverDashboardHome
          sampleDate={sampleDate}
          onLoadStats={loadDriverDashboardStats}
          onLoadCharts={loadDriverDashboardCharts}
          onLoadActivities={loadDriverDashboardActivities}
          onLoadNotifications={loadDriverDashboardNotifications}
        />
      ) : null}

      {portalPath === '/profile' ? (
        <DriverProfilePage
          user={user}
          onLoadProfile={loadProfile}
          onUpdateProfile={updateProfile}
          onUploadAvatar={uploadAvatar}
          onDeleteAvatar={deleteAvatar}
          onLoadDriverProfile={loadDriverProfile}
          onUpdateDriverProfile={updateDriverProfile}
          securitySection={
            <>
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
          }
        />
      ) : null}

      {portalPath === '/vehicles' ? (
        <DriverVehiclesPage onLoadList={loadDriverVehicles} onLoadDetail={loadDriverVehicle} />
      ) : null}

      {portalPath === '/violations' ? (
        <DriverViolationsPage onLoadList={loadDriverViolations} onLoadDetail={loadDriverViolation} />
      ) : null}

      {portalPath === '/fines' ? (
        <DriverFinesPage
          onLoadList={loadDriverFines}
          onLoadDetail={loadDriverFine}
          onPay={payDriverFine}
        />
      ) : null}

      {portalPath === '/fines/payments' ? (
        <DriverPaymentHistoryPage
          onLoadList={loadDriverFinePayments}
          onLoadDetail={loadDriverFinePayment}
        />
      ) : null}

      {portalPath === '/appeals' ? (
        <DriverAppealsPage
          onLoadAppealable={loadDriverAppealableViolations}
          onLoadList={loadDriverAppeals}
          onLoadDetail={loadDriverAppeal}
          onSubmit={submitDriverAppeal}
        />
      ) : null}

      {portalPath === '/notifications' ? (
        <DriverNotificationsPage
          onLoadSummary={loadDriverNotificationSummary}
          onLoadList={loadDriverNotifications}
          onLoadDetail={loadDriverNotification}
          onUpdate={updateDriverNotification}
          onMarkAllRead={markAllDriverNotificationsRead}
        />
      ) : null}

      {portalPath === '/settings' ? (
        <DriverSettingsPage
          onLoadSettings={loadDriverSettings}
          onUpdateSettings={updateDriverSettings}
          onLoadProfile={loadProfile}
          onUpdateProfile={updateProfile}
        />
      ) : null}

      {portalPath !== '/dashboard' &&
      portalPath !== '/profile' &&
      portalPath !== '/vehicles' &&
      portalPath !== '/violations' &&
      portalPath !== '/fines' &&
      portalPath !== '/fines/payments' &&
      portalPath !== '/appeals' &&
      portalPath !== '/notifications' &&
      portalPath !== '/settings' ? (
        <Card title={portalPath.replace('/', '') || 'Driver'} subtitle="Feature coming in a later task">
          <p>
            Route: <strong>{location.pathname}</strong>
          </p>
        </Card>
      ) : null}
    </DriverLayout>
  );
}

export default App;
