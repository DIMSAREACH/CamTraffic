import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Input, useTranslation } from '@camtraffic/ui';
import type { CameraLiveDashboard, CameraLiveFeedItem, CameraStatus } from '@camtraffic/types';

const STATUS_OPTIONS: CameraStatus[] = ['online', 'offline', 'maintenance', 'error'];
const REFRESH_INTERVAL_MS = 30_000;

interface OfficerLiveCameraPageProps {
  onLoad: (params?: { search?: string; status?: string }) => Promise<CameraLiveDashboard>;
}

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

export function OfficerLiveCameraPage({ onLoad }: OfficerLiveCameraPageProps) {
  const { t } = useTranslation();
  const [dashboard, setDashboard] = useState<CameraLiveDashboard | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(
    async (nextSearch = search, nextStatusFilter = statusFilter) => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const data = await onLoad({
          search: nextSearch || undefined,
          status: nextStatusFilter || undefined,
        });
        setDashboard(data);
        setSelectedCameraId((current) => {
          if (data.cameras.length === 0) {
            return null;
          }
          if (current && data.cameras.some((camera) => camera.id === current)) {
            return current;
          }
          return data.cameras[0].id;
        });
      } catch {
        setErrorMessage(t.errors.generic);
      } finally {
        setLoading(false);
      }
    },
    [onLoad, search, statusFilter, t.errors.generic],
  );

  useEffect(() => {
    void refresh('', '');
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [refresh]);

  const selectedCamera = dashboard?.cameras.find((camera) => camera.id === selectedCameraId) ?? null;

  return (
    <Card title="Live Camera" subtitle="Task 065 — station-scoped camera stream viewer">
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
        <Button
          type="button"
          variant="secondary"
          onClick={() => refresh(search, statusFilter)}
          isLoading={loading}
        >
          Refresh
        </Button>
      </div>

      <p className="auth-form__hint">Auto-refreshes every {REFRESH_INTERVAL_MS / 1000} seconds.</p>
      {loading && !dashboard ? <p className="auth-form__hint">{t.common.loading}</p> : null}
      {errorMessage ? <p className="auth-form__error">{errorMessage}</p> : null}

      {selectedCamera ? (
        <article className="live-camera-dashboard-featured">
          <header className="live-camera-dashboard-featured__header">
            <p>
              <strong>{selectedCamera.name}</strong> ({selectedCamera.code}) · {selectedCamera.status}
            </p>
            <p className="auth-form__hint">{selectedCamera.location}</p>
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
