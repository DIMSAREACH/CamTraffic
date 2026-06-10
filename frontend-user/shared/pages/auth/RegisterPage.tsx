import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Camera, Shield, BarChart3, Bell, Mail, Lock, User, Phone, MapPin,
  CreditCard, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle, Circle,
} from 'lucide-react';
import { authAPI } from '@shared/services/api';
import { AuthPageBackground } from '@shared/components/auth/AuthPageBackground';
import { AuthFeatureList } from '@shared/components/auth/AuthFeatureList';
import { CamTrafficLogo } from '@shared/components/layout/CamTrafficLogo';
import { AuthThemeToggle } from '@shared/components/AuthThemeToggle';
import { toast } from 'sonner';
import {
  PASSWORD_REQUIREMENTS,
  STRENGTH_META,
  calcPasswordStrength,
  isStrongPassword,
} from '@shared/utils/passwordPolicy';

const REGISTER_FEATURES = [
  { Icon: UserPlus, text: 'Fast driver account setup' },
  { Icon: Shield, text: 'Secure sign-up & data protection' },
  { Icon: Camera, text: 'Real-time camera surveillance' },
  { Icon: BarChart3, text: 'Analytics & reporting dashboard' },
  { Icon: Bell, text: 'Violation alerts & fine reminders' },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdFocus, setPwdFocus] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    license_no: '',
  });

  const set = (name: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [name]: e.target.value }));

  const strength = useMemo(() => calcPasswordStrength(form.password), [form.password]);
  const meta = STRENGTH_META[strength];
  const reqs = useMemo(
    () => PASSWORD_REQUIREMENTS.map((r) => ({ ...r, ok: r.test(form.password) })),
    [form.password],
  );
  const pwdMatch = confirm.length > 0 && form.password === confirm;

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setErrMsg('Full name is required.');
      triggerShake();
      return;
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setErrMsg('Please enter a valid email address.');
      triggerShake();
      return;
    }
    if (!form.password) {
      setErrMsg('Password is required.');
      triggerShake();
      return;
    }
    if (!isStrongPassword(form.password)) {
      setErrMsg('Password must meet all strength requirements below.');
      triggerShake();
      return;
    }
    if (!confirm) {
      setErrMsg('Please confirm your password.');
      triggerShake();
      return;
    }
    if (form.password !== confirm) {
      setErrMsg('Passwords do not match. Please try again.');
      triggerShake();
      return;
    }

    setErrMsg('');
    setLoading(true);
    try {
      await authAPI.register({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        password_confirm: confirm,
        phone: form.phone,
        address: form.address,
        license_no: form.license_no,
      });
      toast.success('Account created. Please sign in to continue.');
      navigate('/', {
        replace: true,
        state: { email: form.email.trim(), registered: true },
      });
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : 'Registration failed. Please try again.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="up-page up-page--user">
      <AuthThemeToggle />
      <AuthPageBackground />
      <div className="up-overlay" />

      <div className="up-inner">
        <div className="up-hero">
          <div className="up-badge">
            <CamTrafficLogo size={32} className="up-badge-logo" alt="Norton University" />
            <span>CamTraffic · Cambodia</span>
          </div>
          <h1 className="up-headline">
            Join the Traffic<br />
            <em>Safety Platform</em>
          </h1>
          <p className="up-tagline">
            Create your driver account to access violations, pay fines, and track your cases
            in one unified platform — built for drivers across Cambodia.
          </p>
          <AuthFeatureList items={REGISTER_FEATURES} />
          <div className="up-footer">
            <span className="up-status-dot" />
            All systems operational · © {new Date().getFullYear()} CamTraffic
          </div>
        </div>

        <div className="up-card-wrap up-card-wrap--wide">
          <div className="up-card">
            <h2 className="up-card-title">Create account</h2>
            <p className="up-card-sub">Fill in the details below to get started as a driver</p>

            {errMsg && (
              <div className={`err-alert mb-3 ${shake ? 'shake' : ''}`}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div>
                  <label className="field-label">
                    Full name <span style={{ color: 'var(--auth-purple)' }}>*</span>
                  </label>
                  <div className="input-field">
                    <User size={16} className="field-icon" />
                    <input
                      type="text"
                      className="field-input"
                      placeholder="Full name"
                      value={form.full_name}
                      onChange={set('full_name')}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <label className="field-label">
                      Email <span style={{ color: 'var(--auth-purple)' }}>*</span>
                    </label>
                    <div className="input-field">
                      <Mail size={16} className="field-icon" />
                      <input
                        type="email"
                        className="field-input"
                        placeholder="Email address"
                        value={form.email}
                        onChange={set('email')}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="field-label">Phone number</label>
                    <div className="input-field">
                      <Phone size={16} className="field-icon" />
                      <input
                        type="tel"
                        className="field-input"
                        placeholder="Phone number"
                        value={form.phone}
                        onChange={set('phone')}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="field-label">
                    Password <span style={{ color: 'var(--auth-purple)' }}>*</span>
                  </label>
                  <div className={`input-field${strength > 0 && !isStrongPassword(form.password) ? ' pwd-weak' : ''}`}>
                    <Lock size={16} className="field-icon" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      className="field-input"
                      placeholder="Create a strong password"
                      value={form.password}
                      onChange={set('password')}
                      onFocus={() => setPwdFocus(true)}
                      onBlur={() => setPwdFocus(false)}
                      required
                    />
                    <button type="button" className="pwd-toggle" onClick={() => setShowPwd(!showPwd)}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {form.password.length > 0 && (
                    <div className="pwd-strength-wrap">
                      <div className="pwd-strength-bars">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="pwd-strength-bar"
                            style={{ background: i <= strength ? meta.color : '#e8e0ff' }}
                          />
                        ))}
                      </div>
                      <span className="pwd-strength-label" style={{ color: meta.color }}>
                        {meta.label}
                      </span>
                    </div>
                  )}
                  {(pwdFocus || form.password.length > 0) && (
                    <ul className="pwd-req-list">
                      {reqs.map((r) => (
                        <li key={r.key} className={r.ok ? 'req-ok' : 'req-pending'}>
                          {r.ok ? <CheckCircle size={14} /> : <Circle size={14} />}
                          {r.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <label className="field-label">
                    Confirm password <span style={{ color: 'var(--auth-purple)' }}>*</span>
                  </label>
                  <div
                    className={`input-field${confirm.length > 0 ? (pwdMatch ? ' pwd-match' : ' pwd-mismatch') : ''}`}
                  >
                    <Lock size={16} className="field-icon" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      className="field-input"
                      placeholder="Re-enter your password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                    />
                    <button type="button" className="pwd-toggle" onClick={() => setShowConfirm((v) => !v)}>
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    {confirm.length > 0 && (
                      <span className="confirm-badge">
                        {pwdMatch ? (
                          <CheckCircle size={16} style={{ color: '#22c55e' }} />
                        ) : (
                          <AlertCircle size={16} style={{ color: '#ef4444' }} />
                        )}
                      </span>
                    )}
                  </div>
                  {confirm.length > 0 && (
                    <p className={`confirm-hint ${pwdMatch ? 'confirm-ok' : ''}`}>
                      {pwdMatch ? 'Passwords match ✓' : 'Passwords do not match'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="field-label">Address</label>
                  <div className="input-field">
                    <MapPin size={16} className="field-icon" />
                    <input
                      type="text"
                      className="field-input"
                      placeholder="Street, District, Phnom Penh"
                      value={form.address}
                      onChange={set('address')}
                    />
                  </div>
                </div>

                <div>
                  <label className="field-label">Driver&apos;s license no.</label>
                  <div className="input-field">
                    <CreditCard size={16} className="field-icon" />
                    <input
                      type="text"
                      className="field-input"
                      placeholder="DRV-KH-2024-XXXXXX"
                      value={form.license_no}
                      onChange={set('license_no')}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-submit mt-4" disabled={loading}>
                {loading ? (
                  <span>Creating account…</span>
                ) : (
                  <>
                    <UserPlus size={18} />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </form>

            <p className="up-register-line mt-3">
              Already have an account? <Link to="/">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
