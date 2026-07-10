import { useState, useRef, useEffect } from 'react';
import { cn } from '@camtraffic/utils';

export interface Notification {
  id: string;
  title: string;
  message?: string;
  timestamp: string;
  isRead?: boolean;
  variant?: 'info' | 'success' | 'warning' | 'danger';
}

export interface NotificationBellProps {
  notifications: Notification[];
  onNotificationClick?: (notification: Notification) => void;
  onMarkAllRead?: () => void;
  className?: string;
}

export function NotificationBell({
  notifications,
  onNotificationClick,
  onMarkAllRead,
  className,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className={cn('ct-notification-bell', className)} ref={panelRef}>
      <button
        type="button"
        className="ct-notification-bell__trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 ? <span className="ct-notification-bell__badge">{unreadCount}</span> : null}
      </button>
      {isOpen ? (
        <div className="ct-notification-panel">
          <div className="ct-notification-panel__header">
            <h3 className="ct-notification-panel__title">Notifications</h3>
            {unreadCount > 0 && onMarkAllRead ? (
              <button
                type="button"
                className="ct-notification-panel__mark-read"
                onClick={onMarkAllRead}
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="ct-notification-panel__list">
            {notifications.length === 0 ? (
              <div className="ct-notification-panel__empty">No notifications</div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={cn(
                    'ct-notification-item',
                    !notification.isRead && 'ct-notification-item--unread',
                    notification.variant && `ct-notification-item--${notification.variant}`,
                  )}
                  onClick={() => {
                    onNotificationClick?.(notification);
                    setIsOpen(false);
                  }}
                >
                  <div className="ct-notification-item__content">
                    <h4 className="ct-notification-item__title">{notification.title}</h4>
                    {notification.message ? (
                      <p className="ct-notification-item__message">{notification.message}</p>
                    ) : null}
                    <time className="ct-notification-item__timestamp">{notification.timestamp}</time>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
