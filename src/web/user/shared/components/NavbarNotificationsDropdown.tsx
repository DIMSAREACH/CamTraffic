import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle, Bell, Camera, CheckCheck, FileText, Info, Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@shared/components/ui/dropdown-menu';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { notificationsAPI } from '@shared/services/api';
import type { Notification, NotificationType } from '@shared/types';
import { cn } from '@shared/components/ui/utils';

type TypeMeta = {
  labelKey: string;
  icon: typeof FileText;
  soft: string;
  solid: string;
};

const TYPE_META: Record<NotificationType, TypeMeta> = {
  fine: { labelKey: 'notifications.typeFine', icon: FileText, soft: 'rgba(139,92,246,0.14)', solid: '#7C3AED' },
  violation: { labelKey: 'notifications.typeViolation', icon: AlertTriangle, soft: 'rgba(239,68,68,0.14)', solid: '#DC2626' },
  detection: { labelKey: 'notifications.typeDetection', icon: Camera, soft: 'rgba(37,99,235,0.14)', solid: '#2563EB' },
  alert: { labelKey: 'notifications.typeAlert', icon: AlertTriangle, soft: 'rgba(245,158,11,0.16)', solid: '#D97706' },
  system: { labelKey: 'notifications.typeSystem', icon: Info, soft: 'rgba(14,165,233,0.14)', solid: '#0284C7' },
};

function metaForType(type: string | undefined | null): TypeMeta {
  if (type && type in TYPE_META) return TYPE_META[type as NotificationType];
  return TYPE_META.system;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(0, mins)}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

interface NavbarNotificationsDropdownProps {
  unreadCount: number;
  pathPrefix: string;
  onUnreadCountChange?: (count: number) => void;
}

export function NavbarNotificationsDropdown({
  unreadCount,
  pathPrefix,
  onUnreadCountChange,
}: NavbarNotificationsDropdownProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [markingAll, setMarkingAll] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await notificationsAPI.getByUser(user.id);
      const sorted = [...list].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setItems(sorted.slice(0, 8));
      onUnreadCountChange?.(sorted.filter((n) => !n.is_read).length);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user, onUnreadCountChange]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const markRead = async (id: number) => {
    try {
      await notificationsAPI.markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      const next = Math.max(0, unreadCount - 1);
      onUnreadCountChange?.(next);
    } catch {
      /* ignore */
    }
  };

  const markAllRead = async () => {
    if (!user || markingAll || unreadCount < 1) return;
    setMarkingAll(true);
    try {
      await notificationsAPI.markAllRead(user.id);
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      onUnreadCountChange?.(0);
    } catch {
      /* ignore */
    } finally {
      setMarkingAll(false);
    }
  };

  const goAll = () => {
    setOpen(false);
    navigate(`${pathPrefix}/notifications`);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'app-navbar__icon-btn relative cursor-pointer p-2.5 rounded-xl',
            unreadCount > 0 && 'app-navbar__icon-btn--active',
            open && 'app-navbar__icon-btn--open',
          )}
          aria-label={
            unreadCount > 0
              ? t('navbar.notificationsUnread', { count: unreadCount })
              : t('navbar.notifications')
          }
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <>
              <span className="app-navbar__notif-count absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full animate-ping opacity-40 bg-red-500" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="app-navbar__notif-dropdown w-[min(100vw-1.5rem,22.5rem)] p-0 overflow-hidden"
      >
        <div className="app-navbar__notif-dropdown-head">
          <div>
            <p className="app-navbar__notif-dropdown-title">{t('navbar.notifications')}</p>
            <p className="app-navbar__notif-dropdown-sub">
              {unreadCount > 0
                ? t('navbar.notificationsUnread', { count: unreadCount })
                : t('notifications.emptyUnread')}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              className="app-navbar__notif-dropdown-markall"
              onClick={() => void markAllRead()}
              disabled={markingAll}
            >
              <CheckCheck size={14} />
              {t('notifications.markAllRead')}
            </button>
          )}
        </div>

        <div className="app-navbar__notif-dropdown-list">
          {loading ? (
            <div className="app-navbar__notif-dropdown-empty">
              <Loader2 size={18} className="animate-spin" />
              <span>{t('common.loading')}</span>
            </div>
          ) : items.length === 0 ? (
            <div className="app-navbar__notif-dropdown-empty">
              <Bell size={18} />
              <span>{t('notifications.empty')}</span>
            </div>
          ) : (
            items.map((n) => {
              const meta = metaForType(n.type);
              const Icon = meta.icon;
              return (
                <button
                  key={n.id}
                  type="button"
                  className={cn(
                    'app-navbar__notif-dropdown-item',
                    !n.is_read && 'is-unread',
                  )}
                  onClick={() => {
                    if (!n.is_read) void markRead(n.id);
                  }}
                >
                  <span
                    className="app-navbar__notif-dropdown-icon"
                    style={{ background: meta.soft, color: meta.solid }}
                  >
                    <Icon size={15} />
                  </span>
                  <span className="app-navbar__notif-dropdown-body">
                    <span className="app-navbar__notif-dropdown-item-top">
                      <span className="app-navbar__notif-dropdown-item-title">{n.title}</span>
                      <span className="app-navbar__notif-dropdown-item-time">{timeAgo(n.created_at)}</span>
                    </span>
                    <span className="app-navbar__notif-dropdown-item-msg">{n.message}</span>
                  </span>
                  {!n.is_read && <span className="app-navbar__notif-dropdown-dot" aria-hidden />}
                </button>
              );
            })
          )}
        </div>

        <div className="app-navbar__notif-dropdown-foot">
          <button type="button" className="app-navbar__notif-dropdown-viewall" onClick={goAll}>
            {t('notifications.viewAll')}
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
