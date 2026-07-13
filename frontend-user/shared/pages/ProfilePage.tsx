import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  User, Mail, Phone, MapPin, CreditCard, Shield, Edit, Save, Key,
  Lock, CheckCircle, AlertCircle, Clock, Activity, LogOut, Bell,
  Globe, Monitor, Smartphone, Eye, EyeOff, Calendar, Zap, Loader2,
  RefreshCw, BarChart3, Sparkles, Target, Fingerprint, TrendingUp, Award, Trash2,
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
import { LoginHistoryCard } from '@shared/components/admin/LoginHistoryCard';
import { EmailVerificationPanel } from '@shared/components/auth/EmailVerificationPanel';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@shared/components/ui/dialog';
import { toast } from 'sonner';
import { DASHBOARD_PALETTE } from '@shared/constants/chartPalette';
import type { CSSProperties } from 'react';

function paletteAt(index: number) {
  return DASHBOARD_PALETTE[index % DASHBOARD_PALETTE.length];
}

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
  const [activeTab, setActiveTab] = useState<'overview' | 'info' | 'security' | 'sessions'>('overview');
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [activity, setActivity] = useState<ProfileActivityItem[]>([]);
  const [sessions, setSessions] = useState<ProfileSessionItem[]>([]);
  const [loginHistory, setLoginHistory] = useState<ProfileLoginEvent[]>([]);
  const [prefSaving, setPrefSaving] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
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
  const accountActionsLocked = user.role === 'admin';

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

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error(t('profile.fillPasswordFields'));
      return;
    }
    setDeleting(true);
    try {
      await profileAPI.deleteAccount(deletePassword, getRefreshToken() ?? undefined);
      toast.success(t('profile.accountDeleted'));
      logout();
    } catch {
      toast.error(t('profile.deleteAccountFail'));
    } finally {
      setDeleting(false);
      setDeletePassword('');
      setDeleteDialogOpen(false);
      setShowDeletePassword(false);
    }
  };

  const resetDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeletePassword('');
    setShowDeletePassword(false);
  };

  const deleteRules = [
    'deleteRulePermanent',
    'deleteRuleData',
    'deleteRuleSignOut',
    'deleteRuleRecords',
    'deleteRulePassword',
  ] as const;

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
    { id: 'overview', label: t('profile.overview'), icon: Sparkles, paletteIndex: 9 },
    { id: 'info', label: t('profile.personalInfo'), icon: User, paletteIndex: 6 },
    { id: 'security', label: t('profile.security'), icon: Shield, paletteIndex: 1 },
    { id: 'sessions', label: t('profile.sessions'), icon: Monitor, paletteIndex: 5 },
  ] as const;

  const prefRows = [
    ['notify_fines', t('profile.fineAlerts'), 0],
    ['notify_detections', t('profile.aiDetections'), 8],
    ['notify_alerts', t('profile.systemAlerts'), 1],
    ['notify_system', t('profile.updates'), 6],
  ] as const;

  const accountStats = [
    { label: t('profile.memberSince'), value: formatAppDate(locale, user.created_at, { month: 'short', year: 'numeric' }), icon: Calendar, paletteIndex: 6 },
    { label: t('profile.accountStatus'), value: user.is_active ? t('profile.active') : t('profile.suspended'), icon: CheckCircle, paletteIndex: user.is_active ? 4 : 0 },
    { label: t('profile.roleLevel'), value: user.role === 'admin' ? t('role.admin') : user.role === 'police' ? t('role.officer') : t('role.standard'), icon: Zap, paletteIndex: 8 },
    { label: t('profile.lastLogin'), value: formatLastLogin(user.last_login, t('profile.justNow')), icon: Clock, paletteIndex: 5 },
  ];

  const infoFields = [
    { icon: Mail, label: t('profile.emailAddress'), value: user.email, paletteIndex: 6 },
    { icon: Phone, label: t('profile.phoneNumber'), value: user.phone || '—', paletteIndex: 5 },
    { icon: MapPin, label: t('profile.address'), value: user.address || '—', paletteIndex: 4 },
    { icon: Shield, label: t('profile.role'), value: meta.label, paletteIndex: 8 },
    ...(user.role === 'driver' ? [{ icon: CreditCard, label: t('profile.driversLicense'), value: user.license_no || '—', paletteIndex: 1 }] : []),
    { icon: Calendar, label: t('profile.memberSince'), value: new Date(user.created_at).toLocaleDateString(locale === 'km' ? 'km-KH' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }), paletteIndex: 2 },
  ];

  const notifyOnCount = prefs
    ? prefRows.filter(([key]) => prefs[key as keyof UserPreferences]).length
    : 0;

  const activityBreakdown = (() => {
    const counts: Record<string, number> = {};
    activity.forEach((a) => {
      counts[a.type] = (counts[a.type] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  })();

  const securityChecklist = [
    { label: t('profile.checklist2fa'), done: prefs?.two_factor_enabled ?? false, paletteIndex: 8 },
    { label: t('profile.checklistLoginAlerts'), done: prefs?.login_notifications ?? false, paletteIndex: 5 },
    { label: t('profile.checklistPhone'), done: Boolean(user.phone?.trim()), paletteIndex: 4 },
    { label: t('profile.checklistAddress'), done: Boolean(user.address?.trim()), paletteIndex: 3 },
  ];

  const profileCompletion = (() => {
    const fields = [user.full_name, user.email, user.phone, user.address, ...(user.role === 'driver' ? [user.license_no] : [])];
    const filled = fields.filter((f) => f && String(f).trim()).length;
    return Math.round((filled / fields.length) * 100);
  })();

  const securityScore = (() => {
    if (!prefs) return 0;
    let score = 35;
    if (prefs.two_factor_enabled) score += 30;
    if (prefs.login_notifications) score += 18;
    if (prefs.suspicious_alerts) score += 17;
    return Math.min(score, 100);
  })();

  const loginSuccessRate = (() => {
    if (!loginHistory.length) return 100;
    const ok = loginHistory.filter((h) => h.status === 'success').length;
    return Math.round((ok / loginHistory.length) * 100);
  })();

  const checklistDoneCount = securityChecklist.filter((i) => i.done).length;

  const insightTiles = [
    { label: t('profile.profileCompletion'), value: `${profileCompletion}%`, sub: t('profile.profileCompletionSub'), icon: Target, paletteIndex: 6 },
    { label: t('profile.securityScore'), value: `${securityScore}%`, sub: t('profile.securityScoreSub'), icon: Fingerprint, paletteIndex: 8 },
    { label: t('profile.activeDevices'), value: String(sessions.length), sub: t('profile.activeDevicesSub', { count: sessions.filter((s) => !s.current).length }), icon: Monitor, paletteIndex: 5 },
    { label: t('profile.alertsEnabled'), value: `${notifyOnCount}/4`, sub: t('profile.alertsEnabledSub'), icon: Bell, paletteIndex: 1 },
  ];

  const roleCapabilities = user.role === 'admin'
    ? [t('profile.capAdminUsers'), t('profile.capAdminReports'), t('profile.capAdminSystem')]
    : user.role === 'police'
      ? [t('profile.capPoliceFines'), t('profile.capPoliceDetections'), t('profile.capPoliceEvidence')]
      : [t('profile.capDriverVehicles'), t('profile.capDriverFines'), t('profile.capDriverAi')];

  return (
    <div className="enforcement-page enforcement-page--profile dashboard-page--profile profile-page--full profile-page--clean profile-page--pro profile-page--wide">
      {loading && (
        <div className="profile-page__loading" aria-live="polite">
          <Loader2 size={22} className="profile-page__loading-icon" />
          <span>{t('profile.loadingProfile')}</span>
        </div>
      )}

      <div className="profile-page__shell">

        <div className="enforcement-page__hero profile-page__hero profile-page__hero--identity">
          <div className="enforcement-page__hero-glow--primary" aria-hidden />
          <div className="enforcement-page__hero-glow--secondary" aria-hidden />
          <div className="profile-page__hero-inner">
            <div className="profile-page__hero-identity">
              <div className="profile-page__avatar-upload">
                <WelcomeProfileAvatar variant="hero" />
                <span className={`profile-page__status-dot profile-page__status-dot--ring${user.is_active ? ' profile-page__status-dot--active' : ''}`} aria-hidden />
              </div>
              <div className="profile-page__hero-copy">
                <div className="enforcement-page__eyebrow">
                  <span className="enforcement-page__eyebrow-icon">
                    <User size={14} />
                  </span>
                  {t('pages.profile.eyebrow')}
                </div>
                <h1 className="enforcement-page__title profile-page__hero-name">{user.full_name}</h1>
                <p className="profile-page__hero-email">{user.email}</p>
                <div className="profile-page__hero-badges">
                  <span className={`profile-page__role-badge ${roleClass}`}>{meta.label}</span>
                  <span className="profile-page__hero-subtitle">{meta.desc}</span>
                </div>
              </div>
            </div>
            <div className="profile-page__hero-actions">
              <button
                type="button"
                className="profile-page__hero-btn profile-page__hero-btn--muted"
                onClick={() => void loadOverview()}
                disabled={loading}
              >
                <RefreshCw size={14} className={loading ? 'profile-page__spinner' : ''} />
                {t('profile.refreshProfile')}
              </button>
              {editing && (
                <button type="button" onClick={handleSave} disabled={saving} className={`profile-page__hero-btn profile-page__hero-btn--save ${roleClass}`}>
                  {saving ? <Loader2 size={15} className="profile-page__spinner" /> : <Save size={15} />}
                  {saving ? t('profile.saving') : t('profile.save')}
                </button>
              )}
              <button
                type="button"
                onClick={() => (editing ? handleCancelEdit() : setEditing(true))}
                className={`profile-page__hero-btn${editing ? ' profile-page__hero-btn--muted' : ` profile-page__hero-btn--accent ${roleClass}`}`}
              >
                {editing ? t('profile.cancel') : <><Edit size={14} /> {t('profile.edit')}</>}
              </button>
            </div>
          </div>
        </div>

        <div className="profile-page__metrics-strip">
          {accountStats.map((s) => {
            const Icon = s.icon;
            const pal = paletteAt(s.paletteIndex);
            return (
              <div
                key={s.label}
                className="profile-page__metric-tile"
                style={{ '--profile-accent': pal.solid, '--profile-accent-soft': pal.soft } as CSSProperties}
              >
                <div className="profile-page__metric-icon">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="profile-page__metric-value">{s.value}</p>
                  <p className="profile-page__metric-label">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="profile-page__workspace profile-page__workspace--wide">
          <div className="profile-page__workspace-head profile-page__workspace-head--pro">
            <div className="profile-page__tab-pills profile-page__tab-pills--pro" role="tablist" aria-label={t('pages.profile.title')}>
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                const pal = paletteAt(tab.paletteIndex);
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.id)}
                    className={`profile-page__tab-pill${active ? ' profile-page__tab-pill--active' : ''}`}
                    style={active ? { background: pal.grad, boxShadow: `0 6px 18px ${pal.soft}` } : undefined}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="profile-page__workspace-body">
        {activeTab === 'overview' && (
          <div className="profile-page__content-stack profile-page__content-stack--overview">
            <section className="profile-page__section profile-page__section--glass profile-page__section--welcome profile-page__section--span-full">
              <div className="profile-page__welcome-copy">
                <h2 className="profile-page__welcome-title">{t('profile.overviewWelcome', { name: user.full_name.split(' ')[0] || user.full_name })}</h2>
                <p className="profile-page__welcome-desc">{t('profile.overviewDesc')}</p>
              </div>
              <div className="profile-page__welcome-stats">
                <div className="profile-page__welcome-stat">
                  <BarChart3 size={16} />
                  <span>{activity.length}</span>
                  <small>{t('profile.recentActivity')}</small>
                </div>
                <div className="profile-page__welcome-stat">
                  <Monitor size={16} />
                  <span>{sessions.length}</span>
                  <small>{t('profile.activeDevices')}</small>
                </div>
                <div className="profile-page__welcome-stat">
                  <Bell size={16} />
                  <span>{notifyOnCount}</span>
                  <small>{t('profile.alertsEnabled')}</small>
                </div>
              </div>
            </section>

            <div className="profile-page__insight-strip">
              {insightTiles.map((tile) => {
                const Icon = tile.icon;
                const pal = paletteAt(tile.paletteIndex);
                return (
                  <div
                    key={tile.label}
                    className="profile-page__insight-tile"
                    style={{ '--profile-accent': pal.solid, '--profile-accent-soft': pal.soft } as CSSProperties}
                  >
                    <div className="profile-page__insight-tile-icon">
                      <Icon size={18} />
                    </div>
                    <div className="profile-page__insight-tile-copy">
                      <p className="profile-page__insight-tile-value">{tile.value}</p>
                      <p className="profile-page__insight-tile-label">{tile.label}</p>
                      <p className="profile-page__insight-tile-sub">{tile.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <nav className="profile-page__quick-nav" aria-label={t('profile.quickActions')}>
              <button type="button" className="profile-page__quick-nav-btn" onClick={() => setEditing(true)}>
                <Edit size={14} /> {t('profile.edit')}
              </button>
              <button type="button" className="profile-page__quick-nav-btn" onClick={() => setActiveTab('security')}>
                <Key size={14} /> {t('profile.goToSecurity')}
              </button>
              <button type="button" className="profile-page__quick-nav-btn" onClick={() => setActiveTab('sessions')}>
                <Globe size={14} /> {t('profile.goToSessions')}
              </button>
            </nav>

            <div className="profile-page__overview-grid profile-page__overview-grid--wide">
              <section className="profile-page__section profile-page__section--glass">
                <div className="profile-page__section-head">
                  <div className="profile-page__section-icon profile-page__section-icon--violet">
                    <BarChart3 size={15} />
                  </div>
                  <div>
                    <h2 className="profile-page__section-title">{t('profile.activityBreakdown')}</h2>
                    <p className="profile-page__section-desc">{t('profile.activityBreakdownDesc')}</p>
                  </div>
                </div>
                {activityBreakdown.length === 0 ? (
                  <p className="profile-page__empty-note">{t('profile.noActivity')}</p>
                ) : (
                  <div className="profile-page__breakdown-list">
                    {activityBreakdown.map(([type, count], i) => {
                      const pal = paletteAt(i + 2);
                      const max = activityBreakdown[0][1];
                      return (
                        <div key={type} className="profile-page__breakdown-row">
                          <span className="profile-page__breakdown-label">{type}</span>
                          <div className="profile-page__breakdown-track">
                            <div
                              className="profile-page__breakdown-fill"
                              style={{ width: `${Math.round((count / max) * 100)}%`, background: pal.grad }}
                            />
                          </div>
                          <span className="profile-page__breakdown-count">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="profile-page__section profile-page__section--glass">
                <div className="profile-page__section-head">
                  <div className="profile-page__section-icon profile-page__section-icon--amber">
                    <Shield size={15} />
                  </div>
                  <div>
                    <h2 className="profile-page__section-title">{t('profile.securityChecklist')}</h2>
                    <p className="profile-page__section-desc">{t('profile.securityChecklistDesc')}</p>
                  </div>
                </div>
                <ul className="profile-page__checklist">
                  {securityChecklist.map((item) => {
                    const pal = paletteAt(item.paletteIndex);
                    return (
                      <li key={item.label} className={`profile-page__check-item${item.done ? ' profile-page__check-item--done' : ''}`}>
                        <span className="profile-page__check-icon" style={item.done ? { background: pal.soft, color: pal.solid } : undefined}>
                          {item.done ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                        </span>
                        <span>{item.label}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="profile-page__section profile-page__section--glass profile-page__section--span-full">
                <div className="profile-page__section-head">
                  <div className="profile-page__section-icon profile-page__section-icon--teal">
                    <Bell size={15} />
                  </div>
                  <div>
                    <h2 className="profile-page__section-title">{t('profile.prefSummary')}</h2>
                    <p className="profile-page__section-desc">{t('profile.prefSummaryDesc')}</p>
                  </div>
                </div>
                <div className="profile-page__chip-grid">
                  {prefRows.map(([key, label, paletteIndex]) => {
                    const pal = paletteAt(paletteIndex);
                    const on = prefs?.[key as keyof UserPreferences] ?? false;
                    return (
                      <span
                        key={key}
                        className={`profile-page__chip${on ? ' profile-page__chip--on' : ''}`}
                        style={on ? { background: pal.soft, color: pal.dark, borderColor: `${pal.solid}44` } : undefined}
                      >
                        {on ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                        {label}
                      </span>
                    );
                  })}
                </div>
              </section>

              <section className="profile-page__section profile-page__section--glass profile-page__section--span-full">
                <div className="profile-page__section-head">
                  <div className="profile-page__section-icon profile-page__section-icon--blue">
                    <Activity size={15} />
                  </div>
                  <div>
                    <h2 className="profile-page__section-title">{t('profile.recentTimeline')}</h2>
                    <p className="profile-page__section-desc">{t('profile.recentTimelineDesc')}</p>
                  </div>
                </div>
                {activity.length === 0 ? (
                  <p className="profile-page__empty-note">{t('profile.noActivity')}</p>
                ) : (
                  <div className="profile-page__timeline">
                    {activity.slice(0, 6).map((a, i) => {
                      const Icon = ACTIVITY_ICONS[a.type] ?? Activity;
                      const pal = paletteAt(i % DASHBOARD_PALETTE.length);
                      const color = a.color || pal.solid;
                      return (
                        <div key={`${a.time}-${i}`} className="profile-page__timeline-row">
                          <div className="profile-page__timeline-rail" style={{ background: `${color}22` }}>
                            <span className="profile-page__timeline-dot" style={{ background: color }} />
                          </div>
                          <div className="profile-page__timeline-card">
                            <div className="profile-page__timeline-icon" style={{ background: `${color}18`, color }}>
                              <Icon size={14} />
                            </div>
                            <div className="profile-page__timeline-copy">
                              <p className="profile-page__timeline-title">{a.action}</p>
                              <span className="profile-page__timeline-time">
                                <Clock size={10} /> {a.time_label}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {activeTab === 'info' && (
          <div className="profile-page__content-stack profile-page__content-stack--wide-grid">
            <section className="profile-page__section profile-page__section--glass profile-page__section--span-full profile-page__score-hero">
              <div className="profile-page__score-hero-inner">
                <div className="profile-page__score-hero-copy">
                  <p className="profile-page__score-hero-eyebrow">{t('profile.accountSnapshot')}</p>
                  <h2 className="profile-page__score-hero-title">{t('profile.profileStrength', { percent: profileCompletion })}</h2>
                  <p className="profile-page__score-hero-desc">{t('profile.accountSnapshotDesc')}</p>
                  <div className="profile-page__score-hero-track">
                    <div className="profile-page__score-hero-fill" style={{ width: `${profileCompletion}%`, background: paletteAt(6).grad }} />
                  </div>
                </div>
                <div className="profile-page__score-hero-stats">
                  <div className="profile-page__score-hero-stat">
                    <TrendingUp size={16} />
                    <span>{profileCompletion}%</span>
                    <small>{t('profile.profileCompletion')}</small>
                  </div>
                  <div className="profile-page__score-hero-stat">
                    <Shield size={16} />
                    <span>{securityScore}%</span>
                    <small>{t('profile.securityScore')}</small>
                  </div>
                  <div className="profile-page__score-hero-stat">
                    <CheckCircle size={16} />
                    <span>{checklistDoneCount}/{securityChecklist.length}</span>
                    <small>{t('profile.securityChecklist')}</small>
                  </div>
                </div>
              </div>
            </section>

            <section className="profile-page__section profile-page__section--glass profile-page__section--span-full">
              <div className="profile-page__section-head">
                <div className="profile-page__section-icon profile-page__section-icon--blue">
                  <User size={15} />
                </div>
                <div>
                  <h2 className="profile-page__section-title">{t('profile.personalInformation')}</h2>
                  <p className="profile-page__section-desc">{t('profile.personalInfoDesc')}</p>
                </div>
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
                <div className="profile-page__info-grid profile-page__info-grid--clean">
                  {infoFields.map((item, index) => {
                    const Icon = item.icon;
                    const pal = paletteAt(item.paletteIndex);
                    return (
                      <div
                        key={item.label}
                        className="profile-page__info-card profile-page__info-card--clean"
                        style={{ '--profile-accent': pal.solid, '--profile-accent-soft': pal.soft } as CSSProperties}
                      >
                        <div className="profile-page__info-icon">
                          <Icon size={14} />
                        </div>
                        <div className="profile-page__info-copy">
                          <p className="profile-page__info-label">{item.label}</p>
                          <p className="profile-page__info-value">{item.value}</p>
                        </div>
                        <span className="profile-page__info-index">{String(index + 1).padStart(2, '0')}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="profile-page__section profile-page__section--glass profile-page__section--span-full">
              <div className="profile-page__section-head">
                <div className="profile-page__section-icon profile-page__section-icon--violet">
                  <Activity size={15} />
                </div>
                <div>
                  <h2 className="profile-page__section-title">{t('profile.recentActivity')}</h2>
                  <p className="profile-page__section-desc">{t('profile.recentActivityDesc')}</p>
                </div>
              </div>
              {activity.length === 0 ? (
                <p className="profile-page__empty-note">{t('profile.noActivity')}</p>
              ) : (
                <div className="profile-page__activity-list">
                  {activity.map((a, i) => {
                    const Icon = ACTIVITY_ICONS[a.type] ?? Activity;
                    const pal = paletteAt(i % DASHBOARD_PALETTE.length);
                    const color = a.color || pal.solid;
                    return (
                      <div key={`${a.time}-${i}`} className="profile-page__activity-row">
                        <div className="profile-page__activity-icon" style={{ background: `${color}18`, color }}>
                          <Icon size={13} />
                        </div>
                        <div className="profile-page__activity-copy">
                          <p className="profile-page__activity-title">{a.action}</p>
                          <span className="profile-page__activity-time">
                            <Clock size={10} /> {a.time_label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="profile-page__section profile-page__section--glass profile-page__section--span-full">
              <div className="profile-page__section-head">
                <div className="profile-page__section-icon profile-page__section-icon--violet">
                  <Award size={15} />
                </div>
                <div>
                  <h2 className="profile-page__section-title">{t('profile.capabilities')}</h2>
                  <p className="profile-page__section-desc">{t('profile.capabilitiesDesc')}</p>
                </div>
              </div>
              <div className="profile-page__cap-grid">
                {roleCapabilities.map((cap, i) => {
                  const pal = paletteAt(i + 7);
                  return (
                    <div key={cap} className="profile-page__cap-card" style={{ '--profile-accent': pal.solid, '--profile-accent-soft': pal.soft } as CSSProperties}>
                      <Award size={16} style={{ color: pal.solid }} />
                      <span>{cap}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="profile-page__content-stack profile-page__content-stack--wide-grid">
            <section className="profile-page__section profile-page__section--glass profile-page__section--span-full profile-page__score-hero profile-page__score-hero--security">
              <div className="profile-page__score-hero-inner">
                <div className="profile-page__score-hero-copy">
                  <p className="profile-page__score-hero-eyebrow">{t('profile.securityOverview')}</p>
                  <h2 className="profile-page__score-hero-title">{t('profile.securityScore')}: {securityScore}%</h2>
                  <p className="profile-page__score-hero-desc">{t('profile.securityOverviewDesc')}</p>
                  <div className="profile-page__score-hero-track">
                    <div className="profile-page__score-hero-fill" style={{ width: `${securityScore}%`, background: paletteAt(8).grad }} />
                  </div>
                </div>
                <div className="profile-page__score-hero-stats">
                  <div className="profile-page__score-hero-stat">
                    <Fingerprint size={16} />
                    <span>{prefs?.two_factor_enabled ? t('profile.active') : t('profile.twoFactorDisabled')}</span>
                    <small>{t('profile.twoFactor')}</small>
                  </div>
                  <div className="profile-page__score-hero-stat">
                    <TrendingUp size={16} />
                    <span>{loginSuccessRate}%</span>
                    <small>{t('profile.loginSuccessRate')}</small>
                  </div>
                  <div className="profile-page__score-hero-stat">
                    <CheckCircle size={16} />
                    <span>{checklistDoneCount}/{securityChecklist.length}</span>
                    <small>{t('profile.securityChecklist')}</small>
                  </div>
                </div>
              </div>
            </section>

            <div className="profile-page__section--span-full">
              <EmailVerificationPanel />
            </div>

            <div className="profile-page__security-pair profile-page__section--span-full">
            <section className="profile-page__section profile-page__section--glass profile-page__section--equal">
              <div className="profile-page__section-head">
                <div className="profile-page__section-icon profile-page__section-icon--amber">
                  <Key size={15} />
                </div>
                <div>
                  <h2 className="profile-page__section-title">{t('profile.changePassword')}</h2>
                  <p className="profile-page__section-desc">{t('profile.changePasswordDesc')}</p>
                </div>
              </div>
              <div className="profile-page__card-body">
                <div className="profile-page__form-stack">
                  <div>
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
                            <div key={i} className="profile-page__strength-bar" style={{ background: i <= pwStrength ? paletteAt(i).solid : 'rgba(148,163,184,0.2)' }} />
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
                <button type="button" onClick={handleChangePassword} disabled={changingPw} className="profile-page__password-btn profile-page__password-btn--clean profile-page__card-footer-btn">
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
            </section>

            <section className="profile-page__section profile-page__section--glass profile-page__section--equal">
              <div className="profile-page__section-head">
                <div className="profile-page__section-icon profile-page__section-icon--blue">
                  <Shield size={15} />
                </div>
                <div>
                  <h2 className="profile-page__section-title">{t('profile.securitySettings')}</h2>
                  <p className="profile-page__section-desc">{t('profile.securitySettingsDesc')}</p>
                </div>
              </div>
              <div className="profile-page__card-body">
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
                    style={prefs?.two_factor_enabled ? { background: paletteAt(8).grad } : undefined}
                  >
                    <span className="notifications-page__toggle-knob" />
                  </button>
                </div>
                {([
                  ['login_notifications', t('profile.loginNotifications'), t('profile.loginNotificationsDesc'), 5],
                  ['suspicious_alerts', t('profile.suspiciousAlerts'), t('profile.suspiciousAlertsDesc'), 0],
                ] as const).map(([key, label, desc, paletteIndex]) => (
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
                      style={prefs?.[key] ? { background: paletteAt(paletteIndex).grad } : undefined}
                    >
                      <span className="notifications-page__toggle-knob" />
                    </button>
                  </div>
                ))}
                <div className="profile-page__session-banner profile-page__card-footer-banner">
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
            </section>
            </div>

            <section className="profile-page__section profile-page__section--glass profile-page__section--span-full">
              <div className="profile-page__section-head">
                <div className="profile-page__section-icon profile-page__section-icon--teal">
                  <Bell size={15} />
                </div>
                <div>
                  <h2 className="profile-page__section-title">{t('profile.notificationsPrefs')}</h2>
                  <p className="profile-page__section-desc">{t('pages.profile.heroSubtitle')}</p>
                </div>
              </div>
              <div className="profile-page__prefs profile-page__prefs--clean">
                {prefRows.map(([key, label, paletteIndex]) => {
                  const pal = paletteAt(paletteIndex);
                  return (
                    <div key={key} className="profile-page__pref-row-clean">
                      <span className="profile-page__pref-label">{label}</span>
                      <button
                        type="button"
                        aria-pressed={prefs?.[key] ?? false}
                        disabled={!prefs || prefSaving === key}
                        onClick={() => handlePreferenceToggle(key)}
                        className={`notifications-page__toggle${prefs?.[key] ? ' notifications-page__toggle--on' : ''}`}
                        style={prefs?.[key] ? { background: pal.grad } : undefined}
                      >
                        <span className="notifications-page__toggle-knob" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="profile-page__section profile-page__section--glass profile-page__section--danger profile-page__section--span-full">
              <div className="profile-page__section-head">
                <div className="profile-page__section-icon profile-page__section-icon--red">
                  <AlertCircle size={15} />
                </div>
                <div>
                  <h2 className="profile-page__section-title">{t('profile.dangerZone')}</h2>
                  <p className="profile-page__section-desc">{t('profile.dangerZoneDesc')}</p>
                </div>
              </div>
              {accountActionsLocked && (
                <div className="profile-page__danger-admin-note">
                  <Shield size={15} />
                  <p>{t('profile.adminAccountProtected')}</p>
                </div>
              )}
              <div className="profile-page__danger-grid">
                <div className="profile-page__danger-card">
                  <div className="profile-page__danger-card-head">
                    <span className="profile-page__danger-card-icon profile-page__danger-card-icon--warn">
                      <LogOut size={16} />
                    </span>
                    <div>
                      <h3 className="profile-page__danger-card-title">{t('profile.deactivateAccount')}</h3>
                      <p className="profile-page__danger-card-desc">{t('profile.deactivateAccountDesc')}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="profile-page__danger-btn profile-page__danger-btn--outline"
                    disabled={deactivating || accountActionsLocked}
                    onClick={handleDeactivate}
                  >
                    {deactivating ? <Loader2 size={13} className="profile-page__spinner" /> : <LogOut size={13} />}
                    {t('profile.deactivateAccount')}
                  </button>
                </div>

                <div className="profile-page__danger-card profile-page__danger-card--delete">
                  <div className="profile-page__danger-card-head">
                    <span className="profile-page__danger-card-icon profile-page__danger-card-icon--delete">
                      <Trash2 size={16} />
                    </span>
                    <div>
                      <h3 className="profile-page__danger-card-title">{t('profile.deleteAccount')}</h3>
                      <p className="profile-page__danger-card-desc">{t('profile.deleteAccountDesc')}</p>
                    </div>
                  </div>
                  {accountActionsLocked ? (
                    <button
                      type="button"
                      className="profile-page__danger-btn profile-page__danger-btn--solid"
                      disabled
                    >
                      <Trash2 size={13} />
                      {t('profile.deleteAccount')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="profile-page__danger-btn profile-page__danger-btn--solid"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 size={13} />
                      {t('profile.deleteAccount')}
                    </button>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="profile-page__content-stack profile-page__content-stack--wide-grid">
            <div className="profile-page__session-stats profile-page__section--span-full">
              <div className="profile-page__session-stat-card" style={{ '--profile-accent': paletteAt(5).solid, '--profile-accent-soft': paletteAt(5).soft } as CSSProperties}>
                <Monitor size={18} />
                <span>{sessions.length}</span>
                <small>{t('profile.activeDevices')}</small>
              </div>
              <div className="profile-page__session-stat-card" style={{ '--profile-accent': paletteAt(6).solid, '--profile-accent-soft': paletteAt(6).soft } as CSSProperties}>
                <Globe size={18} />
                <span>{sessions.filter((s) => !s.current).length}</span>
                <small>{t('profile.otherSessions')}</small>
              </div>
              <div className="profile-page__session-stat-card" style={{ '--profile-accent': paletteAt(4).solid, '--profile-accent-soft': paletteAt(4).soft } as CSSProperties}>
                <TrendingUp size={18} />
                <span>{loginSuccessRate}%</span>
                <small>{t('profile.loginSuccessRate')}</small>
              </div>
              <div className="profile-page__session-stat-card" style={{ '--profile-accent': paletteAt(8).solid, '--profile-accent-soft': paletteAt(8).soft } as CSSProperties}>
                <Clock size={18} />
                <span>{formatLastLogin(user.last_login, t('profile.justNow'))}</span>
                <small>{t('profile.lastLogin')}</small>
              </div>
            </div>

            <section className="profile-page__section profile-page__section--glass">
              <div className="profile-page__section-head profile-page__section-head--split">
                <div className="profile-page__section-head">
                  <div className="profile-page__section-icon profile-page__section-icon--cyan">
                    <Globe size={15} />
                  </div>
                  <div>
                    <h2 className="profile-page__section-title">{t('profile.activeSessions')}</h2>
                    <p className="profile-page__section-desc">{t('profile.activeSessionsDesc')}</p>
                  </div>
                </div>
                <button type="button" className="profile-page__revoke-btn" disabled={revoking} onClick={handleRevokeOthers}>
                  {revoking ? <Loader2 size={11} className="profile-page__spinner" /> : <LogOut size={11} />}
                  {t('profile.revokeOthers')}
                </button>
              </div>
              <div className="profile-page__sessions profile-page__sessions--clean">
                {sessions.map((s, i) => {
                  const pal = paletteAt(i % DASHBOARD_PALETTE.length);
                  return (
                    <div
                      key={s.id ?? `session-${i}`}
                      className={`profile-page__session-row profile-page__session-row--clean${s.current ? ' profile-page__session-row--current' : ''}`}
                      style={s.current ? { '--profile-accent': pal.solid, '--profile-accent-soft': pal.soft } as CSSProperties : undefined}
                    >
                      <div className="profile-page__session-icon">
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
                  );
                })}
              </div>
            </section>

            <LoginHistoryCard events={loginHistory} />
          </div>
        )}
          </div>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) resetDeleteDialog(); else setDeleteDialogOpen(true); }}>
        <DialogContent accent="danger" className="profile-page__delete-dialog max-w-md">
          <DialogHeader>
            <DialogTitle className="profile-page__delete-dialog-title">
              <span className="profile-page__danger-card-icon profile-page__danger-card-icon--delete">
                <Trash2 size={16} />
              </span>
              {t('profile.deleteAccountDialogTitle')}
            </DialogTitle>
            <DialogDescription className="profile-page__delete-dialog-desc">
              {t('profile.deleteAccountDialogDesc')}
            </DialogDescription>
          </DialogHeader>

          <ul className="profile-page__delete-rules">
            {deleteRules.map((key) => (
              <li key={key}>
                <AlertCircle size={14} />
                <span>{t(`profile.${key}`)}</span>
              </li>
            ))}
          </ul>

          <div className="profile-page__delete-dialog-form">
            <Label className="enforcement-page__form-label">{t('profile.deletePasswordLabel')}</Label>
            <div className="relative mt-1.5">
              <Input
                type={showDeletePassword ? 'text' : 'password'}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder={t('profile.deletePasswordPlaceholder')}
                className="pr-10"
              />
              <button type="button" onClick={() => setShowDeletePassword(!showDeletePassword)} className="profile-page__eye-btn">
                {showDeletePassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <DialogFooter className="profile-page__delete-dialog-footer">
            <button type="button" className="profile-page__danger-btn profile-page__danger-btn--ghost" disabled={deleting} onClick={resetDeleteDialog}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="profile-page__danger-btn profile-page__danger-btn--solid"
              disabled={deleting || !deletePassword}
              onClick={handleDeleteAccount}
            >
              {deleting ? <Loader2 size={13} className="profile-page__spinner" /> : <Trash2 size={13} />}
              {t('profile.deleteConfirmAction')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
