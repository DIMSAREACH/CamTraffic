import { Button, Card, useTranslation } from '@camtraffic/ui';
import type { User } from '@camtraffic/types';

interface EmailVerificationPanelProps {
  user: User;
  onSendVerification: () => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null;
}

export function EmailVerificationPanel({
  user,
  onSendVerification,
  isLoading,
  errorMessage,
  successMessage,
}: EmailVerificationPanelProps) {
  const { t } = useTranslation();

  if (user.is_email_verified) {
    return (
      <Card title={t.auth.emailVerificationTitle} subtitle="Task 020 — Email Verification">
        <p className="auth-form__success">{t.auth.emailVerified}</p>
      </Card>
    );
  }

  return (
    <Card title={t.auth.emailVerificationTitle} subtitle="Task 020 — Email Verification">
      <div className="auth-form">
        <p className="auth-form__hint">{t.auth.emailVerificationInstructions}</p>
        <p>
          {t.auth.emailNotVerified}: <strong>{user.email}</strong>
        </p>
        {successMessage ? <p className="auth-form__success">{successMessage}</p> : null}
        {errorMessage ? <p className="auth-form__error">{errorMessage}</p> : null}
        <Button type="button" onClick={onSendVerification} isLoading={isLoading}>
          {t.auth.sendVerificationEmail}
        </Button>
      </div>
    </Card>
  );
}
