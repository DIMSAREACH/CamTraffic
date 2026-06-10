import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  User, Mail, Phone, MapPin, CreditCard, Shield, Edit, Save, Key,
  Lock, CheckCircle, AlertCircle, Clock, Activity, LogOut, Bell,
  Globe, Monitor, Smartphone, Eye, EyeOff, Calendar, Zap, Loader2,
} from 'lucide-react';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppDate } from '@shared/i18n/localeFormat';
import { authAPI, profileAPI } from '@shared/services/api';
import type {
  ProfileActivityItem, ProfileLoginEvent, ProfileSessionItem, UserPreferences,
} from '@shared/types';
import {
  calcPasswordStrength,
  getPasswordValidationError,
  isStrongPassword,
  STRENGTH_META,
} from '@shared/utils/passwordPolicy';
import { getRefreshToken } from '@shared/utils/authStorage';
import { WelcomeProfileAvatar } from '@shared/components/WelcomeProfileAvatar';
import { toast } from 'sonner';

const ACTIVITY_ICONS: Record<string, typeof Edit> = {
  fine: CreditCard,
  detection: Zap,
  system: Bell,
  alert: AlertCircle,
  profile: Edit,
  security: Key,
  vehicle: CheckCircle,
  login: Shield,
};

function sessionIcon(device: string) {
  const label = device.toLowerCase();
  if (label.includes('iphone') || label.includes('android') || label.includes('ios')) {
    return <Smartphone size={13} />;
  }
  return <Monitor size={13} />;
}

