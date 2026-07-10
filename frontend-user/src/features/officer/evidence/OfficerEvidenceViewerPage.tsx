import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Input, useTranslation } from '@camtraffic/ui';
import type { OfficerEvidenceDetail, OfficerEvidenceRecord, OfficerEvidenceStatus } from '@camtraffic/types';

const STATUS_OPTIONS: OfficerEvidenceStatus[] = ['pending', 'approved', 'rejected', 'appealed'];

type EvidenceViewMode = 'detection' | 'violation';

interface OfficerEvidenceViewerPageProps {
  onLoadList: (params?: {
    status?: string;
    search?: string;
    has_evidence?: string;
    limit?: number;
  }) => Promise<OfficerEvidenceRecord[]>;
  onLoadDetail: (violationId: number) => Promise<OfficerEvidenceDetail>;
}

function formatStatus(status: OfficerEvidenceStatus): string {
  return status.replace('_', ' ');
}

function formatConfidence(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function OfficerEvidenceViewerPage({ onLoadList, onLoadDetail }: OfficerEvidenceViewerPageProps) {
  const { t } = useTranslation();
  const [records, setRecords] = useState<OfficerEvidenceRecord[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<OfficerEvidenceDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<OfficerEvidenceStatus | ''>('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<EvidenceViewMode>('detection');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshList = useCallback(
    async (nextStatus = statusFilter, nextSearch = search) => {
      setLoadingList(true);
      setErrorMessage(null);
      try {
        const data = await onLoadList({
          status: nextStatus || undefined,
          search: nextSearch || undefined,
          limit: 50,
        });
        setRecords(data);
        setSelectedId((current) => {
          if (data.length === 0) {
            return null;
          }
          if (current && data.some((record) => record.id === current)) {
            return current;
          }
          return data[0].id;
        });
      } catch {
        setErrorMessage(t.errors.generic);
      } finally {
        setLoadingList(false);
      }
    },
    [onLoadList, search, statusFilter, t.errors.generic],
  );

  useEffect(() => {
    void refreshList('', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    const violationId = selectedId;

    async function loadDetail() {
      setLoadingDetail(true);
      setErrorMessage(null);
      try {
        const data = await onLoadDetail(violationId);
        setDetail(data);
        if (data.evidence_image_url) {
          setViewMode('violation');
        } else if (data.detection_image_url) {
          setViewMode('detection');
        }
      } catch {
        setErrorMessage(t.errors.generic);
        setDetail(null);
      } finally {
        setLoadingDetail(false);
      }
    }

    void loadDetail();
  }, [onLoadDetail, selectedId, t.errors.generic]);

  const activeImageUrl =
    viewMode === 'violation' ? detail?.evidence_image_url : detail?.detection_image_url;

  return (
    <Card title="Evidence Viewer" subtitle="Task 070 — Violation detection and evidence images">
      <div className="evidence-viewer-toolbar">
        <label className="auth-form__field">
          <span className="auth-form__label">Status</span>
          <select
            className="auth-form__select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as OfficerEvidenceStatus | '')}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>
        </label>
        <Input label="Search" name="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Button type="button" variant="secondary" onClick={() => refreshList(statusFilter, search)} isLoading={loadingList}>
          Search
        </Button>
      </div>

      {errorMessage ? <p className="auth-form__error">{errorMessage}</p> : null}
      {loadingList ? <p className="auth-form__hint">{t.common.loading}</p> : null}

      <div className="evidence-viewer-layout">
        <section className="evidence-viewer-list" aria-label="Evidence queue">
          {records.length === 0 && !loadingList ? (
            <p className="auth-form__hint">No violations with evidence match the current filters.</p>
          ) : null}
          {records.map((record) => (
            <button
              type="button"
              key={record.id}
              className={
                record.id === selectedId
                  ? 'evidence-viewer-list__item evidence-viewer-list__item--active'
                  : 'evidence-viewer-list__item'
              }
              onClick={() => setSelectedId(record.id)}
            >
              {record.detection_image_url ? (
                <img
                  className="evidence-viewer-list__thumb"
                  src={record.detection_image_url}
                  alt={`Detection preview for violation ${record.id}`}
                />
              ) : null}
              <div>
                <p>
                  <strong>#{record.id}</strong> · {formatStatus(record.status)}
                </p>
                <p className="auth-form__hint">
                  {record.vehicle_plate} · {record.driver_name}
                </p>
                <p className="auth-form__hint">
                  {record.traffic_sign_code} {record.traffic_sign_name} · {new Date(record.detected_at).toLocaleString()}
                </p>
              </div>
            </button>
          ))}
        </section>

        <section className="evidence-viewer-stage" aria-label="Evidence viewer">
          {loadingDetail ? <p className="auth-form__hint">{t.common.loading}</p> : null}
          {!loadingDetail && !detail ? (
            <p className="auth-form__hint">Select a violation to inspect evidence images.</p>
          ) : null}
          {detail ? (
            <>
              <header className="evidence-viewer-stage__header">
                <p>
                  <strong>Violation #{detail.id}</strong> · {formatStatus(detail.status)}
                </p>
                <p className="auth-form__hint">
                  {detail.camera_name} ({detail.camera_code}) · {new Date(detail.detected_at).toLocaleString()}
                </p>
              </header>

              <div className="evidence-viewer-stage__tabs">
                <Button
                  type="button"
                  variant={viewMode === 'detection' ? 'primary' : 'secondary'}
                  onClick={() => setViewMode('detection')}
                  disabled={!detail.detection_image_url}
                >
                  Detection capture
                </Button>
                <Button
                  type="button"
                  variant={viewMode === 'violation' ? 'primary' : 'secondary'}
                  onClick={() => setViewMode('violation')}
                  disabled={!detail.evidence_image_url}
                >
                  Violation evidence
                </Button>
              </div>

              <div className="evidence-viewer-stage__image-wrap">
                {activeImageUrl ? (
                  <figure>
                    <img src={activeImageUrl} alt={`${viewMode} evidence for violation ${detail.id}`} />
                    <figcaption>
                      {viewMode === 'detection' ? 'Camera detection frame' : 'Stored violation evidence'}
                    </figcaption>
                  </figure>
                ) : (
                  <p className="auth-form__hint">No image available for the selected view.</p>
                )}
              </div>

              <div className="evidence-viewer-stage__meta">
                <p>
                  <strong>{detail.driver_name}</strong> ({detail.driver_email}) · {detail.vehicle_plate}
                </p>
                <p className="auth-form__hint">
                  {detail.vehicle_make} {detail.vehicle_model} ({detail.vehicle_year})
                  {detail.vehicle_color ? ` · ${detail.vehicle_color}` : ''}
                </p>
                <p>
                  {detail.traffic_sign_code} · {detail.traffic_sign_name}
                  {detail.traffic_sign_name_km ? ` · ${detail.traffic_sign_name_km}` : ''}
                </p>
                <p className="auth-form__hint">
                  Detection #{detail.detection_id} · confidence {formatConfidence(detail.detection_confidence)}
                  {detail.station_name ? ` · ${detail.station_name}` : ''}
                </p>
                {Object.keys(detail.bounding_box).length > 0 ? (
                  <p className="auth-form__hint">Bounding box metadata available for overlay review.</p>
                ) : null}
              </div>
            </>
          ) : null}
        </section>
      </div>
    </Card>
  );
}
