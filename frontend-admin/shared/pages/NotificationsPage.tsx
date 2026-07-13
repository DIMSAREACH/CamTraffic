import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bell, CheckCheck, FileText, Camera, AlertTriangle, Info,
  Trash2, Clock, RefreshCw, ChevronRight, LayoutGrid, List,
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { useLiveData } from '@shared/hooks/useLiveData';
import { notificationsAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { Notification, NotificationType } from '@shared/types';
import { DASHBOARD_PALETTE } from '@shared/constants/chartPalette';
import type { CSSProperties } from 'react';

type FilterTab = 'all' | 'unread' | NotificationType;
type ViewMode = 'row' | 'card';

type TypeMeta = {
  labelKey: string;
  icon: typeof FileText;
  solid: string;
  dark: string;
  soft: string;
  grad: string;
  bg: string;
  color: string;
};

const TYPE_META: Record<NotificationType, TypeMeta> = {
  fine: {
    labelKey: 'notifications.typeFine',
    icon: FileText,
    ...pickPalette(0),
  },
  detection: {
    labelKey: 'notifications.typeDetection',
    icon: Camera,
    ...pickPalette(8),
  },
  alert: {
    labelKey: 'notifications.typeAlert',
    icon: AlertTriangle,
    ...pickPalette(1),
  },
  system: {
    labelKey: 'notifications.typeSystem',
    icon: Info,
    ...pickPalette(6),
  },
};

function pickPalette(index: number) {
  const p = DASHBOARD_PALETTE[index % DASHBOARD_PALETTE.length];
  return {
    solid: p.solid,
    dark: p.dark,
    soft: p.soft,
    grad: p.grad,
    bg: p.soft,
    color: p.dark,
  };
}

function typeIconStyle(meta: TypeMeta): CSSProperties {
  return { background: meta.soft, color: meta.solid };
}

function typeBadgeStyle(meta: TypeMeta): CSSProperties {
  return { background: meta.soft, color: meta.dark };
}

function typeActiveTileStyle(meta: TypeMeta): CSSProperties {
  return {
    background: `linear-gradient(135deg, ${meta.soft}, rgba(255, 255, 255, 0.4))`,
    borderColor: `${meta.solid}55`,
    boxShadow: `0 12px 28px ${meta.soft}`,
  };
}

function typeUnreadRowStyle(meta: TypeMeta): CSSProperties {
  return {
    borderLeftColor: meta.solid,
    background: `linear-gradient(90deg, ${meta.soft} 0%, transparent 42%)`,
  };
}

function typeUnreadCardStyle(meta: TypeMeta): CSSProperties {
  return {
    borderLeftColor: meta.solid,
    boxShadow: `0 4px 18px ${meta.soft}`,
  };
}

const TYPE_TABS: NotificationType[] = ['fine', 'detection', 'alert', 'system'];

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

function NotificationRowList({
  grouped,
  groupOrder,
  onMarkRead,
  t,
}: {
  grouped: Record<string, Notification[]>;
  groupOrder: string[];
  onMarkRead: (id: number) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const activeGroups = groupOrder.filter((g) => grouped[g]?.length);

  return (
    <div className="notifications-page__list">
      {activeGroups.map((group, groupIndex) => {
        const sectionColor = DASHBOARD_PALETTE[groupIndex % DASHBOARD_PALETTE.length].solid;
        return (
        <section key={group} className="notifications-page__list-section">
          <div className="notifications-page__list-section-head">
            <span
              className="notifications-page__list-section-label"
              style={{ color: sectionColor }}
            >
              {group}
            </span>
            <span
              className="notifications-page__list-section-count"
              style={{ background: `${sectionColor}22`, color: sectionColor }}
            >
              {grouped[group].length}
            </span>
          </div>
          <ul className="notifications-page__list-rows">
            {grouped[group].map((n) => {
              const meta = TYPE_META[n.type];
              const Icon = meta.icon;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`notifications-page__row${n.is_read ? ' notifications-page__row--read' : ' notifications-page__row--unread'}`}
                    style={!n.is_read ? typeUnreadRowStyle(meta) : undefined}
                    onClick={() => !n.is_read && onMarkRead(n.id)}
                  >
                    <div className="notifications-page__row-icon" style={typeIconStyle(meta)}>
                      <Icon size={17} />
                    </div>

                    <div className="notifications-page__row-body">
                      <div className="notifications-page__row-topline">
                        <span className="notifications-page__row-badge" style={typeBadgeStyle(meta)}>
                          {t(meta.labelKey)}
                        </span>
                        {!n.is_read && (
                          <span
                            className="notifications-page__row-unread-dot"
                            style={{ background: meta.solid }}
                            aria-hidden
                          />
                        )}
                      </div>
                      <p className="notifications-page__row-title">{n.title}</p>
                      <p className="notifications-page__row-message">{n.message}</p>
                    </div>

                    <div className="notifications-page__row-aside">
                      <span className="notifications-page__row-time">
                        <Clock size={12} />
                        {timeAgo(n.created_at)}
                      </span>
                      {!n.is_read ? (
                        <span className="notifications-page__row-action">
                          <CheckCheck size={14} />
                          {t('notifications.markRead')}
                        </span>
                      ) : (
                        <span className="notifications-page__row-read-label">{t('notifications.statusRead')}</span>
                      )}
                      <ChevronRight size={15} className="notifications-page__row-chevron" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
        );
      })}
    </div>
  );
}

function NotificationCardItem({
  notification: n,
  onMarkRead,
  t,
}: {
  notification: Notification;
  onMarkRead: (id: number) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const meta = TYPE_META[n.type];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={() => !n.is_read && onMarkRead(n.id)}
      className={`notifications-page__card${n.is_read ? ' notifications-page__card--read' : ' notifications-page__card--unread'}`}
      style={!n.is_read ? typeUnreadCardStyle(meta) : undefined}
    >
      <div className="notifications-page__card-top">
        <div className="notifications-page__item-icon" style={typeIconStyle(meta)}>
          <Icon size={16} />
        </div>
        <span className="notifications-page__row-badge" style={typeBadgeStyle(meta)}>
          {t(meta.labelKey)}
        </span>
        {!n.is_read && (
          <span className="notifications-page__card-dot" style={{ background: meta.solid }} aria-hidden />
        )}
      </div>
      <h3 className="notifications-page__card-title">{n.title}</h3>
      <p className="notifications-page__card-message">{n.message}</p>
      <div className="notifications-page__card-foot">
        <span className="notifications-page__row-time">
          <Clock size={11} />
          {timeAgo(n.created_at)}
        </span>
        {!n.is_read ? (
          <span className="notifications-page__row-action">
            <CheckCheck size={13} />
            {t('notifications.markRead')}
          </span>
        ) : (
          <span className="notifications-page__row-read-label">{t('notifications.statusRead')}</span>
        )}
      </div>
    </button>
  );
}

function NotificationCardGrid({
  grouped,
  groupOrder,
  onMarkRead,
  t,
}: {
  grouped: Record<string, Notification[]>;
  groupOrder: string[];
  onMarkRead: (id: number) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const activeGroups = groupOrder.filter((g) => grouped[g]?.length);

  return (
    <div className="notifications-page__list notifications-page__list--cards">
      {activeGroups.map((group, groupIndex) => {
        const sectionColor = DASHBOARD_PALETTE[groupIndex % DASHBOARD_PALETTE.length].solid;
        return (
        <section key={group} className="notifications-page__list-section">
          <div className="notifications-page__list-section-head">
            <span
              className="notifications-page__list-section-label"
              style={{ color: sectionColor }}
            >
              {group}
            </span>
            <span
              className="notifications-page__list-section-count"
              style={{ background: `${sectionColor}22`, color: sectionColor }}
            >
              {grouped[group].length}
            </span>
          </div>
          <div className="notifications-page__card-grid">
            {grouped[group].map((n) => (
              <NotificationCardItem key={n.id} notification={n} onMarkRead={onMarkRead} t={t} />
            ))}
          </div>
        </section>
        );
      })}
    </div>
  );
}

export function NotificationsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('row');
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

  useEffect(() => {
    if (!user) return;
    void loadNotifications();
  }, [user?.id, loadNotifications]);

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

  const heroSubtitle = unreadCount > 1
    ? t('pages.notifications.unreadMany', { count: unreadCount })
    : unreadCount === 1
      ? t('pages.notifications.unreadOne')
      : t('pages.notifications.allCaughtUp');

  return (
    <div className="enforcement-page enforcement-page--notifications dashboard-page--notifications notifications-page--full notifications-page--clean">
      <div className="notifications-page__shell">
        <div className="enforcement-page__hero notifications-page__hero">
          <div className="enforcement-page__hero-glow--primary" aria-hidden />
          <div className="enforcement-page__hero-glow--secondary" aria-hidden />
          <div className="enforcement-page__hero-inner notifications-page__hero-inner--slim">
            <div>
              <div className="enforcement-page__eyebrow">
                <span className="enforcement-page__eyebrow-icon notifications-page__bell-icon">
                  <Bell size={14} />
                  {unreadCount > 0 && <span className="notifications-page__bell-dot" aria-hidden />}
                </span>
                {t('pages.notifications.eyebrow')}
              </div>
              <h1 className="enforcement-page__title">{t('pages.notifications.title')}</h1>
              <p className={`enforcement-page__subtitle notifications-page__hero-meta${unreadCount > 0 ? ' notifications-page__hero-meta--unread' : ''}`}>
                {heroSubtitle}
              </p>
            </div>
            <div className="notifications-page__hero-actions">
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
              <button
                type="button"
                className="enforcement-page__hero-btn"
                onClick={() => {
                  setActionBusy('refresh');
                  void loadNotifications(true).finally(() => setActionBusy(null));
                }}
                disabled={actionBusy === 'refresh'}
              >
                <RefreshCw size={16} className={actionBusy === 'refresh' ? 'notifications-page__spin' : ''} />
                {t('notifications.refreshFeed')}
              </button>
            </div>
          </div>
        </div>

        <div className="notifications-page__metrics-strip">
          {TYPE_TABS.map((type) => {
            const meta = TYPE_META[type];
            const Icon = meta.icon;
            const active = filter === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setFilter(active ? 'all' : type)}
                className={`notifications-page__metric-tile${active ? ' notifications-page__metric-tile--active' : ''}`}
                style={active ? typeActiveTileStyle(meta) : undefined}
              >
                <div className="notifications-page__metric-tile-icon" style={typeIconStyle(meta)}>
                  <Icon size={18} />
                </div>
                <div className="notifications-page__metric-tile-copy">
                  <p className="notifications-page__metric-tile-value" style={active ? { color: meta.dark } : undefined}>
                    {typeCounts[type]}
                  </p>
                  <p className="notifications-page__metric-tile-label">{t(meta.labelKey)}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="notifications-page__toolbar">
          <div className="enforcement-page__filters">
            {(['all', 'unread'] as const).map((tab) => {
              const tabActive = filter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`enforcement-page__filter-btn${tabActive ? ' enforcement-page__filter-btn--active' : ''}`}
                >
                  {tab === 'all' ? t('notifications.filterAll') : t('notifications.filterUnread')}
                  {tab === 'unread' && unreadCount > 0 && (
                    <span className={`enforcement-page__filter-count${tabActive ? ' enforcement-page__filter-count--active' : ''}`}>
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
            {filter !== 'all' && filter !== 'unread' && (
              <button
                type="button"
                className="notifications-page__clear-filter"
                onClick={() => setFilter('all')}
              >
                {t('notifications.clearTypeFilter')}
              </button>
            )}
          </div>

          <div className="notifications-page__toolbar-right">
            <button
              type="button"
              className="notifications-page__toolbar-btn"
              onClick={handleClearRead}
              disabled={actionBusy === 'clear'}
            >
              <Trash2 size={14} />
              {t('notifications.clearRead')}
            </button>
            <div className="notifications-page__view-toggle" role="group" aria-label={t('notifications.viewAs')}>
              <button
                type="button"
                aria-pressed={viewMode === 'row'}
                className={`notifications-page__view-btn${viewMode === 'row' ? ' notifications-page__view-btn--active' : ''}`}
                onClick={() => setViewMode('row')}
              >
                <List size={15} />
                <span>{t('notifications.viewRows')}</span>
              </button>
              <button
                type="button"
                aria-pressed={viewMode === 'card'}
                className={`notifications-page__view-btn${viewMode === 'card' ? ' notifications-page__view-btn--active' : ''}`}
                onClick={() => setViewMode('card')}
              >
                <LayoutGrid size={15} />
                <span>{t('notifications.viewCards')}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="enforcement-page__panel enforcement-page__panel--notifications notifications-page__feed-panel notifications-page__feed-panel--clean">
          {loading ? (
            viewMode === 'card' ? (
              <div className="notifications-page__card-grid notifications-page__card-grid--skeleton">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="enforcement-page__skeleton notifications-page__card-skeleton" />
                ))}
              </div>
            ) : (
              <div className="notifications-page__list-skeleton">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="enforcement-page__skeleton notifications-page__row-skeleton" />
                ))}
              </div>
            )
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
          ) : viewMode === 'card' ? (
            <NotificationCardGrid
              grouped={grouped}
              groupOrder={groupOrder}
              onMarkRead={handleMarkRead}
              t={t}
            />
          ) : (
            <NotificationRowList
              grouped={grouped}
              groupOrder={groupOrder}
              onMarkRead={handleMarkRead}
              t={t}
            />
          )}
        </div>
      </div>
    </div>
  );
}