function formatLastLogin(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return fallback;
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const { t, locale } = useLanguage();

  const ROLE_META = useMemo(() => ({
    admin:  { label: t('role.adminFull'), desc: t('role.adminDesc'), gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', shadow: 'rgba(139,92,246,0.35)' },
    police: { label: t('role.policeOfficer'), desc: t('role.policeDesc'), gradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)', shadow: 'rgba(37,99,235,0.35)' },
    driver: { label: t('role.driverRegistered'), desc: t('role.driverDesc'), gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)', shadow: 'rgba(6,182,212,0.35)' },
  }), [t]);

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', address: '', license_no: '' });
  const [pwForm, setPwForm] = useState({ current: '', new_password: '', confirm: '' });
  const [changingPw, setChangingPw] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'security' | 'sessions'>('info');
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [activity, setActivity] = useState<ProfileActivityItem[]>([]);
  const [sessions, setSessions] = useState<ProfileSessionItem[]>([]);
  const [loginHistory, setLoginHistory] = useState<ProfileLoginEvent[]>([]);
  const [prefSaving, setPrefSaving] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await profileAPI.getOverview();
      updateUser(data.user);
      setPrefs(data.preferences);
      setActivity(data.activity);
      setSessions(data.sessions);
      setLoginHistory(data.login_history);
      setForm({
        full_name: data.user.full_name || '',
        phone: data.user.phone || '',
        address: data.user.address || '',
        license_no: data.user.license_no || '',
      });
    } catch {
      toast.error(t('profile.profileLoadFail'));
    } finally {
      setLoading(false);
    }
  }, [t, updateUser]);

  useEffect(() => {
    if (user) loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) return null;

  const meta = ROLE_META[user.role];
  const pwStrength = calcPasswordStrength(pwForm.new_password);
  const pwMeta = STRENGTH_META[pwStrength];
  const roleClass = `profile-page__role-badge--${user.role}`;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await authAPI.updateProfile(form);
      updateUser(updated);
      toast.success(t('profile.profileUpdated'));
      setEditing(false);
      await loadOverview();
    } catch {
      toast.error(t('profile.profileUpdateFail'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setForm({
      full_name: user.full_name || '',
      phone: user.phone || '',
      address: user.address || '',
      license_no: user.license_no || '',
    });
    setEditing(false);
  };

  const handleChangePassword = async () => {
    if (!pwForm.current || !pwForm.new_password) { toast.error(t('profile.fillPasswordFields')); return; }
    if (pwForm.new_password !== pwForm.confirm) { toast.error(t('profile.passwordMismatch')); return; }
    const pwdError = getPasswordValidationError(pwForm.new_password);
    if (pwdError || !isStrongPassword(pwForm.new_password)) {
      toast.error(pwdError ?? 'Password must meet all strength requirements.');
      return;
    }
    setChangingPw(true);
    try {
      await authAPI.changePassword(pwForm.current, pwForm.new_password);
      toast.success(t('profile.passwordUpdated'));
      setPwForm({ current: '', new_password: '', confirm: '' });
      await loadOverview();
    } catch {
      toast.error(t('profile.passwordUpdateFail'));
    } finally {
      setChangingPw(false);
    }
  };

  const handlePreferenceToggle = async (key: keyof UserPreferences) => {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setPrefSaving(key);
    try {
      const updated = await profileAPI.updatePreferences({ [key]: next[key] });
      setPrefs(updated);
      if (key === 'two_factor_enabled') {
        toast.success(updated.two_factor_enabled ? t('profile.twoFactorEnabled') : t('profile.twoFactorDisabled'));
      } else {
        toast.success(t('profile.preferencesUpdated'));
      }
    } catch {
      setPrefs(prefs);
      toast.error(t('profile.preferencesUpdateFail'));
    } finally {
      setPrefSaving(null);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm(t('profile.deactivateConfirm'))) return;
    setDeactivating(true);
    try {
      await profileAPI.deactivate(getRefreshToken() ?? undefined);
      toast.success(t('profile.accountDeactivated'));
      logout();
    } catch {
      toast.error(t('profile.deactivateConfirmFail'));
    } finally {
      setDeactivating(false);
    }
  };

  const handleRevokeOthers = async () => {
    const refresh = getRefreshToken();
    if (!refresh) {
      toast.error(t('profile.revokeOthersFail'));
      return;
    }
    setRevoking(true);
    try {
      await profileAPI.logoutOtherSessions(refresh);
      toast.success(t('profile.revokeOthersSuccess'));
      await loadOverview();
    } catch {
      toast.error(t('profile.revokeOthersFail'));
    } finally {
      setRevoking(false);
    }
  };

  const TABS = [
    { id: 'info', label: t('profile.personalInfo'), icon: User, gradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)' },
    { id: 'security', label: t('profile.security'), icon: Shield, gradient: 'linear-gradient(135deg, #F59E0B, #D97706)' },
    { id: 'sessions', label: t('profile.sessions'), icon: Monitor, gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)' },
  ] as const;

  const prefRows = [
    ['notify_fines', t('profile.fineAlerts'), 'rose'],
    ['notify_detections', t('profile.aiDetections'), 'violet'],
    ['notify_alerts', t('profile.systemAlerts'), 'amber'],
    ['notify_system', t('profile.updates'), 'blue'],
  ] as const;

  return (
    <div className="enforcement-page enforcement-page--profile dashboard-page--profile profile-page--fullscreen">
      {loading && (
        <div className="profile-page__loading" aria-live="polite">
          <Loader2 size={22} className="profile-page__loading-icon" />
          <span>{t('profile.loadingProfile')}</span>
        </div>
      )}

      <div className="profile-page__layout">
        <aside className="profile-page__sidebar">
          <div className="enforcement-page__panel profile-page__identity-card">
            <div className="profile-page__identity-banner" aria-hidden />
            <div className="profile-page__identity-body">
              <div className="profile-page__identity-top">
                <div className="profile-page__avatar-wrap">
                  <WelcomeProfileAvatar variant="card" size="lg" />
                  <span className={`profile-page__status-dot${user.is_active ? ' profile-page__status-dot--active' : ''}`} aria-hidden />
                </div>
                <button
                  type="button"
                  onClick={() => (editing ? handleCancelEdit() : setEditing(true))}
                  className={`profile-page__edit-btn${editing ? ' profile-page__edit-btn--muted' : ''} ${roleClass}`}
                >
                  {editing ? t('profile.cancel') : <><Edit size={11} /> {t('profile.edit')}</>}
                </button>
              </div>
              <p className="profile-page__name">{user.full_name}</p>
              <p className="profile-page__email">{user.email}</p>
              <span className={`profile-page__role-badge ${roleClass}`}>{meta.label}</span>
              <p className="profile-page__role-desc">{meta.desc}</p>
            </div>
          </div>

          <div className="enforcement-page__panel profile-page__side-panel">
            <p className="profile-page__side-label">{t('profile.accountStats')}</p>
            <div className="profile-page__stats">
              {[
                { label: t('profile.memberSince'), value: formatAppDate(locale, user.created_at, { month: 'short', year: 'numeric' }), icon: Calendar, variant: 'blue' },
                { label: t('profile.accountStatus'), value: user.is_active ? t('profile.active') : t('profile.suspended'), icon: CheckCircle, variant: user.is_active ? 'emerald' : 'rose' },
                { label: t('profile.roleLevel'), value: user.role === 'admin' ? t('role.admin') : user.role === 'police' ? t('role.officer') : t('role.standard'), icon: Zap, variant: 'violet' },
                { label: t('profile.lastLogin'), value: formatLastLogin(user.last_login, t('profile.justNow')), icon: Clock, variant: 'teal' },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="profile-page__stat-row">
                    <div className={`profile-page__stat-icon profile-page__stat-icon--${s.variant}`}>
                      <Icon size={13} />
                    </div>
                    <span className="profile-page__stat-label">{s.label}</span>
                    <span className={`profile-page__stat-value profile-page__stat-value--${s.variant}`}>{s.value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="enforcement-page__panel profile-page__side-panel">
            <div className="profile-page__side-head">
              <div className="profile-page__side-icon profile-page__side-icon--blue">
                <Bell size={12} />
              </div>
              <p className="profile-page__side-title">{t('profile.notificationsPrefs')}</p>
            </div>
            <div className="profile-page__prefs">
              {prefRows.map(([key, label]) => (
                <div key={key} className="profile-page__pref-row">
                  <span className="profile-page__pref-label">{label}</span>
                  <button
                    type="button"
                    aria-pressed={prefs?.[key] ?? false}
                    disabled={!prefs || prefSaving === key}
                    onClick={() => handlePreferenceToggle(key)}
                    className={`notifications-page__toggle${prefs?.[key] ? ' notifications-page__toggle--on' : ''}`}
                  >
                    <span className="notifications-page__toggle-knob" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="enforcement-page__panel profile-page__danger-panel">
            <p className="profile-page__danger-label">{t('profile.dangerZone')}</p>
            <button
              type="button"
              className="profile-page__danger-btn"
              disabled={deactivating}
              onClick={handleDeactivate}
            >
              {deactivating ? <Loader2 size={13} className="profile-page__spinner" /> : <AlertCircle size={13} />}
              {t('profile.deactivateAccount')}
            </button>
          </div>
        </aside>

        <div className="profile-page__main">
          <div className="enforcement-page__hero profile-page__hero">
            <div className="enforcement-page__hero-glow--primary" aria-hidden />
            <div className="enforcement-page__hero-glow--secondary" aria-hidden />
            <div className="enforcement-page__hero-inner">
              <div>
                <div className="enforcement-page__eyebrow">
                  <span className="enforcement-page__eyebrow-icon">
                    <User size={14} />
                  </span>
                  {t('pages.profile.eyebrow')}
                </div>
                <h1 className="enforcement-page__title">{t('pages.profile.title')}</h1>
                <p className="enforcement-page__subtitle">{t('pages.profile.heroSubtitle')}</p>
              </div>
            </div>
          </div>

          <div className="enforcement-page__toolbar profile-page__tabs">
            <div className="enforcement-page__filters">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`enforcement-page__filter-btn profile-page__tab-btn${active ? ' enforcement-page__filter-btn--active' : ''}`}
                    style={active ? { background: tab.gradient } : undefined}
                  >
                    <Icon size={13} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {activeTab === 'info' && (
            <div className="profile-page__sections">
              <div className="enforcement-page__panel profile-page__panel">
                <div className="profile-page__panel-head">
                  <div>
                    <p className="profile-page__panel-title">{t('profile.personalInformation')}</p>
                    <p className="profile-page__panel-desc">{t('profile.personalInfoDesc')}</p>
                  </div>
                  {editing && (
                    <button type="button" onClick={handleSave} disabled={saving} className={`profile-page__save-btn ${roleClass}`}>
                      {saving ? (
                        <>
                          <span className="profile-page__spinner" />
                          {t('profile.saving')}
                        </>
                      ) : (
                        <>
                          <Save size={13} /> {t('profile.save')}
                        </>
                      )}
                    </button>
                  )}
                </div>

                {editing ? (
                  <div className="profile-page__form-grid">
                    <div>
                      <Label className="enforcement-page__form-label">{t('profile.fullName')}</Label>
                      <Input className="mt-1.5" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="enforcement-page__form-label">{t('profile.phoneNumber')}</Label>
                      <Input className="mt-1.5" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+855 12 345 678" />
                    </div>
                    <div className="profile-page__form-span-2">
                      <Label className="enforcement-page__form-label">{t('profile.address')}</Label>
                      <Input className="mt-1.5" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street, District, City" />
                    </div>
                    {user.role === 'driver' && (
                      <div>
                        <Label className="enforcement-page__form-label">{t('profile.driversLicense')}</Label>
                        <Input className="mt-1.5" value={form.license_no} onChange={(e) => setForm((f) => ({ ...f, license_no: e.target.value }))} placeholder="DL-KH-2024-XXXXXX" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="profile-page__info-grid">
                    {[
                      { icon: Mail, label: t('profile.emailAddress'), value: user.email, variant: 'blue' },
                      { icon: Phone, label: t('profile.phoneNumber'), value: user.phone || '—', variant: 'teal' },
                      { icon: MapPin, label: t('profile.address'), value: user.address || '—', variant: 'emerald' },
                      { icon: Shield, label: t('profile.role'), value: meta.label, variant: 'violet' },
                      ...(user.role === 'driver' ? [{ icon: CreditCard, label: t('profile.driversLicense'), value: user.license_no || '—', variant: 'amber' as const }] : []),
                      { icon: Calendar, label: t('profile.memberSince'), value: new Date(user.created_at).toLocaleDateString(locale === 'km' ? 'km-KH' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }), variant: 'blue' as const },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className={`profile-page__info-card profile-page__info-card--${item.variant}`}>
                          <div className={`profile-page__info-icon profile-page__info-icon--${item.variant}`}>
                            <Icon size={14} />
                          </div>
                          <div>
                            <p className="profile-page__info-label">{item.label}</p>
                            <p className="profile-page__info-value">{item.value}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="enforcement-page__panel profile-page__panel">
                <div className="profile-page__panel-head">
                  <div className="profile-page__panel-head-icon profile-page__panel-head-icon--blue">
                    <Activity size={15} />
                  </div>
                  <div>
                    <p className="profile-page__panel-title">{t('profile.recentActivity')}</p>
                    <p className="profile-page__panel-desc">{t('profile.recentActivityDesc')}</p>
                  </div>
                </div>
                {activity.length === 0 ? (
                  <p className="profile-page__empty-note">{t('profile.noActivity')}</p>
                ) : (
                  <div className="profile-page__timeline">
                    {activity.map((a, i) => {
                      const Icon = ACTIVITY_ICONS[a.type] ?? Activity;
                      return (
                        <div key={`${a.time}-${i}`} className="profile-page__timeline-row">
                          <div className="profile-page__timeline-dot" style={{ background: `${a.color}18`, color: a.color }}>
                            <Icon size={12} />
                          </div>
                          <div className="profile-page__timeline-copy">
                            <p className="profile-page__timeline-action">{a.action}</p>
                            <span className="profile-page__timeline-time">
                              <Clock size={9} /> {a.time_label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="profile-page__sections">
              <div className="enforcement-page__panel profile-page__panel">
                <div className="profile-page__panel-head">
                  <div className="profile-page__panel-head-icon profile-page__panel-head-icon--amber">
                    <Key size={15} />
                  </div>
                  <div>
                    <p className="profile-page__panel-title">{t('profile.changePassword')}</p>
                    <p className="profile-page__panel-desc">{t('profile.changePasswordDesc')}</p>
                  </div>
                </div>
                <div className="profile-page__form-grid">
                  <div className="profile-page__form-span-2">
                    <Label className="enforcement-page__form-label">{t('profile.currentPassword')}</Label>
                    <div className="relative mt-1.5">
                      <Input type={showCurrent ? 'text' : 'password'} value={pwForm.current} onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))} placeholder={t('profile.currentPasswordPlaceholder')} className="pr-10" />
                      <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="profile-page__eye-btn">
                        {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label className="enforcement-page__form-label">{t('profile.newPassword')}</Label>
                    <div className="relative mt-1.5">
                      <Input type={showNew ? 'text' : 'password'} value={pwForm.new_password} onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))} placeholder={t('profile.newPasswordPlaceholder')} className="pr-10" />
                      <button type="button" onClick={() => setShowNew(!showNew)} className="profile-page__eye-btn">
                        {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {pwForm.new_password && (
                      <div className="mt-2">
                        <div className="profile-page__strength-bars">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="profile-page__strength-bar" style={{ background: i <= pwStrength ? pwMeta.color : 'rgba(37,99,235,0.1)' }} />
                          ))}
                        </div>
                        <p className="profile-page__strength-label" style={{ color: pwMeta.color }}>{pwMeta.label}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="enforcement-page__form-label">{t('profile.confirmPassword')}</Label>
                    <div className="relative mt-1.5">
                      <Input type={showConfirm ? 'text' : 'password'} value={pwForm.confirm} onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))} placeholder={t('profile.confirmPasswordPlaceholder')} className="pr-10" />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="profile-page__eye-btn">
                        {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {pwForm.confirm && pwForm.new_password && (
                      <p className={`profile-page__match-hint${pwForm.confirm === pwForm.new_password ? ' profile-page__match-hint--ok' : ' profile-page__match-hint--bad'}`}>
                        {pwForm.confirm === pwForm.new_password ? `✓ ${t('profile.passwordsMatch')}` : `✗ ${t('profile.passwordsMismatch')}`}
                      </p>
                    )}
                  </div>
                </div>
                <button type="button" onClick={handleChangePassword} disabled={changingPw} className="profile-page__password-btn">
                  {changingPw ? (
                    <>
                      <span className="profile-page__spinner" />
                      {t('profile.updating')}
                    </>
                  ) : (
                    <>
                      <Lock size={13} /> {t('profile.updatePassword')}
                    </>
                  )}
                </button>
              </div>

              <div className="enforcement-page__panel profile-page__panel">
                <div className="profile-page__panel-head">
                  <div className="profile-page__panel-head-icon profile-page__panel-head-icon--blue">
                    <Shield size={15} />
                  </div>
                  <div>
                    <p className="profile-page__panel-title">{t('profile.securitySettings')}</p>
                    <p className="profile-page__panel-desc">{t('profile.securitySettingsDesc')}</p>
                  </div>
                </div>
                <div className="profile-page__security-list">
                  <div className="profile-page__security-row">
                    <div>
                      <p className="profile-page__security-title">{t('profile.twoFactor')}</p>
                      <p className="profile-page__security-desc">{t('profile.twoFactorDesc')}</p>
                    </div>
                    <button
                      type="button"
                      aria-pressed={prefs?.two_factor_enabled ?? false}
                      disabled={!prefs || prefSaving === 'two_factor_enabled'}
                      onClick={() => handlePreferenceToggle('two_factor_enabled')}
                      className={`notifications-page__toggle${prefs?.two_factor_enabled ? ' notifications-page__toggle--on' : ''}`}
                    >
                      <span className="notifications-page__toggle-knob" />
                    </button>
                  </div>
                  {([
                    ['login_notifications', t('profile.loginNotifications'), t('profile.loginNotificationsDesc')],
                    ['suspicious_alerts', t('profile.suspiciousAlerts'), t('profile.suspiciousAlertsDesc')],
                  ] as const).map(([key, label, desc]) => (
                    <div key={key} className="profile-page__security-row">
                      <div>
                        <p className="profile-page__security-title">{label}</p>
                        <p className="profile-page__security-desc">{desc}</p>
                      </div>
                      <button
                        type="button"
                        aria-pressed={prefs?.[key] ?? false}
                        disabled={!prefs || prefSaving === key}
                        onClick={() => handlePreferenceToggle(key)}
                        className={`notifications-page__toggle${prefs?.[key] ? ' notifications-page__toggle--on' : ''}`}
                      >
                        <span className="notifications-page__toggle-knob" />
                      </button>
                    </div>
                  ))}
                  <div className="profile-page__session-banner">
                    <CheckCircle size={16} className="profile-page__session-banner-icon" />
                    <div>
                      <p className="profile-page__session-banner-title">{t('profile.sessionActive')}</p>
                      <p className="profile-page__session-banner-desc">
                        {t('profile.sessionActiveDesc', { status: user.is_active ? t('profile.active') : t('profile.suspended') })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="profile-page__sections">
              <div className="enforcement-page__panel profile-page__panel">
                <div className="profile-page__panel-head profile-page__panel-head--split">
                  <div className="profile-page__panel-head">
                    <div className="profile-page__panel-head-icon profile-page__panel-head-icon--blue">
                      <Globe size={15} />
                    </div>
                    <div>
                      <p className="profile-page__panel-title">{t('profile.activeSessions')}</p>
                      <p className="profile-page__panel-desc">{t('profile.activeSessionsDesc')}</p>
                    </div>
                  </div>
                  <button type="button" className="profile-page__revoke-btn" disabled={revoking} onClick={handleRevokeOthers}>
                    {revoking ? <Loader2 size={11} className="profile-page__spinner" /> : <LogOut size={11} />}
                    {t('profile.revokeOthers')}
                  </button>
                </div>
                <div className="profile-page__sessions">
                  {sessions.map((s, i) => (
                    <div key={s.id ?? `session-${i}`} className={`profile-page__session-row${s.current ? ' profile-page__session-row--current' : ''}`}>
                      <div className={`profile-page__session-icon${s.current ? ' profile-page__session-icon--current' : ''}`}>
                        {sessionIcon(s.device)}
                      </div>
                      <div className="profile-page__session-copy">
                        <div className="profile-page__session-top">
                          <p className="profile-page__session-device">{s.device}</p>
                          {s.current && <span className="profile-page__session-current">{t('profile.currentSession')}</span>}
                        </div>
                        <p className="profile-page__session-meta">
                          <MapPin size={9} /> {s.location}
                          <span>·</span>
                          {s.ip_masked}
                          <span>·</span>
                          <Clock size={9} /> {s.time_label}
                        </p>
                      </div>
                      {!s.current && (
                        <button type="button" className="profile-page__session-revoke" disabled={revoking} onClick={handleRevokeOthers}>
                          <LogOut size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="enforcement-page__panel profile-page__panel">
                <div className="profile-page__panel-head">
                  <div className="profile-page__panel-head-icon profile-page__panel-head-icon--blue">
                    <Clock size={15} />
                  </div>
                  <div>
                    <p className="profile-page__panel-title">{t('profile.loginHistory')}</p>
                    <p className="profile-page__panel-desc">{t('profile.loginHistoryDesc')}</p>
                  </div>
                </div>
                {loginHistory.length === 0 ? (
                  <p className="profile-page__empty-note">{t('profile.noLoginHistory')}</p>
                ) : (
                  <div className="profile-page__history">
                    {loginHistory.map((h, i) => (
                      <div key={`${h.time}-${i}`} className="profile-page__history-row">
                        <div className={`profile-page__history-dot profile-page__history-dot--${h.status}`} />
                        <div className="profile-page__history-copy">
                          <p className="profile-page__history-device">{h.device}</p>
                          <p className="profile-page__history-ip">{h.ip_masked}</p>
                        </div>
                        <span className="profile-page__history-time">{h.time_label}</span>
                        <span className={`profile-page__history-badge profile-page__history-badge--${h.status}`}>{h.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
