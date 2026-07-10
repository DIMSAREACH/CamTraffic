import { useEffect, useState } from 'react';
import { Button, Card, Input } from '@camtraffic/ui';
import type { AIModelVersionRecord, DetectionMonitorRecord, DetectionMonitorSummary } from '@camtraffic/types';

interface DetectionMonitoringPanelProps {
  onLoadSummary: () => Promise<DetectionMonitorSummary>;
  onLoad: (params?: {
    camera_id?: string;
    model_version_id?: string;
    min_confidence?: string;
    search?: string;
    limit?: number;
  }) => Promise<DetectionMonitorRecord[]>;
  onLoadVersions: (params?: { model_id?: string; status?: string }) => Promise<AIModelVersionRecord[]>;
}

function formatConfidence(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function DetectionMonitoringPanel({ onLoadSummary, onLoad, onLoadVersions }: DetectionMonitoringPanelProps) {
  const [summary, setSummary] = useState<DetectionMonitorSummary | null>(null);
  const [records, setRecords] = useState<DetectionMonitorRecord[]>([]);
  const [versions, setVersions] = useState<AIModelVersionRecord[]>([]);
  const [cameraFilter, setCameraFilter] = useState('');
  const [versionFilter, setVersionFilter] = useState('');
  const [minConfidence, setMinConfidence] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh(
    nextCamera = cameraFilter,
    nextVersion = versionFilter,
    nextMinConfidence = minConfidence,
    nextSearch = search,
  ) {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, detectionData] = await Promise.all([
        onLoadSummary(),
        onLoad({
          camera_id: nextCamera || undefined,
          model_version_id: nextVersion || undefined,
          min_confidence: nextMinConfidence || undefined,
          search: nextSearch || undefined,
          limit: 50,
        }),
      ]);
      setSummary(summaryData);
      setRecords(detectionData);
    } catch {
      setError('Unable to load detection monitoring data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const versionData = await onLoadVersions();
        setVersions(versionData);
      } catch {
        setError('Unable to load model versions for detection filters.');
      }
      await refresh('', '', '', '');
    }

    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card title="Detection Monitoring" subtitle="Task 046 — Live AI detection feed and confidence metrics">
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
        <Input
          label="Camera ID"
          name="camera_id"
          value={cameraFilter}
          onChange={(event) => setCameraFilter(event.target.value)}
        />
        <label className="auth-form__field">
          <span className="auth-form__label">Model version</span>
          <select
            className="auth-form__select"
            value={versionFilter}
            onChange={(event) => setVersionFilter(event.target.value)}
          >
            <option value="">All versions</option>
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.model_name} v{version.version}
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
          onClick={() => refresh(cameraFilter, versionFilter, minConfidence, search)}
          isLoading={loading}
        >
          Apply filters
        </Button>
      </div>

      {loading ? <p className="auth-form__hint">Loading detections...</p> : null}
      {error ? <p className="auth-form__error">{error}</p> : null}

      <div className="detection-monitoring-list">
        {records.length === 0 && !loading ? <p className="auth-form__hint">No detections match the current filters.</p> : null}
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
