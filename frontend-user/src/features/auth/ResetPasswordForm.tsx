import { useMemo, useState, type FormEvent } from 'react';
import { Button, Card, Input, LocaleToggle, ThemeToggle, useTranslation } from '@camtraffic/ui';

interface ResetPasswordFormProps {
  onSubmit: (newPassword: string) => Promise<void>;
  onBackToLogin: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null;
}

export function ResetPasswordForm({
  onSubmit,
  onBackToLogin,
  isLoading,
  errorMessage,
  successMessage,
}: ResetPasswordFormProps) {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState(false);

  const newPasswordError = useMemo(() => {
    if (!touched) return '';
    if (!newPassword.trim()) return t.auth.newPasswordRequired;
    if (newPassword.length < 8) return t.auth.passwordMinLength;
    return '';
  }, [newPassword, t, touched]);

  const confirmPasswordError = useMemo(() => {
    if (!touched) return '';
    if (!confirmPassword.trim()) return t.auth.confirmPasswordRequired;
    if (confirmPassword !== newPassword) return t.auth.passwordMismatch;
    return '';
  }, [confirmPassword, newPassword, t, touched]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (newPasswordError || confirmPasswordError) return;
    await onSubmit(newPassword);
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

      <Card title={t.auth.resetPasswordTitle} subtitle="Task 018 - Reset Password">
        {successMessage ? (
          <div className="auth-form">
            <p className="auth-form__success">{successMessage}</p>
            <Button type="button" variant="secondary" onClick={onBackToLogin}>
              {t.auth.backToLogin}
            </Button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <p className="auth-form__hint">{t.auth.resetPasswordInstructions}</p>
            <Input
              type="password"
              name="new_password"
              label={t.auth.newPassword}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              error={newPasswordError || undefined}
              required
            />
            <Input
              type="password"
              name="confirm_password"
              label={t.auth.confirmPassword}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              error={confirmPasswordError || undefined}
              required
            />

            {errorMessage ? <p className="auth-form__error">{errorMessage}</p> : null}

            <Button type="submit" isLoading={isLoading}>
              {t.auth.resetPassword}
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
