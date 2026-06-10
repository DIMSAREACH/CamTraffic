import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import {
  Camera, Cpu, CreditCard, BarChart3, Bell, Shield, Users,
  Car, BadgeCheck, Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, CircleCheck,
  KeyRound, ClipboardList, Activity,
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { AuthPageBackground } from '@shared/components/auth/AuthPageBackground';
import { AuthFeatureList } from '@shared/components/auth/AuthFeatureList';
import { CamTrafficLogo } from '@shared/components/layout/CamTrafficLogo';
import { SocialLoginButtons } from '@shared/components/auth/SocialLoginButtons';
import { AuthThemeToggle } from '@shared/components/AuthThemeToggle';
import { getAdminDevUrl, getUserDevUrl } from '@shared/utils/portal';
import { getSavedLoginEmail, isRememberMeEnabled } from '@shared/utils/authStorage';
import { useLanguage } from '@shared/context/LanguageContext';

type LoginLocationState = { email?: string; registered?: boolean; clearLogin?: boolean };
const IS_ADMIN_SURFACE = import.meta.env.VITE_PORTAL_SURFACE === 'admin';

const USER_FEATURE_KEYS = ['auth.featUser1', 'auth.featUser2', 'auth.featUser3', 'auth.featUser4', 'auth.featUser5'] as const;
const USER_FEATURE_ICONS = [Camera, Cpu, CreditCard, BarChart3, Bell] as const;
const ADMIN_FEATURE_KEYS = ['auth.featAdmin1', 'auth.featAdmin2', 'auth.featAdmin3', 'auth.featAdmin4'] as const;
const ADMIN_FEATURE_ICONS = [Users, Camera, Shield, BarChart3] as const;

type RoleTab = 'police' | 'driver';

export function LoginPage() {
  const { t } = useLanguage();
  const { login, logout, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [portalAdmin, setPortalAdmin] = useState(IS_ADMIN_SURFACE);
  const [activeRole, setActiveRole] = useState<RoleTab>('police');
  const [email, setEmail] = useState(() => getSavedLoginEmail());
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => isRememberMeEnabled());
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = portalAdmin ? t('auth.docTitleAdmin') : t('auth.docTitleUser');
  }, [portalAdmin, t]);

  useEffect(() => {
    const state = location.state as LoginLocationState | null;
    if (!state?.registered && !state?.email && !state?.clearLogin) return;
    if (state.clearLogin) {
      setEmail('');
      setPassword('');
      setRemember(false);
      setShowPass(false);
      setError('');
      setLoginSuccess(false);
    } else if (state.email) {
      setEmail(state.email);
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (!isLoading && user) {
      if (IS_ADMIN_SURFACE) {
        if (user.role === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          window.location.assign(getUserDevUrl('/dashboard'));
        }
        return;
      }
      if (user.role === 'police' || user.role === 'driver') {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError(t('auth.enterEmail'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t('auth.validEmail'));
      return;
    }
    if (!password) {
      setError(t('auth.enterPassword'));
      return;
    }
    setLoading(true);
    setLoginSuccess(false);
    try {
      const loggedIn = await login(
        email.trim(),
        password,
        portalAdmin || IS_ADMIN_SURFACE
          ? { portal: 'admin' }
          : { portal: 'user', role: activeRole },
        remember,
      );

      setLoading(false);
      setLoginSuccess(true);

      const go = () => {
        if (loggedIn.role === 'admin') {
          if (IS_ADMIN_SURFACE) navigate('/admin/dashboard', { replace: true });
          else window.location.assign(getAdminDevUrl('/admin/dashboard'));
        } else if (IS_ADMIN_SURFACE) {
          window.location.assign(getUserDevUrl('/dashboard'));
        } else {
          navigate('/dashboard', { replace: true });
        }
      };

      window.setTimeout(go, 450);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.invalidCredentials'));
      setLoading(false);
    }
  };

  const switchRole = (role: RoleTab) => {
    setActiveRole(role);
    setError('');
  };

  const formFields = (idPrefix: string, submitLabel: string, adminStyle = false, showSocial = false) => (
    <>
      {error && (
        <div className="err-alert mb-3">
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label htmlFor={`${idPrefix}-email`} className="field-label">{t('auth.email')}</label>
          <div className={`lf-field ${error ? 'lf-err' : ''}`}>
            <Mail size={16} className="lf-icon" />
            <input
              id={`${idPrefix}-email`}
              type="email"
              className="lf-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="mb-3">
          <div className="pw-label-row">
            <label htmlFor={`${idPrefix}-password`} className="field-label mb-0">{t('auth.password')}</label>
            <Link to="/forgot-password" className="forgot-link" style={{ fontSize: '.85rem' }}>
              {t('auth.forgotPassword')}
            </Link>
          </div>
          <div className={`lf-field ${error ? 'lf-err' : ''}`}>
            <Lock size={16} className="lf-icon" />
            <input
              id={`${idPrefix}-password`}
              type={showPass ? 'text' : 'password'}
              className="lf-input lf-input-pwd"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button type="button" className="lf-eye" onClick={() => setShowPass((v) => !v)} tabIndex={-1}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="remember-row">
          <label className="remember-label">
            <input
              type="checkbox"
              className="remember-check"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span className="remember-box">{remember ? '✓' : ''}</span>
            {t('auth.rememberMe')}
          </label>
        </div>

        <button
          type="submit"
          className={`btn-submit ${adminStyle ? 'btn-submit--admin' : ''} ${loginSuccess ? 'btn-submit--success' : ''}`}
          disabled={loading || loginSuccess}
          style={{ marginTop: '.5rem' }}
        >
          {loading ? (
            <span>{t('auth.signingIn')}</span>
          ) : loginSuccess ? (
            <>
              <CircleCheck size={18} />
              <span>{t('auth.welcomeBack')}</span>
            </>
          ) : (
            <>
              <LogIn size={18} />
              <span>{submitLabel}</span>
            </>
          )}
        </button>
      </form>
      {showSocial && <SocialLoginButtons />}
    </>
  );

  if (isLoading) return null;

  if (portalAdmin || IS_ADMIN_SURFACE) {
    return (
      <div className="up-page ap-page">
        <AuthThemeToggle />
        <AuthPageBackground variant="admin" />
        <div className="up-overlay ap-overlay" />
        <div className="up-inner">
          <div className="up-hero">
            <div className="up-badge ap-badge">
              <CamTrafficLogo size={32} className="up-badge-logo" alt="Norton University" />
              <span>{t('auth.adminPortal')}</span>
            </div>
            <h1 className="up-headline ap-headline">
              {t('auth.adminHeadline')}
            </h1>
            <p className="up-tagline ap-tagline">
              {t('auth.adminTagline')}
            </p>
            <div className="ap-stat-row">
              {[
                { value: 'RBAC', label: t('auth.statRbac'), Icon: KeyRound },
                { value: 'Audit', label: t('auth.statAudit'), Icon: ClipboardList },
                { value: 'Live', label: t('auth.statLive'), Icon: Activity },
              ].map(({ value, label, Icon }) => (
                <div className="ap-stat-chip" key={label}>
                  <Icon size={14} className="ap-stat-icon" />
                  <span className="ap-stat-value">{value}</span>
                  <span className="ap-stat-label">{label}</span>
                </div>
              ))}
            </div>
            <ul className="up-features ap-features">
              {ADMIN_FEATURE_KEYS.map((key, i) => {
                const Icon = ADMIN_FEATURE_ICONS[i];
                return (
                  <li key={key}>
                    <Icon size={14} />
                    {t(key)}
                  </li>
                );
              })}
            </ul>
            <div className="up-footer ap-footer">
              <span className="ap-status-dot" />
              {t('auth.systemsOperational')} · © {new Date().getFullYear()} CamTraffic
            </div>
          </div>

          <div className="up-card-wrap">
            <div className="up-card ap-card">
              <div className="ap-card-header">
                <div className="ap-card-icon">
                  <Shield size={24} />
                </div>
                <h2 className="ap-card-title">{t('auth.adminSignInTitle')}</h2>
                <p className="ap-card-sub">
                  {t('auth.adminSignInSub')}
                </p>
              </div>
              <hr className="ap-divider" />
              {formFields('admin', t('auth.signIn'), true)}
              <p className="up-register-line mt-3">
                <button
                  type="button"
                  className="otp-back"
                  onClick={() => {
                    if (IS_ADMIN_SURFACE) {
                      window.location.assign(getUserDevUrl('/'));
                    } else {
                      setPortalAdmin(false);
                      switchRole('police');
                    }
                  }}
                >
                  {IS_ADMIN_SURFACE ? t('auth.openUserPortal') : t('auth.backToUserPortal')}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="up-page up-page--user">
      <AuthThemeToggle />
      <AuthPageBackground />
      <div className="up-overlay" />
      <div className="up-inner">
        <div className="up-hero">
          <div className="up-badge">
            <CamTrafficLogo size={32} className="up-badge-logo" alt="Norton University" />
            <span>{t('auth.userBadge')}</span>
          </div>
          <h1 className="up-headline">
            {t('auth.userHeadline')}
          </h1>
          <p className="up-tagline">
            {t('auth.userTagline')}
          </p>
          <AuthFeatureList items={USER_FEATURE_KEYS.map((key, i) => ({ Icon: USER_FEATURE_ICONS[i], text: t(key) }))} />
          <div className="up-footer">
            <span className="up-status-dot" />
            {t('auth.systemsOperational')} · © {new Date().getFullYear()} CamTraffic
          </div>
        </div>

        <div className="up-card-wrap">
          <div className="up-card">
            <div className="up-tabs">
              <button
                type="button"
                className={`up-tab ${activeRole === 'police' ? 'up-tab--active' : ''}`}
                onClick={() => switchRole('police')}
              >
                <BadgeCheck size={18} />
                {t('auth.officer')}
              </button>
              <button
                type="button"
                className={`up-tab ${activeRole === 'driver' ? 'up-tab--active' : ''}`}
                onClick={() => switchRole('driver')}
              >
                <Car size={18} />
                {t('auth.driver')}
              </button>
            </div>

            <h2 className="up-card-title">
              {activeRole === 'police' ? t('auth.officerAccess') : t('auth.driverAccess')}
            </h2>
            <p className="up-card-sub">
              {activeRole === 'police' ? t('auth.officerAccessDesc') : t('auth.driverAccessDesc')}
            </p>

            {formFields(
              activeRole,
              activeRole === 'police' ? t('auth.loginAsOfficer') : t('auth.loginAsDriver'),
              false,
              true,
            )}

            <p className="up-register-line">
              {t('auth.firstTimeHere')} <Link to="/register">{t('auth.register')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
