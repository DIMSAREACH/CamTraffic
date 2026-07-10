import { useMemo, useState, type FormEvent } from 'react';
import { Button, Card, Input, Checkbox, LocaleToggle, ThemeToggle, useTranslation } from '@camtraffic/ui';

interface LoginFormProps {
  onSubmit: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  onForgotPassword: () => void;
  isLoading: boolean;
  errorMessage: string | null;
}

export function LoginForm({ onSubmit, onForgotPassword, isLoading, errorMessage }: LoginFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);

  const emailError = useMemo(() => {
    if (!touched) return '';
    if (!email.trim()) return t.validation?.required || 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return t.validation?.invalidEmail || 'Invalid email format.';
    return '';
  }, [email, touched, t]);

  const passwordError = useMemo(() => {
    if (!touched) return '';
    if (!password.trim()) return t.validation?.required || 'Password is required.';
    if (password.length < 6) return t.validation?.minLength?.replace('{min}', '6') || 'Password must be at least 6 characters.';
    return '';
  }, [password, touched, t]);

  const hasErrors = Boolean(emailError || passwordError);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (hasErrors) return;
    await onSubmit(email.trim(), password, rememberMe);
  }

  return (
    <main className="user-auth-page">
      {/* Split-screen layout: Welcome panel + Login panel */}
      
      {/* Welcome panel (left side on desktop) */}
      <section className="user-auth-page__welcome" aria-labelledby="welcome-heading">
        <div className="user-auth-page__welcome-content">
          <svg 
            className="user-auth-page__icon" 
            viewBox="0 0 48 48" 
            fill="none" 
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M24 4L6 14v10c0 11 5 21 18 28 13-7 18-17 18-28V14L24 4z"/>
            <circle cx="24" cy="24" r="8"/>
          </svg>

          <h1 id="welcome-heading" className="user-auth-page__welcome-title">
            {t.common.appName}
          </h1>
          
          <p className="user-auth-page__welcome-subtitle">
            {t.portal?.subtitle || 'Traffic Law Enforcement Portal'}
          </p>

          {/* Role-aware welcome messaging */}
          <div className="user-auth-page__role-cards">
            <div className="user-auth-page__role-card">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <h3>{t.auth?.officerPortal || 'Traffic Officers'}</h3>
              <p>{t.auth?.officerWelcome || 'Manage violations, review detections, and enforce traffic laws.'}</p>
            </div>
            
            <div className="user-auth-page__role-card">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
              <h3>{t.auth?.driverPortal || 'Drivers & Citizens'}</h3>
              <p>{t.auth?.driverWelcome || 'Check violations, submit appeals, and stay informed.'}</p>
            </div>
          </div>

          <footer className="user-auth-page__welcome-footer">
            <p>© {new Date().getFullYear()} CamTraffic • Ministry of Public Works and Transport</p>
          </footer>
        </div>
      </section>

      {/* Login panel (right side on desktop) */}
      <section className="user-auth-page__form-panel">
        {/* Theme/Locale controls */}
        <div className="user-auth-page__controls">
          <LocaleToggle />
          <ThemeToggle />
        </div>

        <div className="user-auth-page__form-container">
          <header className="user-auth-page__form-header">
            <h2>{t.auth.login}</h2>
            <p>{t.auth?.loginSubtitle || 'Access your account'}</p>
          </header>

          <form className="user-auth-form" onSubmit={handleSubmit} noValidate>
            <Input
              type="email"
              name="email"
              label={t.auth.email}
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={emailError || undefined}
              required
              aria-describedby={emailError ? 'email-error' : undefined}
            />
            
            <div className="user-auth-form__password-field">
              <Input
                type={showPassword ? 'text' : 'password'}
                name="password"
                label={t.auth.password}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                error={passwordError || undefined}
                required
                aria-describedby={passwordError ? 'password-error' : undefined}
              />
              <button
                type="button"
                className="user-auth-form__password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor">
                  {showPassword ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </>
                  )}
                </svg>
              </button>
            </div>

            <div className="user-auth-form__options">
              <Checkbox
                label={t.auth?.rememberMe || 'Remember me'}
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <button 
                type="button" 
                className="user-auth-form__link" 
                onClick={onForgotPassword}
              >
                {t.auth.forgotPassword}
              </button>
            </div>

            {errorMessage ? (
              <div className="user-auth-form__error" role="alert" aria-live="polite">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {errorMessage}
              </div>
            ) : null}

            <Button 
              type="submit" 
              isLoading={isLoading} 
              disabled={hasErrors}
              className="user-auth-form__submit"
            >
              {isLoading ? t.common?.loading || 'Loading...' : t.auth.login}
            </Button>
          </form>

          <div className="user-auth-page__help">
            <p>{t.auth?.noAccount || "Don't have an account?"} <a href="/register">{t.auth?.signUp || 'Sign up'}</a></p>
          </div>
        </div>
      </section>
    </main>
  );
}
