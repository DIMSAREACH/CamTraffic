import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import {
  Camera, Cpu, CreditCard, BarChart3, Bell, Shield, Users,
  Car, BadgeCheck, Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, CircleCheck,
  KeyRound, ClipboardList, Activity,
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { AuthFeatureList } from '@shared/components/auth/AuthFeatureList';
import { SocialLoginButtons } from '@shared/components/auth/SocialLoginButtons';
import { AuthThemeToggle } from '@shared/components/AuthThemeToggle';
import { getAdminDevUrl, getUserDevUrl } from '@shared/utils/portal';
import { getSavedLoginEmail, isRememberMeEnabled } from '@shared/utils/authStorage';

type LoginLocationState = { email?: string; registered?: boolean };
const IS_ADMIN_SURFACE = import.meta.env.VITE_PORTAL_SURFACE === 'admin';

const USER_FEATURES = [
  { Icon: Camera, text: 'Real-time camera surveillance' },
  { Icon: Cpu, text: 'AI-driven violation detection' },
  { Icon: CreditCard, text: 'Automated licence plate recognition' },
  { Icon: BarChart3, text: 'Analytics & reporting dashboard' },
  { Icon: Bell, text: 'Instant violation alerts & fines' },
];

const ADMIN_FEATURES = [
  { Icon: Users, text: 'User, role & access management' },
  { Icon: Camera, text: 'Camera fleet & enforcement policy' },
  { Icon: Shield, text: 'Audit trails & compliance oversight' },
  { Icon: BarChart3, text: 'City-wide analytics & reporting' },
];

type RoleTab = 'police' | 'driver';

export function LoginPage() {
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
    document.title = portalAdmin ? 'Admin sign-in · CamTraffic' : 'Sign in · CamTraffic';
  }, [portalAdmin]);

  useEffect(() => {
    const state = location.state as LoginLocationState | null;
    if (!state?.registered && !state?.email) return;
    if (state.email) setEmail(state.email);
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
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
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
      setError(err instanceof Error ? err.message : 'Invalid email or password. Please try again.');
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
          <label htmlFor={`${idPrefix}-email`} className="field-label">Email address</label>
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
            <label htmlFor={`${idPrefix}-password`} className="field-label mb-0">Password</label>
            <Link to="/forgot-password" className="forgot-link" style={{ fontSize: '.85rem' }}>
              Forgot password?
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
            Remember me
          </label>
        </div>

        <button
          type="submit"
          className={`btn-submit ${adminStyle ? 'btn-submit--admin' : ''} ${loginSuccess ? 'btn-submit--success' : ''}`}
          disabled={loading || loginSuccess}
          style={{ marginTop: '.5rem' }}
        >
          {loading ? (
            <span>Signing in…</span>
          ) : loginSuccess ? (
            <>
              <CircleCheck size={18} />
              <span>Welcome back!</span>
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
        <div className="up-bg ap-bg" />
        <div className="up-overlay ap-overlay" />
        <div className="up-inner">
          <div className="up-hero">
            <div className="up-badge ap-badge">
              <Shield size={14} />
              <span>Administrator Portal</span>
            </div>
            <h1 className="up-headline ap-headline">
              Traffic<br />
              <em>Governance</em>
              <br />
              <em>Console</em>
            </h1>
            <p className="up-tagline ap-tagline">
              Restricted access for city administrators: manage the enforcement network,
              review violations and fines, and keep the public portal separate from staff tools.
            </p>
            <div className="ap-stat-row">
              {[
                { value: 'RBAC', label: 'Role-based access', Icon: KeyRound },
                { value: 'Audit', label: 'Action logging', Icon: ClipboardList },
                { value: 'Live', label: 'Operations desk', Icon: Activity },
              ].map(({ value, label, Icon }) => (
                <div className="ap-stat-chip" key={label}>
                  <Icon size={14} className="ap-stat-icon" />
                  <span className="ap-stat-value">{value}</span>
                  <span className="ap-stat-label">{label}</span>
                </div>
              ))}
            </div>
            <ul className="up-features ap-features">
              {ADMIN_FEATURES.map(({ Icon, text }) => (
                <li key={text}>
                  <Icon size={14} />
                  {text}
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
                  <Shield size={24} />
                </div>
                <h2 className="ap-card-title">Administrator sign-in</h2>
                <p className="ap-card-sub">
                  Use credentials issued by your city IT team.
                  <br />
                  Public self-registration is not available here.
                </p>
              </div>
              <hr className="ap-divider" />
              {formFields('admin', 'Sign In', true)}
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
                  {IS_ADMIN_SURFACE ? '← Open driver / officer portal' : '← Back to driver / officer sign-in'}
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
      <div className="up-bg" />
      <div className="up-overlay" />
      <div className="up-inner">
        <div className="up-hero">
          <div className="up-badge">
            <Camera size={14} className="up-badge-icon" aria-hidden />
            <span>CamTraffic · Cambodia</span>
          </div>
          <h1 className="up-headline">
            Manage Your Traffic<br />
            <em>Cases Seamlessly</em>
          </h1>
          <p className="up-tagline">
            Access violations, pay fines, and track your cases in one unified platform.
            Designed for both drivers and enforcement officers.
          </p>
          <AuthFeatureList items={USER_FEATURES} />
          <div className="up-footer">
            <span className="up-status-dot" />
            All systems operational · © {new Date().getFullYear()} CamTraffic
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
                Officer
              </button>
              <button
                type="button"
                className={`up-tab ${activeRole === 'driver' ? 'up-tab--active' : ''}`}
                onClick={() => switchRole('driver')}
              >
                <Car size={18} />
                Driver
              </button>
            </div>

            <h2 className="up-card-title">
              {activeRole === 'police' ? 'Officer Access' : 'Driver Access'}
            </h2>
            <p className="up-card-sub">
              {activeRole === 'police'
                ? 'Enter your credentials to access the enforcement portal.'
                : 'Enter your credentials to access the driver portal.'}
            </p>

            {formFields(
              activeRole,
              `Login as ${activeRole === 'police' ? 'Officer' : 'Driver'}`,
              false,
              true,
            )}

            <p className="up-register-line">
              First time here? <Link to="/register">Create an account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
