import { useEffect, useState } from 'react';
import { useTranslation } from '@camtraffic/ui';
import type {
  OfficerDashboardActivities,
  OfficerDashboardCameraStatus,
  OfficerDashboardCharts,
  OfficerDashboardNotificationCenter,
  OfficerDashboardStats,
} from '@camtraffic/types';

interface OfficerDashboardHomeProps {
  sampleDate: string;
  onLoadStats: () => Promise<OfficerDashboardStats>;
  onLoadCharts: () => Promise<OfficerDashboardCharts>;
  onLoadActivities: () => Promise<OfficerDashboardActivities>;
  onLoadCameraStatus: () => Promise<OfficerDashboardCameraStatus>;
  onLoadNotifications: () => Promise<OfficerDashboardNotificationCenter>;
}

export function OfficerDashboardHome({
  sampleDate,
  onLoadStats,
  onLoadCharts,
  onLoadActivities,
  onLoadCameraStatus,
  onLoadNotifications,
}: OfficerDashboardHomeProps) {
  const { t, locale } = useTranslation();
  const [stats, setStats] = useState<OfficerDashboardStats | null>(null);
  const [charts, setCharts] = useState<OfficerDashboardCharts | null>(null);
  const [activities, setActivities] = useState<OfficerDashboardActivities | null>(null);
  const [cameraStatus, setCameraStatus] = useState<OfficerDashboardCameraStatus | null>(null);
  const [notifications, setNotifications] = useState<OfficerDashboardNotificationCenter | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    onLoadStats()
      .then((data) => {
        setStats(data);
        setErrorMessage(null);
      })
      .catch(() => setErrorMessage(t.errors.generic));
  }, [onLoadStats, t.errors.generic]);

  useEffect(() => {
    onLoadCharts()
      .then((data) => {
        setCharts(data);
        setErrorMessage(null);
      })
      .catch(() => setErrorMessage(t.errors.generic));
  }, [onLoadCharts, t.errors.generic]);

  useEffect(() => {
    onLoadActivities()
      .then((data) => {
        setActivities(data);
        setErrorMessage(null);
      })
      .catch(() => setErrorMessage(t.errors.generic));
  }, [onLoadActivities, t.errors.generic]);

  useEffect(() => {
    onLoadCameraStatus()
      .then((data) => {
        setCameraStatus(data);
        setErrorMessage(null);
      })
      .catch(() => setErrorMessage(t.errors.generic));
  }, [onLoadCameraStatus, t.errors.generic]);

  useEffect(() => {
    onLoadNotifications()
      .then((data) => {
        setNotifications(data);
        setErrorMessage(null);
      })
      .catch(() => setErrorMessage(t.errors.generic));
  }, [onLoadNotifications, t.errors.generic]);

  return (
    <div className="dashboard">

      {/* Header */}
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__title">{t.nav.dashboard}</h1>
          {stats ? (
            <p className="dashboard__subtitle">
              {stats.station_name} · Badge <strong>{stats.badge_number}</strong>
              {stats.rank ? ` · ${stats.rank}` : ''} · {sampleDate}
            </p>
          ) : (
            <p className="dashboard__subtitle">{sampleDate}</p>
          )}
        </div>
        <div className="dashboard__header-actions">
          {stats && stats.violations_pending > 0 && (
            <span className="dashboard__badge dashboard__badge--warning">
              {stats.violations_pending} Pending Review
            </span>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="dashboard__error" role="alert">{errorMessage}</div>
      )}

      {/* KPI Row */}
      <div className="dashboard__kpi-row">
        <div className="dashboard-kpi-card dashboard-kpi-card--warning">
          <div className="dashboard-kpi-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="dashboard-kpi-card__content">
            <span className="dashboard-kpi-card__label">Pending Review</span>
            <strong className="dashboard-kpi-card__value">{stats ? stats.violations_pending.toLocaleString() : '—'}</strong>
            <span className="dashboard-kpi-card__sub">{stats ? `${stats.total_violations} total violations` : t.common.loading}</span>
          </div>
        </div>

        <div className="dashboard-kpi-card dashboard-kpi-card--success">
          <div className="dashboard-kpi-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div className="dashboard-kpi-card__content">
            <span className="dashboard-kpi-card__label">Approved</span>
            <strong className="dashboard-kpi-card__value">{stats ? stats.violations_approved.toLocaleString() : '—'}</strong>
            <span className="dashboard-kpi-card__sub">{stats ? `${stats.violations_rejected} rejected` : t.common.loading}</span>
          </div>
        </div>

        <div className="dashboard-kpi-card dashboard-kpi-card--info">
          <div className="dashboard-kpi-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="dashboard-kpi-card__content">
            <span className="dashboard-kpi-card__label">Detections Today</span>
            <strong className="dashboard-kpi-card__value">{stats ? stats.detections_today.toLocaleString() : '—'}</strong>
            <span className="dashboard-kpi-card__sub">{stats ? `${stats.reviewed_by_me} reviewed by me` : t.common.loading}</span>
          </div>
        </div>

        <div className="dashboard-kpi-card dashboard-kpi-card--primary">
          <div className="dashboard-kpi-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>
          </div>
          <div className="dashboard-kpi-card__content">
            <span className="dashboard-kpi-card__label">Cameras Online</span>
            <strong className="dashboard-kpi-card__value">{stats ? `${stats.cameras_online}/${stats.total_cameras}` : '—'}</strong>
            <span className="dashboard-kpi-card__sub">{stats ? `${Math.round((stats.cameras_online / Math.max(stats.total_cameras, 1)) * 100)}% availability` : t.common.loading}</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard__grid">

        {/* Left: Violations triage charts */}
        <div className="dashboard__col dashboard__col--main">

          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <h3 className="dashboard-card__title">{t.nav.violations} by Day (7 days)</h3>
            </div>
            <div className="dashboard-card__body">
              {charts ? (
                <div className="dashboard-bar-chart">
                  {charts.violations_by_day.map((point) => {
                    const max = Math.max(...charts.violations_by_day.map(p => p.value), 1);
                    return (
                      <div className="dashboard-bar-chart__row" key={point.label}>
                        <span className="dashboard-bar-chart__label">{point.label.slice(5)}</span>
                        <div className="dashboard-bar-chart__track">
                          <div className="dashboard-bar-chart__fill" style={{ width: `${Math.round((point.value / max) * 100)}%` }} />
                        </div>
                        <strong className="dashboard-bar-chart__value">{point.value}</strong>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="dashboard-skeleton">
                  {[1,2,3,4,5,6,7].map(i => <div key={i} className="dashboard-skeleton__bar" style={{ width: `${40 + i * 8}%` }} />)}
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <h3 className="dashboard-card__title">{t.nav.violations} by Status</h3>
            </div>
            <div className="dashboard-card__body">
              {charts ? (
                <div className="dashboard-bar-chart">
                  {charts.violations_by_status.map((point) => {
                    const max = Math.max(...charts.violations_by_status.map(p => p.value), 1);
                    const colorMap: Record<string, string> = { pending: 'warning', approved: 'success', rejected: 'danger', paid: 'info' };
                    return (
                      <div className="dashboard-bar-chart__row" key={point.label}>
                        <span className="dashboard-bar-chart__label">{point.label}</span>
                        <div className="dashboard-bar-chart__track">
                          <div className={`dashboard-bar-chart__fill dashboard-bar-chart__fill--${colorMap[point.label?.toLowerCase()] ?? 'primary'}`} style={{ width: `${Math.round((point.value / max) * 100)}%` }} />
                        </div>
                        <strong className="dashboard-bar-chart__value">{point.value}</strong>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="dashboard__loading">{t.common.loading}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Camera status + activity + notifications */}
        <div className="dashboard__col dashboard__col--side">

          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <h3 className="dashboard-card__title">{t.nav.cameras} Status</h3>
              {cameraStatus && (
                <span className="dashboard-badge dashboard-badge--primary">{cameraStatus.total_cameras} total</span>
              )}
            </div>
            <div className="dashboard-card__body">
              {cameraStatus ? (
                <>
                  <div className="dashboard-camera-summary">
                    <div className="dashboard-camera-summary__item dashboard-camera-summary__item--success">
                      <strong>{cameraStatus.online}</strong>
                      <span>Online</span>
                    </div>
                    <div className="dashboard-camera-summary__item dashboard-camera-summary__item--danger">
                      <strong>{cameraStatus.offline}</strong>
                      <span>Offline</span>
                    </div>
                    <div className="dashboard-camera-summary__item dashboard-camera-summary__item--warning">
                      <strong>{cameraStatus.maintenance}</strong>
                      <span>Maintenance</span>
                    </div>
                    <div className="dashboard-camera-summary__item dashboard-camera-summary__item--muted">
                      <strong>{cameraStatus.error}</strong>
                      <span>Error</span>
                    </div>
                  </div>
                  <div className="dashboard-camera-list">
                    {cameraStatus.health_items.slice(0, 5).map((cam) => (
                      <div className="dashboard-camera-list__item" key={cam.code}>
                        <span className={`dashboard-camera-list__dot dashboard-camera-list__dot--${cam.status === 'online' ? 'success' : cam.status === 'offline' ? 'danger' : 'warning'}`} />
                        <div className="dashboard-camera-list__info">
                          <span className="dashboard-camera-list__name">{cam.name}</span>
                          <span className="dashboard-camera-list__location">{cam.location}</span>
                        </div>
                        <span className="dashboard-camera-list__status">{cam.status}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="dashboard__loading">{t.common.loading}</p>
              )}
            </div>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <h3 className="dashboard-card__title">Recent Station Activity</h3>
            </div>
            <div className="dashboard-card__body">
              {activities ? (
                <div className="dashboard-activity-list">
                  {activities.items.length === 0 ? (
                    <p className="dashboard__empty">No recent activity at your station.</p>
                  ) : (
                    activities.items.slice(0, 6).map((item) => (
                      <div className="dashboard-activity-list__item" key={`${item.type}-${item.timestamp}`}>
                        <div className="dashboard-activity-list__dot" />
                        <div className="dashboard-activity-list__body">
                          <span className="dashboard-activity-list__title">{item.title}</span>
                          <span className="dashboard-activity-list__meta">{item.subtitle} · {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <p className="dashboard__loading">{t.common.loading}</p>
              )}
            </div>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <h3 className="dashboard-card__title">{t.nav.notifications}</h3>
              {notifications && notifications.unread > 0 && (
                <span className="dashboard-badge dashboard-badge--danger">{notifications.unread} unread</span>
              )}
            </div>
            <div className="dashboard-card__body">
              {notifications ? (
                <div className="dashboard-notification-list">
                  {notifications.latest.length === 0 ? (
                    <p className="dashboard__empty">No notifications.</p>
                  ) : (
                    notifications.latest.slice(0, 5).map((item) => (
                      <div className={`dashboard-notification-list__item ${!item.is_read ? 'dashboard-notification-list__item--unread' : ''}`} key={item.id}>
                        <span className="dashboard-notification-list__title">{item.title}</span>
                        <span className="dashboard-notification-list__meta">{new Date(item.created_at).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <p className="dashboard__loading">{t.common.loading}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
