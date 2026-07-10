import { useEffect, useState } from 'react';
import { useTranslation } from '@camtraffic/ui';
import type {
  DashboardActivities,
  DashboardAiSummary,
  DashboardCameraStatus,
  DashboardCharts,
  DashboardNotificationCenter,
  DashboardStats,
} from '@camtraffic/types';

interface DashboardHomeProps {
  role: string;
  sampleDate: string;
  onLoadStats: () => Promise<DashboardStats>;
  onLoadCharts: () => Promise<DashboardCharts>;
  onLoadActivities: () => Promise<DashboardActivities>;
  onLoadAiSummary: () => Promise<DashboardAiSummary>;
  onLoadCameraStatus: () => Promise<DashboardCameraStatus>;
  onLoadNotifications: () => Promise<DashboardNotificationCenter>;
}

export function DashboardHome({
  role,
  sampleDate,
  onLoadStats,
  onLoadCharts,
  onLoadActivities,
  onLoadAiSummary,
  onLoadCameraStatus,
  onLoadNotifications,
}: DashboardHomeProps) {
  const { t, locale } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [activities, setActivities] = useState<DashboardActivities | null>(null);
  const [aiSummary, setAiSummary] = useState<DashboardAiSummary | null>(null);
  const [cameraStatus, setCameraStatus] = useState<DashboardCameraStatus | null>(null);
  const [notifications, setNotifications] = useState<DashboardNotificationCenter | null>(null);
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
    onLoadAiSummary()
      .then((data) => {
        setAiSummary(data);
        setErrorMessage(null);
      })
      .catch(() => setErrorMessage(t.errors.generic));
  }, [onLoadAiSummary, t.errors.generic]);

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

      {/* Page Header */}
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__title">{t.nav.dashboard}</h1>
          <p className="dashboard__subtitle">Overview for {sampleDate} · Role: <strong>{role}</strong></p>
        </div>
        <div className="dashboard__header-actions">
          {stats && (
            <span className="dashboard__online-badge">
              <span className="dashboard__online-dot" />
              {stats.cameras_online}/{stats.total_cameras} Cameras Online
            </span>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="dashboard__error" role="alert">{errorMessage}</div>
      )}

      {/* KPI Row */}
      <div className="dashboard__kpi-row">
        <div className="dashboard-kpi-card dashboard-kpi-card--primary">
          <div className="dashboard-kpi-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="dashboard-kpi-card__content">
            <span className="dashboard-kpi-card__label">Total Users</span>
            <strong className="dashboard-kpi-card__value">{stats ? stats.total_users.toLocaleString() : '—'}</strong>
            <span className="dashboard-kpi-card__sub">{stats ? `${stats.total_officers} officers · ${stats.total_drivers} drivers` : t.common.loading}</span>
          </div>
        </div>

        <div className="dashboard-kpi-card dashboard-kpi-card--success">
          <div className="dashboard-kpi-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>
          </div>
          <div className="dashboard-kpi-card__content">
            <span className="dashboard-kpi-card__label">Cameras Online</span>
            <strong className="dashboard-kpi-card__value">{stats ? `${stats.cameras_online}/${stats.total_cameras}` : '—'}</strong>
            <span className="dashboard-kpi-card__sub">{stats ? `${Math.round((stats.cameras_online / Math.max(stats.total_cameras, 1)) * 100)}% availability` : t.common.loading}</span>
          </div>
        </div>

        <div className="dashboard-kpi-card dashboard-kpi-card--warning">
          <div className="dashboard-kpi-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="dashboard-kpi-card__content">
            <span className="dashboard-kpi-card__label">Violations Pending</span>
            <strong className="dashboard-kpi-card__value">{stats ? stats.violations_pending.toLocaleString() : '—'}</strong>
            <span className="dashboard-kpi-card__sub">{stats ? `${stats.total_violations.toLocaleString()} total violations` : t.common.loading}</span>
          </div>
        </div>

        <div className="dashboard-kpi-card dashboard-kpi-card--info">
          <div className="dashboard-kpi-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div className="dashboard-kpi-card__content">
            <span className="dashboard-kpi-card__label">Vehicles Registered</span>
            <strong className="dashboard-kpi-card__value">{stats ? stats.total_vehicles.toLocaleString() : '—'}</strong>
            <span className="dashboard-kpi-card__sub">{stats ? `${stats.total_cameras} cameras deployed` : t.common.loading}</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard__grid">

        {/* Left Column: Charts + AI */}
        <div className="dashboard__col dashboard__col--main">

          {/* Violations Chart */}
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <h3 className="dashboard-card__title">Violations by Day (7 days)</h3>
            </div>
            <div className="dashboard-card__body">
              {charts ? (
                <div className="dashboard-bar-chart">
                  {charts.violations_by_day.map((point) => {
                    const max = Math.max(...charts.violations_by_day.map(p => p.value), 1);
                    const pct = Math.round((point.value / max) * 100);
                    return (
                      <div className="dashboard-bar-chart__row" key={point.label}>
                        <span className="dashboard-bar-chart__label">{point.label.slice(5)}</span>
                        <div className="dashboard-bar-chart__track">
                          <div className="dashboard-bar-chart__fill" style={{ width: `${pct}%` }} />
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

          {/* Violations by Status + AI Summary side by side */}
          <div className="dashboard__row-2">
            <div className="dashboard-card">
              <div className="dashboard-card__header">
                <h3 className="dashboard-card__title">Violations by Status</h3>
              </div>
              <div className="dashboard-card__body">
                {charts ? (
                  <div className="dashboard-bar-chart">
                    {charts.violations_by_status.map((point) => {
                      const max = Math.max(...charts.violations_by_status.map(p => p.value), 1);
                      const statusColor: Record<string, string> = { pending: 'warning', approved: 'success', rejected: 'danger', paid: 'info' };
                      const color = statusColor[point.label?.toLowerCase()] ?? 'primary';
                      return (
                        <div className="dashboard-bar-chart__row" key={point.label}>
                          <span className="dashboard-bar-chart__label">{point.label}</span>
                          <div className="dashboard-bar-chart__track">
                            <div className={`dashboard-bar-chart__fill dashboard-bar-chart__fill--${color}`} style={{ width: `${Math.round((point.value / max) * 100)}%` }} />
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

            {/* AI Summary */}
            <div className="dashboard-card dashboard-card--accent">
              <div className="dashboard-card__header">
                <h3 className="dashboard-card__title">AI Detection Summary</h3>
                <span className="dashboard-badge dashboard-badge--success">Live</span>
              </div>
              <div className="dashboard-card__body">
                {aiSummary ? (
                  <div className="dashboard-ai-grid">
                    <div className="dashboard-ai-metric">
                      <span>Total Detections</span>
                      <strong>{aiSummary.total_detections.toLocaleString()}</strong>
                    </div>
                    <div className="dashboard-ai-metric">
                      <span>Today</span>
                      <strong>{aiSummary.detections_today.toLocaleString()}</strong>
                    </div>
                    <div className="dashboard-ai-metric">
                      <span>Avg Confidence</span>
                      <strong>{(aiSummary.avg_confidence * 100).toFixed(1)}%</strong>
                    </div>
                    <div className="dashboard-ai-metric">
                      <span>Model Accuracy</span>
                      <strong>{(aiSummary.active_model_accuracy * 100).toFixed(1)}%</strong>
                    </div>
                    <div className="dashboard-ai-metric dashboard-ai-metric--full">
                      <span>Active Model</span>
                      <strong>{aiSummary.active_model || 'N/A'}</strong>
                    </div>
                    <div className="dashboard-ai-metric dashboard-ai-metric--full">
                      <span>Top Sign Detected</span>
                      <strong>{aiSummary.top_detected_sign || 'N/A'}</strong>
                    </div>
                  </div>
                ) : (
                  <p className="dashboard__loading">{t.common.loading}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Camera Status + Activity + Notifications */}
        <div className="dashboard__col dashboard__col--side">

          {/* Camera Status */}
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <h3 className="dashboard-card__title">Camera Status</h3>
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
                    {cameraStatus.health_items.slice(0, 6).map((cam) => (
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

          {/* Recent Activity */}
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <h3 className="dashboard-card__title">Recent Activity</h3>
            </div>
            <div className="dashboard-card__body">
              {activities ? (
                <div className="dashboard-activity-list">
                  {activities.items.slice(0, 6).map((item) => (
                    <div className="dashboard-activity-list__item" key={`${item.type}-${item.timestamp}`}>
                      <div className="dashboard-activity-list__dot" />
                      <div className="dashboard-activity-list__body">
                        <span className="dashboard-activity-list__title">{item.title}</span>
                        <span className="dashboard-activity-list__meta">{item.subtitle} · {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                  {activities.items.length === 0 && (
                    <p className="dashboard__empty">No recent activity.</p>
                  )}
                </div>
              ) : (
                <p className="dashboard__loading">{t.common.loading}</p>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <h3 className="dashboard-card__title">Notifications</h3>
              {notifications && notifications.unread > 0 && (
                <span className="dashboard-badge dashboard-badge--danger">{notifications.unread} unread</span>
              )}
            </div>
            <div className="dashboard-card__body">
              {notifications ? (
                <div className="dashboard-notification-list">
                  {notifications.latest.slice(0, 5).map((item) => (
                    <div className={`dashboard-notification-list__item ${!item.is_read ? 'dashboard-notification-list__item--unread' : ''}`} key={item.id}>
                      <span className="dashboard-notification-list__title">{item.title}</span>
                      <span className="dashboard-notification-list__meta">{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                  {notifications.latest.length === 0 && (
                    <p className="dashboard__empty">No notifications.</p>
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
