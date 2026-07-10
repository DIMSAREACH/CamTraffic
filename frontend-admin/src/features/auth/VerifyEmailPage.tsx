import { Button, Card, LocaleToggle, ThemeToggle, useTranslation } from '@camtraffic/ui';

interface VerifyEmailPageProps {
  portalTitle: string;
  portalSubtitle: string;
  onBackToLogin: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null;
}

export function VerifyEmailPage({
  portalTitle,
  portalSubtitle,
  onBackToLogin,
  isLoading,
  errorMessage,
  successMessage,
}: VerifyEmailPageProps) {
  const { t } = useTranslation();

  return (
    <main className="auth-page">
      <header className="auth-page__header">
        <h1>{portalTitle}</h1>
        <p>{portalSubtitle}</p>
      </header>

      <div className="auth-page__toolbar">
        <LocaleToggle />
        <ThemeToggle />
      </div>

      <Card title={t.auth.emailVerificationTitle} subtitle="Task 020 — Email Verification">
        <div className="auth-form">
          {isLoading ? <p className="auth-form__hint">{t.auth.verifyingEmail}</p> : null}
          {successMessage ? <p className="auth-form__success">{successMessage}</p> : null}
          {errorMessage ? <p className="auth-form__error">{errorMessage}</p> : null}
          <Button type="button" variant="secondary" onClick={onBackToLogin}>
            {t.auth.backToLogin}
          </Button>
        </div>
      </Card>
    </main>
  );
}
