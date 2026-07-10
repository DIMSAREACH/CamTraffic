import { useEffect, useState } from 'react';
import { useTranslation } from '@camtraffic/ui';
import type {
  DriverDashboardActivities,
  DriverDashboardCharts,
  DriverDashboardNotificationCenter,
  DriverDashboardStats,
} from '@camtraffic/types';

interface DriverDashboardHomeProps {
  sampleDate: string;
  onLoadStats: () => Promise<DriverDashboardStats>;
  onLoadCharts: () => Promise<DriverDashboardCharts>;
  onLoadActivities: () => Promise<DriverDashboardActivities>;
  onLoadNotifications: () => Promise<DriverDashboardNotificationCenter>;
}

export function DriverDashboardHome({
  sampleDate,
  onLoadStats,
  onLoadCharts,
  onLoadActivities,
  onLoadNotifications,
}: DriverDashboardHomeProps) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DriverDashboardStats | null>(null);
  const [charts, setCharts] = useState<DriverDashboardCharts | null>(null);
  const [activities, setActivities] = useState<DriverDashboardActivities | null>(null);
  const [notifications, setNotifications] = useState<DriverDashboardNotificationCenter | null>(null);
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
              License <strong>{stats.license_number}</strong>
              {stats.license_expiry ? ` · Expires ${stats.license_expiry}` : ''} · {sampleDate}
            </p>
          ) : (
            <p className="dashboard__subtitle">{sampleDate}</p>
          )}
        </div>
        {stats && stats.fines_overdue > 0 && (
          <div className="dashboard__header-actions">
            <span className="dashboard__badge dashboard__badge--danger">
              {stats.fines_overdue} Overdue Fine{stats.fines_overdue !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="dashboard__error" role="alert">{errorMessage}</div>
      )}

      {/* KPI Row */}
      <div className="dashboard__kpi-row">
        <div className="dashboard-kpi-card dashboard-kpi-card--danger">
          <div className="dashboard-kpi-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div className="dashboard-kpi-card__content">
            <span className="dashboard-kpi-card__label">Outstanding Fines</span>
            <strong className="dashboard-kpi-card__value">{stats ? `${stats.fines_unpaid}/${stats.total_fines}` : '—'}</strong>
            <span className="dashboard-kpi-card__sub">{stats ? `${stats.outstanding_amount.toLocaleString()} KHR outstanding` : t.common.loading}</span>
          </div>
        </div>

        <div className="dashboard-kpi-card dashboard-kpi-card--warning">
          <div className="dashboard-kpi-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="dashboard-kpi-card__content">
            <span className="dashboard-kpi-card__label">Active Violations</span>
            <strong className="dashboard-kpi-card__value">{stats ? stats.violations_pending.toLocaleString() : '—'}</strong>
            <span className="dashboard-kpi-card__sub">{stats ? `${stats.total_violations} total violations` : t.common.loading}</span>
          </div>
        </div>

        <div className="dashboard-kpi-card dashboard-kpi-card--info">
          <div className="dashboard-kpi-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <div className="dashboard-kpi-card__content">
            <span className="dashboard-kpi-card__label">Active Appeals</span>
            <strong className="dashboard-kpi-card__value">{stats ? stats.appeals_active.toLocaleString() : '—'}</strong>
            <span className="dashboard-kpi-card__sub">{stats ? `${stats.fines_overdue} overdue fines` : t.common.loading}</span>
          </div>
        </div>

        <div className="dashboard-kpi-card dashboard-kpi-card--primary">
          <div className="dashboard-kpi-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          </div>
          <div className="dashboard-kpi-card__content">
            <span className="dashboard-kpi-card__label">My Vehicles</span>
            <strong className="dashboard-kpi-card__value">{stats ? stats.total_vehicles.toLocaleString() : '—'}</strong>
            <span className="dashboard-kpi-card__sub">{stats ? `${stats.violations_approved} resolved violations` : t.common.loading}</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard__grid">

        {/* Left: Charts */}
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

            <div className="dashboard-card">
              <div className="dashboard-card__header">
                <h3 className="dashboard-card__title">Fines by Status</h3>
              </div>
              <div className="dashboard-card__body">
                {charts ? (
                  charts.fines_by_status.length === 0 ? (
                    <p className="dashboard__empty">No fines recorded yet.</p>
                  ) : (
                    <div className="dashboard-bar-chart">
                      {charts.fines_by_status.map((point) => {
                        const max = Math.max(...charts.fines_by_status.map(p => p.value), 1);
                        const colorMap: Record<string, string> = { unpaid: 'danger', paid: 'success', overdue: 'warning' };
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
                  )
                ) : (
                  <p className="dashboard__loading">{t.common.loading}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Activity + Notifications */}
        <div className="dashboard__col dashboard__col--side">

          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <h3 className="dashboard-card__title">Recent Activity</h3>
            </div>
            <div className="dashboard-card__body">
              {activities ? (
                <div className="dashboard-activity-list">
                  {activities.items.length === 0 ? (
                    <p className="dashboard__empty">No recent violations or fines.</p>
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
                    <p className="dashboard__empty">No notifications yet.</p>
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
      {stats ? (
        <div className="dashboard-stats">
          <article className="dashboard-stats__item">
            <p>{t.nav.vehicles}</p>
            <strong>{stats.total_vehicles}</strong>
          </article>
          <article className="dashboard-stats__item">
            <p>{t.nav.violations} (pending)</p>
            <strong>
              {stats.violations_pending}/{stats.total_violations}
            </strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Approved</p>
            <strong>{stats.violations_approved}</strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Rejected</p>
            <strong>{stats.violations_rejected}</strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Fines (unpaid)</p>
            <strong>
              {stats.fines_unpaid}/{stats.total_fines}
            </strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Outstanding</p>
            <strong>{stats.outstanding_amount.toLocaleString()} KHR</strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Overdue fines</p>
            <strong>{stats.fines_overdue}</strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Active appeals</p>
            <strong>{stats.appeals_active}</strong>
          </article>
        </div>
      ) : (
        <p className="auth-form__hint">{t.common.loading}</p>
      )}
      {charts ? (
        <div className="dashboard-charts">
          <article className="dashboard-chart">
            <h4>{t.nav.violations} by Day (7d)</h4>
            {charts.violations_by_day.map((point) => (
              <div className="dashboard-chart__row" key={point.label}>
                <span>{point.label.slice(5)}</span>
                <div className="dashboard-chart__bar">
                  <div
                    className="dashboard-chart__fill"
                    style={{ width: `${Math.min(100, point.value * 12)}%` }}
                  />
                </div>
                <strong>{point.value}</strong>
              </div>
            ))}
          </article>
          <article className="dashboard-chart">
            <h4>{t.nav.violations} by Status</h4>
            {charts.violations_by_status.map((point) => (
              <div className="dashboard-chart__row" key={point.label}>
                <span>{point.label}</span>
                <div className="dashboard-chart__bar">
                  <div
                    className="dashboard-chart__fill"
                    style={{ width: `${Math.min(100, point.value * 12)}%` }}
                  />
                </div>
                <strong>{point.value}</strong>
              </div>
            ))}
          </article>
          <article className="dashboard-chart">
            <h4>Fines by Status</h4>
            {charts.fines_by_status.length === 0 ? (
              <p className="auth-form__hint">No fines recorded yet.</p>
            ) : (
              charts.fines_by_status.map((point) => (
                <div className="dashboard-chart__row" key={point.label}>
                  <span>{point.label}</span>
                  <div className="dashboard-chart__bar">
                    <div
                      className="dashboard-chart__fill"
                      style={{ width: `${Math.min(100, point.value * 12)}%` }}
                    />
                  </div>
                  <strong>{point.value}</strong>
                </div>
              ))
            )}
          </article>
        </div>
      ) : (
        <p className="auth-form__hint">{t.common.loading}</p>
      )}
      {activities ? (
        <article className="dashboard-activities">
          <h4>Recent Activity</h4>
          {activities.items.length === 0 ? (
            <p className="auth-form__hint">No recent violations or fines.</p>
          ) : (
            activities.items.map((item) => (
              <div className="dashboard-activities__item" key={`${item.type}-${item.timestamp}-${item.title}`}>
                <p>
                  <strong>{item.title}</strong>
                </p>
                <p className="auth-form__hint">
                  {item.subtitle} · {new Date(item.timestamp).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </article>
      ) : (
        <p className="auth-form__hint">{t.common.loading}</p>
      )}
      {notifications ? (
        <article className="dashboard-notification-center">
          <h4>{t.nav.notifications}</h4>
          <p className="auth-form__hint">
            Total: <strong>{notifications.total}</strong> · Unread: <strong>{notifications.unread}</strong>
          </p>
          {notifications.latest.length === 0 ? (
            <p className="auth-form__hint">No notifications yet.</p>
          ) : (
            notifications.latest.map((item) => (
              <div className="dashboard-notification-center__item" key={item.id}>
                <p>
                  <strong>{item.title}</strong>
                </p>
                <p className="auth-form__hint">
                  {item.is_read ? 'Read' : 'Unread'} · {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </article>
      ) : (
        <p className="auth-form__hint">{t.common.loading}</p>
      )}
    </Card>
  );
}
