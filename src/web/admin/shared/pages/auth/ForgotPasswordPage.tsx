import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Mail, ArrowLeft, Send, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { AuthPageBackground } from '@shared/components/auth/AuthPageBackground';
import { authAPI } from '@shared/services/api';
import { toast } from 'sonner';

const RESEND_COOLDOWN_SEC = 60;

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    document.title = 'Forgot password · CamTraffic';
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const sendReset = async (isResend = false) => {
    setError('');
    setNotice('');
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const result = await authAPI.requestPasswordReset(trimmed);
      const message = result?.message?.trim()
        || (isResend
          ? `Reset link sent again to ${trimmed}.`
          : `Reset link sent to ${trimmed}. Check your inbox.`);
      setSent(true);
      setCooldown(RESEND_COOLDOWN_SEC);
      setNotice(message);
      toast.success(message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not send reset email. Try again.';
      setError(msg);
      if (isResend) toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="up-page up-page--user">
      <AuthPageBackground />
      <div className="up-overlay" />
      <div className="up-inner" style={{ justifyContent: 'center' }}>
        <div className="up-hero" style={{ maxWidth: 480 }}>
          <div className="up-badge">
            <Mail size={14} className="up-badge-icon" aria-hidden />
            <span>Password recovery</span>
          </div>
          <h1 className="up-headline">
            Forgot your<br />
            <em>password?</em>
          </h1>
          <p className="up-tagline">
            Enter the email registered on your CamTraffic account. We will send a reset link to that inbox.
          </p>
          <div className="fp-steps">
            <div className={`fp-step ${!sent ? 'fp-step-active' : 'fp-step-done'}`}>
              <span className="fp-step-num">1</span>
              Request link
            </div>
            <div className={`fp-step ${sent ? 'fp-step-active' : ''}`}>
              <span className="fp-step-num">2</span>
              Check email
            </div>
          </div>
        </div>

        <div className="up-card-wrap">
          <div className="up-card">
            {!sent ? (
              <>
                <h2 className="up-card-title">Reset password</h2>
                <p className="up-card-sub">A secure reset link will be sent to the email address you enter below.</p>

                {error && (
                  <div className="err-alert mb-3">
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{error}</span>
                  </div>
                )}
                {notice && (
                  <div className="deleted-alert mb-3">
                    <CheckCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{notice}</span>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendReset(false);
                  }}
                  noValidate
                >
                  <div className="mb-3">
                    <label htmlFor="reset-email" className="field-label">Email address</label>
                    <div className={`lf-field ${error ? 'lf-err' : ''}`}>
                      <Mail size={16} className="lf-icon" />
                      <input
                        id="reset-email"
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

                  <button type="submit" className="btn-submit" disabled={loading}>
                    {loading ? (
                      <span>Sending…</span>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>Send reset link</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="fp-success">
                <div className="fp-success-icon">
                  <CheckCircle size={36} />
                </div>
                <h2>Check your email</h2>
                <p>
                  We sent a password reset link to <strong>{email}</strong>.
                  Open that email and click the link to set a new password. Check spam if you do not see it.
                </p>
                <button
                  type="button"
                  className="btn-submit fp-resend-btn"
                  disabled={loading || cooldown > 0}
                  onClick={() => sendReset(true)}
                >
                  {loading ? (
                    <span>Sending…</span>
                  ) : cooldown > 0 ? (
                    <>
                      <RefreshCw size={18} />
                      <span>Resend in {cooldown}s</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={18} />
                      <span>Resend email</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <p className="up-register-line mt-3">
              <Link to="/" state={{ clearLogin: true }} className="forgot-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}>
                <ArrowLeft size={16} />
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
