import { useEffect, useState } from 'react';
import { Button, Card, Input } from '@camtraffic/ui';
import type {
  CameraLiveDashboard,
  CameraLiveFeedItem,
  CameraStatus,
  PoliceStationOption,
} from '@camtraffic/types';

interface LiveCameraDashboardPanelProps {
  onLoadStations: () => Promise<PoliceStationOption[]>;
  onLoad: (params?: { search?: string; station_id?: string; status?: string }) => Promise<CameraLiveDashboard>;
}

const STATUS_OPTIONS: CameraStatus[] = ['online', 'offline', 'maintenance', 'error'];
const REFRESH_INTERVAL_MS = 30_000;

function CameraStreamPreview({ camera }: { camera: CameraLiveFeedItem }) {
  if (!camera.is_stream_available || !camera.stream_url) {
    return (
      <div className="live-camera-dashboard__placeholder">
        <p>{camera.status === 'online' ? 'Stream URL not configured' : `Camera ${camera.status}`}</p>
      </div>
    );
  }

  if (camera.stream_url.startsWith('http://') || camera.stream_url.startsWith('https://')) {
    return <iframe className="live-camera-dashboard__frame" src={camera.stream_url} title={`${camera.name} stream`} />;
  }

  return (
    <div className="live-camera-dashboard__placeholder">
      <p>Stream endpoint</p>
      <p className="auth-form__hint">{camera.stream_url}</p>
    </div>
  );
}

export function LiveCameraDashboardPanel({ onLoadStations, onLoad }: LiveCameraDashboardPanelProps) {
  const [stations, setStations] = useState<PoliceStationOption[]>([]);
  const [dashboard, setDashboard] = useState<CameraLiveDashboard | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [stationFilter, setStationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh(nextSearch = search, nextStationFilter = stationFilter, nextStatusFilter = statusFilter) {
    setLoading(true);
    setError(null);
    try {
      const data = await onLoad({
        search: nextSearch || undefined,
        station_id: nextStationFilter || undefined,
        status: nextStatusFilter || undefined,
      });
      setDashboard(data);
      if (data.cameras.length === 0) {
        setSelectedCameraId(null);
      } else if (!data.cameras.some((camera) => camera.id === selectedCameraId)) {
        setSelectedCameraId(data.cameras[0].id);
      }
    } catch {
      setError('Unable to load live camera dashboard.');
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
        setError('Unable to load police stations for camera filters.');
      }
      await refresh('', '', '');
    }

    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh(search, stationFilter, statusFilter);
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, stationFilter, statusFilter]);

  const selectedCamera = dashboard?.cameras.find((camera) => camera.id === selectedCameraId) ?? null;

  return (
    <Card title="Live Camera Dashboard" subtitle="Task 048 — Monitor active camera streams and status">
      {dashboard ? (
        <div className="dashboard-stats live-camera-dashboard-summary">
          <article className="dashboard-stats__item">
            <p>Active cameras</p>
            <strong>{dashboard.total_cameras}</strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Online</p>
            <strong>{dashboard.online_cameras}</strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Offline</p>
            <strong>{dashboard.offline_cameras}</strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Streaming</p>
            <strong>{dashboard.streaming_cameras}</strong>
          </article>
        </div>
      ) : null}

      <div className="live-camera-dashboard-toolbar">
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
        <Button type="button" variant="secondary" onClick={() => refresh(search, stationFilter, statusFilter)} isLoading={loading}>
          Refresh
        </Button>
      </div>

      {loading && !dashboard ? <p className="auth-form__hint">Loading live cameras...</p> : null}
      {error ? <p className="auth-form__error">{error}</p> : null}

      {selectedCamera ? (
        <article className="live-camera-dashboard-featured">
          <header className="live-camera-dashboard-featured__header">
            <p>
              <strong>{selectedCamera.name}</strong> ({selectedCamera.code}) · {selectedCamera.status}
            </p>
            <p className="auth-form__hint">
              {selectedCamera.location}
              {selectedCamera.station_name ? ` · ${selectedCamera.station_code} ${selectedCamera.station_name}` : ''}
            </p>
          </header>
          <CameraStreamPreview camera={selectedCamera} />
        </article>
      ) : null}

      <div className="live-camera-dashboard-grid">
        {dashboard?.cameras.length === 0 && !loading ? (
          <p className="auth-form__hint">No active cameras match the current filters.</p>
        ) : null}
        {dashboard?.cameras.map((camera) => (
          <button
            type="button"
            key={camera.id}
            className={
              camera.id === selectedCameraId
                ? 'live-camera-dashboard-grid__item live-camera-dashboard-grid__item--active'
                : 'live-camera-dashboard-grid__item'
            }
            onClick={() => setSelectedCameraId(camera.id)}
          >
            <div className="live-camera-dashboard-grid__preview">
              <CameraStreamPreview camera={camera} />
            </div>
            <div className="live-camera-dashboard-grid__meta">
              <p>
                <strong>{camera.name}</strong> · {camera.status}
              </p>
              <p className="auth-form__hint">{camera.location}</p>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
