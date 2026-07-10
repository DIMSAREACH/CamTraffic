import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, LocaleToggle, ThemeToggle, useTranslation } from '@camtraffic/ui';
import type { DriverSettingsRecord, UpdateDriverSettingsPayload, UserProfile } from '@camtraffic/types';

interface DriverSettingsPageProps {
  onLoadSettings: () => Promise<DriverSettingsRecord>;
  onUpdateSettings: (
    payload: UpdateDriverSettingsPayload,
  ) => Promise<{ settings: DriverSettingsRecord; message: string }>;
  onLoadProfile: () => Promise<UserProfile>;
  onUpdateProfile: (payload: { locale: 'en' | 'km' }) => Promise<{ profile: UserProfile; message: string }>;
}

export function DriverSettingsPage({
  onLoadSettings,
  onUpdateSettings,
  onLoadProfile,
  onUpdateProfile,
}: DriverSettingsPageProps) {
  const { t, setLocale } = useTranslation();
  const [settings, setSettings] = useState<DriverSettingsRecord | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [booting, setBooting] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyViolations, setNotifyViolations] = useState(true);
  const [notifyFines, setNotifyFines] = useState(true);
  const [notifyAppeals, setNotifyAppeals] = useState(true);
  const [preferredLocale, setPreferredLocale] = useState<'en' | 'km'>('en');

  useEffect(() => {
    async function bootstrap() {
      try {
        const [settingsData, profileData] = await Promise.all([onLoadSettings(), onLoadProfile()]);
        setSettings(settingsData);
        setProfile(profileData);
        setNotifyEmail(settingsData.notify_email);
        setNotifyViolations(settingsData.notify_violations);
        setNotifyFines(settingsData.notify_fines);
        setNotifyAppeals(settingsData.notify_appeals);
        setPreferredLocale(profileData.locale);
      } catch {
        setErrorMessage(t.errors.generic);
      } finally {
        setBooting(false);
      }
    }

    void bootstrap();
  }, [onLoadProfile, onLoadSettings, t.errors.generic]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const settingsResult = await onUpdateSettings({
        notify_email: notifyEmail,
        notify_violations: notifyViolations,
        notify_fines: notifyFines,
        notify_appeals: notifyAppeals,
      });
      setSettings(settingsResult.settings);
      let message = settingsResult.message;

      if (profile && preferredLocale !== profile.locale) {
        const profileResult = await onUpdateProfile({ locale: preferredLocale });
        setProfile(profileResult.profile);
        setLocale(preferredLocale);
        message = `${message} ${profileResult.message}`.trim();
      }

      setSuccessMessage(message);
    } catch {
      setErrorMessage(t.errors.generic);
    } finally {
      setSaving(false);
    }
  }

  if (booting) {
    return (
      <Card title={t.nav.settings} subtitle="Task 082 — Driver settings">
        <p>{t.common.loading}</p>
      </Card>
    );
  }

  if (!settings || !profile) {
    return (
      <Card title={t.nav.settings} subtitle="Task 082 — Driver settings">
        <p className="auth-form__error">{errorMessage ?? t.errors.generic}</p>
      </Card>
    );
  }

  return (
    <div className="driver-settings-page">
      <Card title={t.nav.settings} subtitle="Task 082 — Notification and appearance preferences">
        <form className="auth-form driver-settings-form" onSubmit={handleSubmit}>
          <section className="driver-settings-section">
            <h4>Notification preferences</h4>
            <label className="driver-settings-toggle">
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(event) => setNotifyEmail(event.target.checked)}
              />
              <span>Email notifications</span>
            </label>
            <label className="driver-settings-toggle">
              <input
                type="checkbox"
                checked={notifyViolations}
                onChange={(event) => setNotifyViolations(event.target.checked)}
              />
              <span>Violation alerts</span>
            </label>
            <label className="driver-settings-toggle">
              <input
                type="checkbox"
                checked={notifyFines}
                onChange={(event) => setNotifyFines(event.target.checked)}
              />
              <span>Fine reminders</span>
            </label>
            <label className="driver-settings-toggle">
              <input
                type="checkbox"
                checked={notifyAppeals}
                onChange={(event) => setNotifyAppeals(event.target.checked)}
              />
              <span>Appeal updates</span>
            </label>
          </section>

          <section className="driver-settings-section">
            <h4>Appearance</h4>
            <div className="driver-settings-appearance">
              <ThemeToggle />
              <LocaleToggle />
            </div>
            <label className="auth-form__field">
              <span className="auth-form__label">{t.profile.preferredLocale}</span>
              <select
                className="auth-form__select"
                value={preferredLocale}
                onChange={(event) => setPreferredLocale(event.target.value as 'en' | 'km')}
              >
                <option value="en">{t.locale.en}</option>
                <option value="km">{t.locale.km}</option>
              </select>
            </label>
            <p className="auth-form__hint">Account: {profile.email}</p>
          </section>

          <Button type="submit" isLoading={saving}>
            Save settings
          </Button>
        </form>

        {errorMessage ? <p className="auth-form__error">{errorMessage}</p> : null}
        {successMessage ? <p className="auth-form__success">{successMessage}</p> : null}
      </Card>
    </div>
  );
}
