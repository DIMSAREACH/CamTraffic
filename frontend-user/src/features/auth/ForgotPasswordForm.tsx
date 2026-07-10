import { useMemo, useState, type FormEvent } from 'react';
import { Button, Card, Input, LocaleToggle, ThemeToggle, useTranslation } from '@camtraffic/ui';

interface ForgotPasswordFormProps {
  onSubmit: (email: string) => Promise<void>;
  onBackToLogin: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null;
}

export function ForgotPasswordForm({
  onSubmit,
  onBackToLogin,
  isLoading,
  errorMessage,
  successMessage,
}: ForgotPasswordFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);

  const emailError = useMemo(() => {
    if (!touched) return '';
    if (!email.trim()) return 'Email is required.';
    return '';
  }, [email, touched]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (emailError) return;
    await onSubmit(email.trim());
  }

  return (
    <main className="auth-page">
      <header className="auth-page__header">
        <h1>{t.common.appName}</h1>
        <p>{t.portal.subtitle}</p>
      </header>

      <div className="auth-page__toolbar">
        <LocaleToggle />
        <ThemeToggle />
      </div>

      <Card title={t.auth.forgotPasswordTitle} subtitle="Task 017 — Forgot Password">
        {successMessage ? (
          <div className="auth-form">
            <p className="auth-form__success">{successMessage}</p>
            <Button type="button" variant="secondary" onClick={onBackToLogin}>
              {t.auth.backToLogin}
            </Button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <p className="auth-form__hint">{t.auth.forgotPasswordInstructions}</p>
            <Input
              type="email"
              name="email"
              label={t.auth.email}
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={emailError || undefined}
              required
            />

            {errorMessage ? <p className="auth-form__error">{errorMessage}</p> : null}

            <Button type="submit" isLoading={isLoading} disabled={Boolean(emailError)}>
              {t.auth.sendResetLink}
            </Button>
            <button type="button" className="auth-form__link" onClick={onBackToLogin}>
              {t.auth.backToLogin}
            </button>
          </form>
        )}
      </Card>
    </main>
  );
}
