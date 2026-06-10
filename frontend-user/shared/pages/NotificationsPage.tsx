import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bell, CheckCheck, FileText, Camera, AlertTriangle, Info,
  Settings, Trash2, BellOff, TrendingUp, Clock, RefreshCw,
  ChevronRight, Shield, Car, Zap,
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { useLiveData } from '@shared/hooks/useLiveData';
import { notificationsAPI, profileAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { Notification, NotificationType, UserPreferences } from '@shared/types';

type FilterTab = 'all' | 'unread' | NotificationType;

const TYPE_META: Record<NotificationType, {
  labelKey: string;
  icon: typeof FileText;
  variant: 'rose' | 'violet' | 'amber' | 'blue';
  gradient: string;
  bg: string;
  color: string;
}> = {
  fine: {
    labelKey: 'notifications.typeFine',
    icon: FileText,
    variant: 'rose',
    gradient: 'linear-gradient(135deg, #EF4444, #DC2626)',
    bg: 'rgba(239,68,68,0.1)',
    color: '#DC2626',
  },
  detection: {
    labelKey: 'notifications.typeDetection',
    icon: Camera,
    variant: 'violet',
    gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
    bg: 'rgba(139,92,246,0.1)',
    color: '#7C3AED',
  },
  alert: {
    labelKey: 'notifications.typeAlert',
    icon: AlertTriangle,
    variant: 'amber',
    gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
    bg: 'rgba(245,158,11,0.1)',
    color: '#D97706',
  },
  system: {
    labelKey: 'notifications.typeSystem',
    icon: Info,
    variant: 'blue',
    gradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
    bg: 'rgba(37,99,235,0.1)',
    color: '#2563EB',
  },
};

const TYPE_TABS: NotificationType[] = ['fine', 'detection', 'alert', 'system'];

const QUICK_ACTIONS = [
  { labelKey: 'notifications.markAllRead', icon: CheckCheck, variant: 'blue', action: 'markAll' },
  { labelKey: 'notifications.muteHour', icon: BellOff, variant: 'violet', action: 'mute' },
  { labelKey: 'notifications.clearRead', icon: Trash2, variant: 'rose', action: 'clear' },
  { labelKey: 'notifications.refreshFeed', icon: RefreshCw, variant: 'emerald', action: 'refresh' },
] as const;

const PREF_ROWS = [
  { apiKey: 'notify_fines' as const, labelKey: 'notifications.prefFineIssued', descKey: 'notifications.prefFineDesc', icon: FileText, variant: 'rose' },
  { apiKey: 'notify_detections' as const, labelKey: 'notifications.prefDetections', descKey: 'notifications.prefDetectionsDesc', icon: Camera, variant: 'violet' },
  { apiKey: 'notify_alerts' as const, labelKey: 'notifications.prefSystemAlerts', descKey: 'notifications.prefSystemAlertsDesc', icon: AlertTriangle, variant: 'amber' },
  { apiKey: 'suspicious_alerts' as const, labelKey: 'notifications.prefSecurity', descKey: 'notifications.prefSecurityDesc', icon: Shield, variant: 'blue' },
  { apiKey: 'notify_system' as const, labelKey: 'notifications.prefVehicles', descKey: 'notifications.prefVehiclesDesc', icon: Car, variant: 'emerald' },
  { apiKey: 'login_notifications' as const, labelKey: 'notifications.prefRealtime', descKey: 'notifications.prefRealtimeDesc', icon: Zap, variant: 'amber' },
];

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function groupByDate(
  notifications: Notification[],
  labels: Record<string, string>,
): Record<string, Notification[]> {
  const groups: Record<string, Notification[]> = {};
  notifications.forEach((n) => {
    const d = new Date(n.created_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    let key: string;
    if (diffDays === 0) key = labels.today;
    else if (diffDays === 1) key = labels.yesterday;
    else if (diffDays < 7) key = labels.thisWeek;
    else key = labels.older;
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  });
  return groups;
}

function isMuted(prefs: UserPreferences | null) {
  if (!prefs?.muted_until) return false;
  return new Date(prefs.muted_until).getTime() > Date.now();
}

export function NotificationsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [prefSaving, setPrefSaving] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const groupLabels = useMemo(() => ({
    today: t('notifications.groupToday'),
    yesterday: t('notifications.groupYesterday'),
    thisWeek: t('notifications.groupThisWeek'),
    older: t('notifications.groupOlder'),
  }), [t]);

  const loadNotifications = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const data = await notificationsAPI.getByUser(user.id);
      setNotifications(data);
    } catch {
      if (!silent) toast.error(t('notifications.toastLoadFail'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [t, user]);

  const loadPreferences = useCallback(async () => {
    try {
      const overview = await profileAPI.getOverview();
      setPrefs(overview.preferences);
    } catch {
      /* prefs optional on first load */
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void loadNotifications();
    void loadPreferences();
  }, [user?.id, loadNotifications, loadPreferences]);

  useLiveData(() => loadNotifications(true), 30_000, Boolean(user));

  const handleMarkRead = async (id: number) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {
      toast.error(t('notifications.toastMarkReadFail'));
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    setActionBusy('markAll');
    try {
      await notificationsAPI.markAllRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success(t('notifications.toastMarkAll'));
    } catch {
      toast.error(t('notifications.toastMarkAllFail'));
    } finally {
      setActionBusy(null);
    }
  };

  const handleMuteHour = async () => {
    setActionBusy('mute');
    try {
      const muted_until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const updated = await profileAPI.updatePreferences({ muted_until });
      setPrefs(updated);
      toast.success(t('notifications.toastMute'));
    } catch {
      toast.error(t('notifications.toastMuteFail'));
    } finally {
      setActionBusy(null);
    }
  };

  const handleClearRead = async () => {
    setActionBusy('clear');
    try {
      await notificationsAPI.clearRead();
      setNotifications((prev) => prev.filter((n) => !n.is_read));
      toast.success(t('notifications.toastClear'));
    } catch {
      toast.error(t('notifications.toastClearFail'));
    } finally {
      setActionBusy(null);
    }
  };

  const handlePreferenceToggle = async (key: keyof UserPreferences) => {
    if (!prefs || key === 'muted_until') return;
    const next = { ...prefs, [key]: !prefs[key] } as UserPreferences;
    setPrefs(next);
    setPrefSaving(key);
    try {
      const updated = await profileAPI.updatePreferences({ [key]: next[key] });
      setPrefs(updated);
      toast.success(t('notifications.toastPrefSaved'));
    } catch {
      setPrefs(prefs);
      toast.error(t('notifications.toastPrefFail'));
    } finally {
      setPrefSaving(null);
    }
  };

  const handleQuickAction = async (action: string) => {
    if (action === 'markAll') await handleMarkAllRead();
    else if (action === 'mute') await handleMuteHour();
    else if (action === 'clear') await handleClearRead();
    else if (action === 'refresh') {
      setActionBusy('refresh');
      await loadNotifications(true);
      toast.success(t('notifications.toastRefresh'));
      setActionBusy(null);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const typeCounts = TYPE_TABS.reduce((acc, type) => {
    acc[type] = notifications.filter((n) => n.type === type).length;
    return acc;
  }, {} as Record<NotificationType, number>);

  const displayed = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    if (filter !== 'all') return n.type === filter;
    return true;
  });

  const grouped = groupByDate(displayed, groupLabels);
  const groupOrder = [groupLabels.today, groupLabels.yesterday, groupLabels.thisWeek, groupLabels.older];
  const muted = isMuted(prefs);

  const heroSubtitle = muted
    ? t('notifications.mutedUntil', { time: prefs?.muted_until ? timeAgo(prefs.muted_until) : '' })
    : unreadCount > 1
      ? t('pages.notifications.unreadMany', { count: unreadCount })
      : unreadCount === 1
        ? t('pages.notifications.unreadOne')
        : t('pages.notifications.allCaughtUp');

  return (
    <div className="enforcement-page enforcement-page--notifications dashboard-page--notifications">
      <div className="notifications-page__layout">
        <div className="notifications-page__main">
          <div className="enforcement-page__hero">
            <div className="enforcement-page__hero-glow--primary" aria-hidden />
            <div className="enforcement-page__hero-glow--secondary" aria-hidden />
            <div className="enforcement-page__hero-inner">
              <div>
                <div className="enforcement-page__eyebrow">
                  <span className="enforcement-page__eyebrow-icon notifications-page__bell-icon">
                    <Bell size={14} />
                    {unreadCount > 0 && !muted && <span className="notifications-page__bell-dot" aria-hidden />}
                  </span>
                  {t('pages.notifications.eyebrow')}
                </div>
                <h1 className="enforcement-page__title">{t('pages.notifications.title')}</h1>
                <p className={`enforcement-page__subtitle notifications-page__hero-meta${unreadCount > 0 && !muted ? ' notifications-page__hero-meta--unread' : ''}`}>
                  {heroSubtitle}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="enforcement-page__hero-btn enforcement-page__hero-btn--blue"
                  onClick={handleMarkAllRead}
                  disabled={actionBusy === 'markAll'}
                >
                  <CheckCheck size={16} />
                  {t('pages.notifications.markAllRead')}
                </button>
              )}
            </div>
          </div>

          <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
            {TYPE_TABS.map((type) => {
              const meta = TYPE_META[type];
              const Icon = meta.icon;
              const active = filter === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilter(active ? 'all' : type)}
                  className={`enforcement-page__stat-card enforcement-page__stat-card--${meta.variant}${active ? ' enforcement-page__stat-card--active' : ''}`}
                >
                  <div className={`enforcement-page__stat-icon enforcement-page__stat-icon--${meta.variant}`}>
                    <Icon size={18} />
                  </div>
                  <div className="enforcement-page__stat-copy">
                    <p className="enforcement-page__stat-value">{typeCounts[type]}</p>
                    <p className={`enforcement-page__stat-label enforcement-page__stat-label--${meta.variant}`}>
                      {t(meta.labelKey)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="enforcement-page__toolbar">
            <div className="enforcement-page__filters">
              {(['all', 'unread'] as const).map((tab) => {
                const active = filter === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilter(tab)}
                    className={`enforcement-page__filter-btn${active ? ' enforcement-page__filter-btn--active' : ''}`}
                    style={active ? { background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' } : undefined}
                  >
                    {tab === 'all' ? t('notifications.filterAll') : t('notifications.filterUnread')}
                    {tab === 'unread' && unreadCount > 0 && (
                      <span className={`enforcement-page__filter-count${active ? ' enforcement-page__filter-count--active' : ''}`}>
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="enforcement-page__panel enforcement-page__panel--notifications">
            {loading ? (
              <div className="notifications-page__feed-skeleton">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="enforcement-page__skeleton notifications-page__feed-skeleton-row" />
                ))}
              </div>
            ) : displayed.length === 0 ? (
              <div className="notifications-page__empty">
                <div className="enforcement-page__empty-icon enforcement-page__empty-icon--blue">
                  <Bell size={28} />
                </div>
                <p className="enforcement-page__empty-title">{t('notifications.empty')}</p>
                <p className="enforcement-page__empty-subtitle">
                  {filter === 'unread' ? t('notifications.emptyUnread') : t('notifications.emptyAll')}
                </p>
              </div>
            ) : (
              <div className="notifications-page__feed">
                {groupOrder.filter((g) => grouped[g]?.length).map((group) => (
                  <section key={group} className="notifications-page__group">
                    <div className="notifications-page__group-head">
                      <p className="notifications-page__group-label">{group}</p>
                      <div className="notifications-page__group-line" />
                      <span className="notifications-page__group-count">{grouped[group].length}</span>
                    </div>
                    <div className="notifications-page__group-list">
                      {grouped[group].map((n) => {
                        const meta = TYPE_META[n.type];
                        const Icon = meta.icon;
                        return (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => !n.is_read && handleMarkRead(n.id)}
                            className={`notifications-page__item${n.is_read ? ' notifications-page__item--read' : ' notifications-page__item--unread'}`}
                          >
                            <div className={`notifications-page__item-icon notifications-page__item-icon--${meta.variant}`}>
                              <Icon size={15} />
                            </div>
                            <div className="notifications-page__item-body">
                              <div className="notifications-page__item-top">
                                <p className="notifications-page__item-title">{n.title}</p>
                                <div className="notifications-page__item-meta">
                                  <span className="notifications-page__item-time">
                                    <Clock size={9} /> {timeAgo(n.created_at)}
                                  </span>
                                  {!n.is_read && <span className="notifications-page__item-dot" aria-hidden />}
                                </div>
                              </div>
                              <p className="notifications-page__item-message">{n.message}</p>
                              <div className="notifications-page__item-foot">
                                <span className="enforcement-page__badge" style={{ background: meta.bg, color: meta.color }}>
                                  {t(meta.labelKey)}
                                </span>
                                {!n.is_read && (
                                  <span className="notifications-page__mark-hint">{t('notifications.clickMarkRead')}</span>
                                )}
                              </div>
                            </div>
                            <ChevronRight size={14} className="notifications-page__item-chevron" />
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="notifications-page__sidebar">
          <div className="enforcement-page__panel notifications-page__side-panel">
            <div className="notifications-page__side-head">
              <div className="notifications-page__side-icon notifications-page__side-icon--blue">
                <Zap size={14} />
              </div>
              <p className="notifications-page__side-title">{t('notifications.quickActions')}</p>
            </div>
            <div className="notifications-page__quick-actions">
              {QUICK_ACTIONS.map((qa) => {
                const Icon = qa.icon;
                return (
                  <button
                    key={qa.action}
                    type="button"
                    disabled={actionBusy === qa.action}
                    onClick={() => handleQuickAction(qa.action)}
                    className={`notifications-page__quick-btn notifications-page__quick-btn--${qa.variant}`}
                  >
                    <span className={`notifications-page__quick-icon notifications-page__quick-icon--${qa.variant}`}>
                      <Icon size={15} />
                    </span>
                    <span>{t(qa.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="enforcement-page__panel notifications-page__side-panel">
            <div className="notifications-page__side-head">
              <div className="notifications-page__side-icon notifications-page__side-icon--blue">
                <TrendingUp size={14} />
              </div>
              <p className="notifications-page__side-title">{t('notifications.summary')}</p>
            </div>
            <div className="notifications-page__summary-list">
              {TYPE_TABS.map((type) => {
                const meta = TYPE_META[type];
                const count = typeCounts[type] || 0;
                const pct = notifications.length ? Math.round((count / notifications.length) * 100) : 0;
                return (
                  <div key={type} className="notifications-page__summary-row">
                    <div className="notifications-page__summary-labels">
                      <span>{t(meta.labelKey)}</span>
                      <span style={{ color: meta.color }}>{count}</span>
                    </div>
                    <div className="notifications-page__summary-track">
                      <div className="notifications-page__summary-bar" style={{ width: `${pct}%`, background: meta.gradient }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="notifications-page__summary-footer">
              <div className="notifications-page__summary-stat">
                <span>{t('notifications.total')}</span>
                <strong>{notifications.length}</strong>
              </div>
              <div className="notifications-page__summary-stat">
                <span>{t('notifications.unread')}</span>
                <strong className="notifications-page__summary-unread">{unreadCount}</strong>
              </div>
            </div>
          </div>

          <div className="enforcement-page__panel notifications-page__side-panel">
            <div className="notifications-page__side-head">
              <div className="notifications-page__side-icon notifications-page__side-icon--blue">
                <Settings size={14} />
              </div>
              <p className="notifications-page__side-title">{t('notifications.preferences')}</p>
            </div>
            <div className="notifications-page__prefs">
              {PREF_ROWS.map((pref) => {
                const Icon = pref.icon;
                const enabled = prefs ? Boolean(prefs[pref.apiKey]) : false;
                return (
                  <div key={pref.apiKey} className="notifications-page__pref-row">
                    <div className="notifications-page__pref-copy">
                      <div className={`notifications-page__pref-icon notifications-page__pref-icon--${pref.variant}`}>
                        <Icon size={13} />
                      </div>
                      <div>
                        <p className="notifications-page__pref-label">{t(pref.labelKey)}</p>
                        <p className="notifications-page__pref-desc">{t(pref.descKey)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-pressed={enabled}
                      disabled={!prefs || prefSaving === pref.apiKey}
                      onClick={() => handlePreferenceToggle(pref.apiKey)}
                      className={`notifications-page__toggle${enabled ? ' notifications-page__toggle--on' : ''}`}
                    >
                      <span className="notifications-page__toggle-knob" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
