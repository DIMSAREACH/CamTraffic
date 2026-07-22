import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  Shield, Users, Camera, BarChart3,
  Mail, Lock, Eye, EyeOff, LogIn, AlertCircle,
  KeyRound, ClipboardList, Activity, LockKeyhole,
} from 'lucide-react';
import { AuthPageBackground } from '@shared/components/auth/AuthPageBackground';
import { AuthPageControls } from '@shared/components/auth/AuthPageControls';
import { CamTrafficLogo } from '@shared/components/layout/CamTrafficLogo';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { isRememberMeEnabled } from '@shared/utils/authStorage';
import { toast } from 'sonner';
import { LOGIN_ERRORS } from '@shared/utils/loginErrors';

const ADMIN_FEATURE_KEYS = ['auth.featAdmin1', 'auth.featAdmin2', 'auth.featAdmin3', 'auth.featAdmin4'] as const;
const ADMIN_FEATURE_ICONS = [Users, Camera, Shield, BarChart3] as const;

export function AdminLoginPage() {
  const { t } = useLanguage();
  const { login, logout, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => isRememberMeEnabled());
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = t('auth.docTitleAdmin');
  }, [t]);

  useEffect(() => {
    const state = location.state as { clearLogin?: boolean } | null;
    if (!state?.clearLogin) return;
    setEmail('');
    setPassword('');
    setRemember(false);
    setShowPass(false);
    setError('');
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (!isLoading && user?.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    }
    if (!isLoading && user && user.role !== 'admin') {
      logout();
    }
  }, [user, isLoading, navigate, logout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (!trimmed) {
      setError(t('auth.enterEmail'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(t('auth.validEmail'));
      return;
    }
    if (!password) {
      setError(t('auth.enterPassword'));
      return;
    }
    setLoading(true);
    try {
      await login(trimmed, password, { portal: 'admin' }, remember);
      toast.success(t('auth.welcomeGovernance'));
      navigate('/admin/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : LOGIN_ERRORS.invalidCredentials;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return null;

  const statChips = [
    { value: 'RBAC', label: t('auth.statRbac'), Icon: KeyRound },
    { value: 'Audit', label: t('auth.statAudit'), Icon: ClipboardList },
    { value: 'Live', label: t('auth.statLive'), Icon: Activity },
  ];

  return (
    <div className="up-page ap-page">
      <AuthPageControls />
      <AuthPageBackground variant="admin" />
      <div className="up-overlay ap-overlay" />

      <div className="up-inner">
        <div className="up-hero">
          <div className="up-badge ap-badge">
            <CamTrafficLogo size={32} className="up-badge-logo" alt="Norton University" />
            <span>{t('auth.adminPortal')}</span>
          </div>
          <h1 className="up-headline ap-headline">{t('auth.adminHeadline')}</h1>
          <p className="up-tagline ap-tagline">{t('auth.adminTagline')}</p>

          <div className="ap-stat-row">
            {statChips.map(({ value, label, Icon }) => (
              <div className="ap-stat-chip" key={label}>
                <Icon size={16} className="ap-stat-icon" strokeWidth={2.25} />
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
                  <span className="ap-feature-icon" aria-hidden>
                    <Icon size={14} strokeWidth={2.25} />
                  </span>
                  <span>{t(key)}</span>
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
                <LockKeyhole size={24} />
              </div>
              <h2 className="ap-card-title">{t('auth.adminSignInTitle')}</h2>
              <p className="ap-card-sub">{t('auth.adminSignInSub')}</p>
            </div>

            <hr className="ap-divider" />

            {error && (
              <div className="err-alert mb-3" role="alert">
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label htmlFor="admin-email" className="field-label">{t('auth.email')}</label>
                <div className={`lf-field ${error ? 'lf-err' : ''}`}>
                  <Mail size={16} className="lf-icon" />
                  <input
                    id="admin-email"
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
                  <label htmlFor="admin-password" className="field-label mb-0">{t('auth.password')}</label>
                  <Link to="/forgot-password" className="forgot-link" style={{ fontSize: '.85rem' }}>
                    {t('auth.forgotPassword')}
                  </Link>
                </div>
                <div className={`lf-field ${error ? 'lf-err' : ''}`}>
                  <Lock size={16} className="lf-icon" />
                  <input
                    id="admin-password"
                    type={showPass ? 'text' : 'password'}
                    className="lf-input lf-input-pwd"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="lf-eye"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? t('auth.hidePassword') : t('auth.showPassword')}
                  >
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
                  {t('auth.rememberDevice')}
                </label>
              </div>

              <button type="submit" className="btn-submit btn-submit--admin" disabled={loading}>
                {loading ? (
                  <span>{t('auth.signingIn')}</span>
                ) : (
                  <>
                    <LogIn size={18} />
                    <span>{t('auth.signInToConsole')}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
