import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Input, useTranslation } from '@camtraffic/ui';
import type { DriverViolationDetail, DriverViolationRecord, ViolationReviewStatus } from '@camtraffic/types';

const STATUS_OPTIONS: ViolationReviewStatus[] = ['pending', 'approved', 'rejected', 'appealed'];

interface DriverViolationsPageProps {
  onLoadList: (params?: { status?: string; search?: string; limit?: number }) => Promise<DriverViolationRecord[]>;
  onLoadDetail: (violationId: number) => Promise<DriverViolationDetail>;
}

function formatStatus(status: ViolationReviewStatus): string {
  return status.replace('_', ' ');
}

function formatConfidence(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat().format(value);
}

export function DriverViolationsPage({ onLoadList, onLoadDetail }: DriverViolationsPageProps) {
  const { t } = useTranslation();
  const [records, setRecords] = useState<DriverViolationRecord[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DriverViolationDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<ViolationReviewStatus | ''>('');
  const [search, setSearch] = useState('');
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
      } catch {
        setErrorMessage(t.errors.generic);
        setDetail(null);
      } finally {
        setLoadingDetail(false);
      }
    }

    void loadDetail();
  }, [onLoadDetail, selectedId, t.errors.generic]);

  return (
    <Card title={t.nav.violations} subtitle="Task 077 — My violation history">
      <div className="violation-review-toolbar">
        <label className="auth-form__field">
          <span className="auth-form__label">Status</span>
          <select
            className="auth-form__select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ViolationReviewStatus | '')}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {formatStatus(option)}
              </option>
            ))}
          </select>
        </label>
        <Input label="Search" name="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Button
          type="button"
          variant="secondary"
          onClick={() => refreshList(statusFilter, search)}
          isLoading={loadingList}
        >
          Refresh
        </Button>
      </div>

      {errorMessage ? <p className="auth-form__error">{errorMessage}</p> : null}
      {loadingList ? <p className="auth-form__hint">{t.common.loading}</p> : null}

      <div className="violation-review-layout">
        <section className="violation-review-list" aria-label="Violation history">
          {records.length === 0 && !loadingList ? (
            <p className="auth-form__hint">No violations match the current filters.</p>
          ) : null}
          {records.map((record) => (
            <button
              type="button"
              key={record.id}
              className={
                record.id === selectedId
                  ? 'violation-review-list__item violation-review-list__item--active'
                  : 'violation-review-list__item'
              }
              onClick={() => setSelectedId(record.id)}
            >
              <p>
                <strong>#{record.id}</strong> · {formatStatus(record.status)}
              </p>
              <p className="auth-form__hint">
                {record.vehicle_plate} · {record.camera_name}
              </p>
              <p className="auth-form__hint">
                {record.traffic_sign_code} {record.traffic_sign_name} · {new Date(record.detected_at).toLocaleString()}
              </p>
            </button>
          ))}
        </section>

        <section className="violation-review-detail" aria-label="Violation detail">
          {loadingDetail ? <p className="auth-form__hint">{t.common.loading}</p> : null}
          {!loadingDetail && !detail ? (
            <p className="auth-form__hint">Select a violation to view details and evidence.</p>
          ) : null}
          {detail ? (
            <>
              <header className="violation-review-detail__header">
                <p>
                  <strong>Violation #{detail.id}</strong> · {formatStatus(detail.status)}
                </p>
                <p className="auth-form__hint">
                  Detected {new Date(detail.detected_at).toLocaleString()}
                  {detail.station_name ? ` · ${detail.station_name}` : ''}
                </p>
              </header>

              <div className="violation-review-detail__grid">
                <article>
                  <h4>Vehicle</h4>
                  <p>
                    {detail.vehicle_plate} · {detail.vehicle_make} {detail.vehicle_model} ({detail.vehicle_year})
                  </p>
                  {detail.vehicle_color ? <p className="auth-form__hint">Color: {detail.vehicle_color}</p> : null}
                </article>
                <article>
                  <h4>Camera & Sign</h4>
                  <p>
                    {detail.camera_name} ({detail.camera_code})
                  </p>
                  <p className="auth-form__hint">{detail.camera_location}</p>
                  <p>
                    {detail.traffic_sign_code} · {detail.traffic_sign_name}
                  </p>
                  <p className="auth-form__hint">
                    {detail.traffic_sign_name_km} · Fine {formatAmount(detail.fine_amount)} KHR
                  </p>
                </article>
                <article>
                  <h4>Review & Fine</h4>
                  <p>
                    Detection #{detail.detection_id} · confidence {formatConfidence(detail.detection_confidence)}
                  </p>
                  {detail.reviewed_at ? (
                    <p className="auth-form__hint">Reviewed {new Date(detail.reviewed_at).toLocaleString()}</p>
                  ) : (
                    <p className="auth-form__hint">Awaiting officer review.</p>
                  )}
                  {detail.officer_notes ? <p className="auth-form__hint">Notes: {detail.officer_notes}</p> : null}
                  {detail.fine_reference_number ? (
                    <p className="auth-form__hint">
                      Fine {detail.fine_reference_number} · {detail.fine_status} ·{' '}
                      {detail.issued_fine_amount !== null ? `${formatAmount(detail.issued_fine_amount)} KHR` : ''}
                    </p>
                  ) : null}
                </article>
              </div>

              <div className="violation-review-detail__evidence">
                {detail.evidence_image_url ? (
                  <figure>
                    <img src={detail.evidence_image_url} alt="Violation evidence" />
                    <figcaption>Violation evidence</figcaption>
                  </figure>
                ) : null}
                {detail.detection_image_url ? (
                  <figure>
                    <img src={detail.detection_image_url} alt="Detection capture" />
                    <figcaption>Detection capture</figcaption>
                  </figure>
                ) : null}
                {!detail.evidence_image_url && !detail.detection_image_url ? (
                  <p className="auth-form__hint">No evidence images attached.</p>
                ) : null}
              </div>
            </>
          ) : null}
        </section>
      </div>
    </Card>
  );
}
