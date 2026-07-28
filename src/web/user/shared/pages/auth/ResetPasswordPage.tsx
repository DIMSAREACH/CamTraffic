import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Lock, Eye, EyeOff, KeyRound, CheckCircle, AlertCircle } from 'lucide-react';
import { AuthPageBackground } from '@shared/components/auth/AuthPageBackground';
import { AuthPageControls } from '@shared/components/auth/AuthPageControls';
import { authAPI } from '@shared/services/api';
import { useLanguage } from '@shared/context/LanguageContext';
import { isStrongPassword, getPasswordValidationError, PASSWORD_REQUIREMENTS } from '@shared/utils/passwordPolicy';
import { toast } from 'sonner';

export function ResetPasswordPage() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const uid = searchParams.get('uid') ?? '';
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const linkInvalid = !uid || !token;

  useEffect(() => {
    document.title = 'New password · CamTraffic';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const pwdError = getPasswordValidationError(password);
    if (pwdError) {
      setError(pwdError);
      return;
    }
    if (!isStrongPassword(password)) {
      setError('Password must meet all strength requirements.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authAPI.confirmPasswordReset(uid, token, password);
      setDone(true);
      toast.success('Password updated. You can sign in now.');
      window.setTimeout(() => navigate('/', { replace: true }), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="up-page up-page--user">
      <AuthPageControls />
      <AuthPageBackground />
      <div className="up-overlay" />
      <div className="up-inner" style={{ justifyContent: 'center' }}>
        <div className="up-hero" style={{ maxWidth: 420 }}>
          <div className="up-badge">
            <KeyRound size={14} className="up-badge-icon" aria-hidden />
            <span>Set new password</span>
          </div>
          <h1 className="up-headline">
            Choose a<br />
            <em>new password</em>
          </h1>
          <p className="up-tagline">
            Use a strong password you have not used elsewhere. This link works once and expires after a short time.
          </p>
        </div>

        <div className="up-card-wrap">
          <div className="up-card">
            {linkInvalid ? (
              <>
                <h2 className="up-card-title">Invalid link</h2>
                <p className="up-card-sub">
                  This reset link is missing information. Request a new one from the forgot password page.
                </p>
                <Link
                  to="/forgot-password"
                  className="btn-submit"
                  style={{ display: 'inline-flex', textDecoration: 'none', marginTop: '1rem' }}
                >
                  Request new link
                </Link>
              </>
            ) : done ? (
              <div className="fp-success">
                <div className="fp-success-icon">
                  <CheckCircle size={36} />
                </div>
                <h2>Password updated</h2>
                <p>Redirecting you to sign in…</p>
              </div>
            ) : (
              <>
                <h2 className="up-card-title">New password</h2>
                <p className="up-card-sub">Enter and confirm your new password.</p>

                {error && (
                  <div className="err-alert mb-3">
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="mb-3">
                    <label htmlFor="new-password" className="field-label">New password</label>
                    <div className={`lf-field ${error ? 'lf-err' : ''}`}>
                      <Lock size={16} className="lf-icon" />
                      <input
                        id="new-password"
                        type={showPwd ? 'text' : 'password'}
                        className="lf-input lf-input-pwd"
                        placeholder="Min 8 chars, upper, number, symbol"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        className="lf-eye"
                        onClick={() => setShowPwd((v) => !v)}
                        aria-label={showPwd ? t('auth.hidePassword') : t('auth.showPassword')}
                      >
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  {password.length > 0 && (
                    <ul className="mb-3 text-xs text-slate-500 space-y-1">
                      {PASSWORD_REQUIREMENTS.map((r) => (
                        <li key={r.key} style={{ color: r.test(password) ? '#059669' : '#94a3b8' }}>
                          {r.test(password) ? '✓' : '○'} {r.label}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mb-3">
                    <label htmlFor="confirm-password" className="field-label">Confirm password</label>
                    <div className={`lf-field ${error ? 'lf-err' : ''}`}>
                      <Lock size={16} className="lf-icon" />
                      <input
                        id="confirm-password"
                        type={showConfirm ? 'text' : 'password'}
                        className="lf-input lf-input-pwd"
                        placeholder="Repeat password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        className="lf-eye"
                        onClick={() => setShowConfirm((v) => !v)}
                        aria-label={showConfirm ? t('auth.hidePassword') : t('auth.showPassword')}
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="btn-submit" disabled={loading}>
                    {loading ? 'Saving…' : 'Update password'}
                  </button>
                </form>
              </>
            )}

            {!done && (
              <p className="up-register-line mt-3">
                <Link to="/" state={{ clearLogin: true }} className="forgot-link">Back to sign in</Link>
                {' · '}
                <Link to="/forgot-password" className="forgot-link">Request new link</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
