import { useEffect, useState } from 'react';
import { Button, Card, Input } from '@camtraffic/ui';
import type {
  CameraHealthMonitoring,
  CameraHealthRecord,
  CameraHealthState,
  CameraStatus,
  PoliceStationOption,
} from '@camtraffic/types';

interface CameraHealthMonitoringPanelProps {
  onLoadStations: () => Promise<PoliceStationOption[]>;
  onLoad: (params?: {
    search?: string;
    station_id?: string;
    status?: string;
    health_state?: string;
  }) => Promise<CameraHealthMonitoring>;
  onRunCheck: (cameraId: number) => Promise<{ record: CameraHealthRecord; message: string }>;
  onRunCheckAll: () => Promise<{ checkedCount: number; message: string }>;
}

const STATUS_OPTIONS: CameraStatus[] = ['online', 'offline', 'maintenance', 'error'];
const HEALTH_STATE_OPTIONS: CameraHealthState[] = ['healthy', 'warning', 'critical', 'unknown'];
const REFRESH_INTERVAL_MS = 60_000;

function healthStateLabel(state: CameraHealthState): string {
  return state.charAt(0).toUpperCase() + state.slice(1);
}

export function CameraHealthMonitoringPanel({
  onLoadStations,
  onLoad,
  onRunCheck,
  onRunCheckAll,
}: CameraHealthMonitoringPanelProps) {
  const [stations, setStations] = useState<PoliceStationOption[]>([]);
  const [monitoring, setMonitoring] = useState<CameraHealthMonitoring | null>(null);
  const [search, setSearch] = useState('');
  const [stationFilter, setStationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [healthStateFilter, setHealthStateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh(
    nextSearch = search,
    nextStationFilter = stationFilter,
    nextStatusFilter = statusFilter,
    nextHealthStateFilter = healthStateFilter,
  ) {
    setLoading(true);
    setError(null);
    try {
      const data = await onLoad({
        search: nextSearch || undefined,
        station_id: nextStationFilter || undefined,
        status: nextStatusFilter || undefined,
        health_state: nextHealthStateFilter || undefined,
      });
      setMonitoring(data);
    } catch {
      setError('Unable to load camera health monitoring data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const stationData = await onLoadStations();
        setStations(stationData);
      } catch {
        setError('Unable to load police stations for health filters.');
      }
      await refresh('', '', '', '');
    }

    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh(search, stationFilter, statusFilter, healthStateFilter);
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, stationFilter, statusFilter, healthStateFilter]);

  async function handleRunCheck(cameraId: number) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onRunCheck(cameraId);
      setMessage(result.message);
      await refresh();
    } catch {
      setError('Unable to run camera health check.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRunCheckAll() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onRunCheckAll();
      setMessage(result.message);
      await refresh();
    } catch {
      setError('Unable to run health checks for all cameras.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Camera Health Monitoring" subtitle="Task 049 — Health status, stale checks, and probe actions">
      {monitoring ? (
        <div className="dashboard-stats camera-health-summary">
          <article className="dashboard-stats__item">
            <p>Monitored cameras</p>
            <strong>{monitoring.total_cameras}</strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Healthy</p>
            <strong>{monitoring.healthy_cameras}</strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Warning</p>
            <strong>{monitoring.warning_cameras}</strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Critical</p>
            <strong>{monitoring.critical_cameras}</strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Unknown</p>
            <strong>{monitoring.unknown_cameras}</strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Stale checks</p>
            <strong>{monitoring.stale_check_cameras}</strong>
          </article>
        </div>
      ) : null}

      <div className="camera-health-toolbar">
        <Input label="Search" name="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <label className="auth-form__field">
          <span className="auth-form__label">Station filter</span>
          <select
            className="auth-form__select"
            value={stationFilter}
            onChange={(event) => setStationFilter(event.target.value)}
          >
            <option value="">All stations</option>
            {stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.code} — {station.name}
              </option>
            ))}
          </select>
        </label>
        <label className="auth-form__field">
          <span className="auth-form__label">Status filter</span>
          <select
            className="auth-form__select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="auth-form__field">
          <span className="auth-form__label">Health state</span>
          <select
            className="auth-form__select"
            value={healthStateFilter}
            onChange={(event) => setHealthStateFilter(event.target.value)}
          >
            <option value="">All health states</option>
            {HEALTH_STATE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {healthStateLabel(option)}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          variant="secondary"
          onClick={() => refresh(search, stationFilter, statusFilter, healthStateFilter)}
          isLoading={loading}
        >
          Refresh
        </Button>
        <Button type="button" onClick={handleRunCheckAll} isLoading={saving}>
          Check all cameras
        </Button>
      </div>

      {loading && !monitoring ? <p className="auth-form__hint">Loading camera health data...</p> : null}
      {error ? <p className="auth-form__error">{error}</p> : null}
      {message ? <p className="auth-form__success">{message}</p> : null}

      <div className="camera-health-list">
        {monitoring?.cameras.length === 0 && !loading ? (
          <p className="auth-form__hint">No cameras match the current health filters.</p>
        ) : null}
        {monitoring?.cameras.map((camera) => (
          <article
            className={`camera-health-list__item camera-health-list__item--${camera.health_state}`}
            key={camera.id}
          >
            <p>
              <strong>
                {camera.name} ({camera.code})
              </strong>{' '}
              · {healthStateLabel(camera.health_state)} · {camera.status}
            </p>
            <p className="auth-form__hint">
              {camera.location}
              {camera.station_name ? ` · ${camera.station_code} ${camera.station_name}` : ' · No station assigned'}
            </p>
            <p className="auth-form__hint">
              {camera.last_health_check
                ? `Last check ${new Date(camera.last_health_check).toLocaleString()}`
                : 'Never checked'}
              {camera.minutes_since_check != null ? ` · ${camera.minutes_since_check} min ago` : ''}
              {camera.has_stream_url ? ' · Stream configured' : ' · No stream URL'}
            </p>
            <div className="camera-health-list__actions">
              <Button type="button" variant="secondary" onClick={() => handleRunCheck(camera.id)} isLoading={saving}>
                Run health check
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
