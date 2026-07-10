import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Input, useTranslation } from '@camtraffic/ui';
import type {
  DetectionMonitorRecord,
  DetectionMonitorSummary,
  OfficerLiveDetectionCameraOption,
} from '@camtraffic/types';

const LIVE_REFRESH_MS = 20_000;

interface OfficerLiveDetectionPageProps {
  onLoadSummary: () => Promise<DetectionMonitorSummary>;
  onLoadDetections: (params?: {
    camera_id?: string;
    min_confidence?: string;
    search?: string;
    limit?: number;
  }) => Promise<DetectionMonitorRecord[]>;
  onLoadCameras: () => Promise<OfficerLiveDetectionCameraOption[]>;
}

function formatConfidence(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function OfficerLiveDetectionPage({
  onLoadSummary,
  onLoadDetections,
  onLoadCameras,
}: OfficerLiveDetectionPageProps) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<DetectionMonitorSummary | null>(null);
  const [records, setRecords] = useState<DetectionMonitorRecord[]>([]);
  const [cameras, setCameras] = useState<OfficerLiveDetectionCameraOption[]>([]);
  const [cameraFilter, setCameraFilter] = useState('');
  const [minConfidence, setMinConfidence] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(
    async (nextCamera = cameraFilter, nextMinConfidence = minConfidence, nextSearch = search) => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const [summaryData, detectionData] = await Promise.all([
          onLoadSummary(),
          onLoadDetections({
            camera_id: nextCamera || undefined,
            min_confidence: nextMinConfidence || undefined,
            search: nextSearch || undefined,
            limit: 50,
          }),
        ]);
        setSummary(summaryData);
        setRecords(detectionData);
      } catch {
        setErrorMessage(t.errors.generic);
      } finally {
        setLoading(false);
      }
    },
    [cameraFilter, minConfidence, onLoadDetections, onLoadSummary, search, t.errors.generic],
  );

  useEffect(() => {
    async function bootstrap() {
      try {
        const cameraData = await onLoadCameras();
        setCameras(cameraData);
      } catch {
        setErrorMessage(t.errors.generic);
      }
      await refresh('', '', '');
    }

    void bootstrap();
  }, [onLoadCameras, refresh, t.errors.generic]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh();
    }, LIVE_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [refresh]);

  return (
    <Card title="Live Detection" subtitle="Task 064 — station-scoped AI detection feed">
      {summary ? (
        <div className="dashboard-stats detection-monitoring-summary">
          <article className="dashboard-stats__item">
            <p>Total detections</p>
            <strong>{summary.total_detections}</strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Today</p>
            <strong>{summary.detections_today}</strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Average confidence</p>
            <strong>{formatConfidence(summary.average_confidence)}</strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Low confidence (&lt;70%)</p>
            <strong>{summary.low_confidence_count}</strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Latest detection</p>
            <strong>
              {summary.latest_detected_at ? new Date(summary.latest_detected_at).toLocaleString() : '—'}
            </strong>
          </article>
        </div>
      ) : null}

      <div className="detection-monitoring-toolbar">
        <label className="auth-form__field">
          <span className="auth-form__label">{t.nav.cameras}</span>
          <select
            className="auth-form__select"
            value={cameraFilter}
            onChange={(event) => setCameraFilter(event.target.value)}
          >
            <option value="">All station cameras</option>
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.name} ({camera.code}) · {camera.status}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Min confidence (0–1)"
          name="min_confidence"
          value={minConfidence}
          onChange={(event) => setMinConfidence(event.target.value)}
        />
        <Input label="Search" name="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Button
          type="button"
          variant="secondary"
          onClick={() => refresh(cameraFilter, minConfidence, search)}
          isLoading={loading}
        >
          Refresh
        </Button>
      </div>

      <p className="auth-form__hint">Auto-refreshes every {LIVE_REFRESH_MS / 1000} seconds.</p>
      {loading ? <p className="auth-form__hint">{t.common.loading}</p> : null}
      {errorMessage ? <p className="auth-form__error">{errorMessage}</p> : null}

      <div className="detection-monitoring-list">
        {records.length === 0 && !loading ? (
          <p className="auth-form__hint">No detections match the current filters.</p>
        ) : null}
        {records.map((record) => (
          <article className="detection-monitoring-list__item" key={record.id}>
            {record.image_url ? (
              <img className="detection-monitoring-list__thumb" src={record.image_url} alt="Detection capture" />
            ) : null}
            <div className="detection-monitoring-list__body">
              <p>
                <strong>
                  {record.camera_name} ({record.camera_code})
                </strong>{' '}
                · {formatConfidence(record.confidence)}
                {record.confidence < 0.7 ? ' · low confidence' : ''}
              </p>
              <p className="auth-form__hint">
                {record.model_name ? `${record.model_name} v${record.version_label}` : 'No model version'}
                {record.traffic_sign_name
                  ? ` · ${record.traffic_sign_code ?? ''} ${record.traffic_sign_name}`.trim()
                  : ' · No traffic sign'}
              </p>
              <p className="auth-form__hint">
                {record.plate_number ? `Plate ${record.plate_number}` : 'No plate detected'}
                {record.plate_confidence != null ? ` (${formatConfidence(record.plate_confidence)})` : ''}
                {' · '}
                {new Date(record.detected_at).toLocaleString()}
              </p>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
