import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  Shield, Users, Camera, BarChart3,
  Mail, Lock, Eye, EyeOff, LogIn, AlertCircle,
  KeyRound, ClipboardList, Activity, LockKeyhole,
} from 'lucide-react';
import { AuthPageBackground } from '@shared/components/auth/AuthPageBackground';
import { CamTrafficLogo } from '@shared/components/layout/CamTrafficLogo';
import { useAuth } from '@shared/context/AuthContext';
import { getUserDevUrl } from '@shared/utils/portal';
import { isRememberMeEnabled } from '@shared/utils/authStorage';
import { toast } from 'sonner';
import { LOGIN_ERRORS } from '@shared/utils/loginErrors';

const ADMIN_FEATURES = [
  { Icon: Users, text: 'User, role & access management' },
  { Icon: Camera, text: 'Camera fleet & enforcement policy' },
  { Icon: Shield, text: 'Audit trails & compliance oversight' },
  { Icon: BarChart3, text: 'City-wide analytics & reporting' },
];

const STAT_CHIPS = [
  { value: 'RBAC', label: 'Role-based access', Icon: KeyRound },
  { value: 'Audit', label: 'Action logging', Icon: ClipboardList },
  { value: 'Live', label: 'Operations desk', Icon: Activity },
];

export function AdminLoginPage() {
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
    document.title = 'Admin sign-in · CamTraffic';
  }, []);

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
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    setLoading(true);
    try {
      await login(trimmed, password, { portal: 'admin' }, remember);
      toast.success('Welcome to the governance console.');
      navigate('/admin/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : LOGIN_ERRORS.invalidCredentials;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="up-page ap-page">
      <AuthPageBackground variant="admin" />
      <div className="up-overlay ap-overlay" />

      <div className="up-inner">
        <div className="up-hero">
          <div className="up-badge ap-badge">
            <CamTrafficLogo size={32} className="up-badge-logo" alt="Norton University" />
            <span>Administrator Portal</span>
          </div>
          <h1 className="up-headline ap-headline">
            Traffic<br />
            <em>Governance Console</em>
          </h1>
          <p className="up-tagline ap-tagline">
            Restricted access for city administrators: manage the enforcement network,
            review violations and fines, and keep the public portal separate from staff tools.
          </p>

          <div className="ap-stat-row">
            {STAT_CHIPS.map(({ value, label, Icon }) => (
              <div className="ap-stat-chip" key={label}>
                <Icon size={16} className="ap-stat-icon" strokeWidth={2.25} />
                <span className="ap-stat-value">{value}</span>
                <span className="ap-stat-label">{label}</span>
              </div>
            ))}
          </div>

          <ul className="up-features ap-features">
            {ADMIN_FEATURES.map(({ Icon, text }) => (
              <li key={text}>
                <span className="ap-feature-icon" aria-hidden>
                  <Icon size={14} strokeWidth={2.25} />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>

          <div className="up-footer ap-footer">
            <span className="ap-status-dot" />
            All systems operational · © {new Date().getFullYear()} CamTraffic
          </div>
        </div>

        <div className="up-card-wrap">
          <div className="up-card ap-card">
            <div className="ap-card-header">
              <div className="ap-card-icon">
                <LockKeyhole size={24} />
              </div>
              <h2 className="ap-card-title">Administrator sign-in</h2>
              <p className="ap-card-sub">
                Use credentials issued by your city IT team.
                <br />
                Public self-registration is not available on this portal.
              </p>
            </div>

            <hr className="ap-divider" />

            {error && (
              <div className="err-alert mb-3">
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label htmlFor="admin-email" className="field-label">Email address</label>
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
                  <label htmlFor="admin-password" className="field-label mb-0">Password</label>
                  <Link to="/forgot-password" className="forgot-link" style={{ fontSize: '.85rem' }}>
                    Forgot password?
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
                    tabIndex={-1}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
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
                  Remember me on this device
                </label>
              </div>

              <button type="submit" className="btn-submit btn-submit--admin" disabled={loading}>
                {loading ? (
                  <span>Signing in…</span>
                ) : (
                  <>
                    <LogIn size={18} />
                    <span>Sign in to console</span>
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
