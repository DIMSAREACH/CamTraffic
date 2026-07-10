import { useMemo, useState, type FormEvent } from 'react';
import { Button, Card, Input, useTranslation } from '@camtraffic/ui';

interface ChangePasswordFormProps {
  onSubmit: (currentPassword: string, newPassword: string) => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null;
}

export function ChangePasswordForm({
  onSubmit,
  isLoading,
  errorMessage,
  successMessage,
}: ChangePasswordFormProps) {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState(false);

  const currentPasswordError = useMemo(() => {
    if (!touched) return '';
    if (!currentPassword.trim()) return t.auth.currentPasswordRequired;
    return '';
  }, [currentPassword, t, touched]);

  const newPasswordError = useMemo(() => {
    if (!touched) return '';
    if (!newPassword.trim()) return t.auth.newPasswordRequired;
    if (newPassword.length < 8) return t.auth.passwordMinLength;
    if (newPassword === currentPassword) return t.auth.newPasswordMustDiffer;
    return '';
  }, [currentPassword, newPassword, t, touched]);

  const confirmPasswordError = useMemo(() => {
    if (!touched) return '';
    if (!confirmPassword.trim()) return t.auth.confirmPasswordRequired;
    if (confirmPassword !== newPassword) return t.auth.passwordMismatch;
    return '';
  }, [confirmPassword, newPassword, t, touched]);

  const hasErrors = Boolean(currentPasswordError || newPasswordError || confirmPasswordError);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (hasErrors) return;
    await onSubmit(currentPassword, newPassword);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTouched(false);
  }

  return (
    <Card title={t.auth.changePasswordTitle} subtitle="Task 019 — Change Password">
      {successMessage ? (
        <div className="auth-form">
          <p className="auth-form__success">{successMessage}</p>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <p className="auth-form__hint">{t.auth.changePasswordInstructions}</p>
          <Input
            type="password"
            name="current_password"
            label={t.auth.currentPassword}
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            error={currentPasswordError || undefined}
            required
          />
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

          <Button type="submit" isLoading={isLoading} disabled={hasErrors}>
            {t.auth.changePassword}
          </Button>
        </form>
      )}
    </Card>
  );
}
