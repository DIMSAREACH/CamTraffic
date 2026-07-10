import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Input, useTranslation } from '@camtraffic/ui';
import type {
  OfficerViolationDecision,
  OfficerViolationDecisionResult,
  OfficerViolationReviewDetail,
  OfficerViolationReviewRecord,
  ViolationReviewStatus,
} from '@camtraffic/types';

const STATUS_OPTIONS: ViolationReviewStatus[] = ['pending', 'approved', 'rejected', 'appealed'];

interface OfficerViolationReviewPageProps {
  onLoadList: (params?: { status?: string; search?: string; limit?: number }) => Promise<OfficerViolationReviewRecord[]>;
  onLoadDetail: (violationId: number) => Promise<OfficerViolationReviewDetail>;
  onDecide: (
    violationId: number,
    decision: OfficerViolationDecision,
    officerNotes?: string,
  ) => Promise<OfficerViolationDecisionResult>;
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

export function OfficerViolationReviewPage({ onLoadList, onLoadDetail, onDecide }: OfficerViolationReviewPageProps) {
  const { t } = useTranslation();
  const [records, setRecords] = useState<OfficerViolationReviewRecord[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<OfficerViolationReviewDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<ViolationReviewStatus | ''>('pending');
  const [search, setSearch] = useState('');
  const [officerNotes, setOfficerNotes] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    async function bootstrap() {
      await refreshList('pending', '');
    }

    void bootstrap();
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

  useEffect(() => {
    setOfficerNotes(detail?.officer_notes ?? '');
  }, [detail?.id, detail?.officer_notes]);

  async function handleDecision(decision: OfficerViolationDecision) {
    if (!selectedId || !detail || detail.status !== 'pending') {
      return;
    }

    setSubmittingDecision(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await onDecide(selectedId, decision, officerNotes);
      setDetail(result.violation);
      setSuccessMessage(result.message);
      await refreshList(statusFilter, search);
    } catch {
      setErrorMessage(t.errors.generic);
    } finally {
      setSubmittingDecision(false);
    }
  }

  const selectedRecord = records.find((record) => record.id === selectedId) ?? null;
  const canDecide = detail?.status === 'pending';

  return (
    <Card title={t.nav.violations} subtitle="Task 067 — approve or reject pending violations">
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
      {successMessage ? <p className="auth-form__success">{successMessage}</p> : null}
      {loadingList ? <p className="auth-form__hint">{t.common.loading}</p> : null}

      <div className="violation-review-layout">
        <section className="violation-review-list" aria-label="Violation queue">
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
                {record.vehicle_plate} · {record.driver_name}
              </p>
              <p className="auth-form__hint">
                {record.traffic_sign_code} {record.traffic_sign_name} · {new Date(record.detected_at).toLocaleString()}
              </p>
            </button>
          ))}
        </section>

        <section className="violation-review-detail" aria-label="Violation detail">
          {loadingDetail ? <p className="auth-form__hint">{t.common.loading}</p> : null}
          {!loadingDetail && !detail && !selectedRecord ? (
            <p className="auth-form__hint">Select a violation to review evidence and context.</p>
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
                  <h4>Driver & Vehicle</h4>
                  <p>
                    <strong>{detail.driver_name}</strong> ({detail.driver_email})
                  </p>
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
                  <h4>Detection</h4>
                  <p>
                    Detection #{detail.detection_id} · confidence {formatConfidence(detail.detection_confidence)}
                  </p>
                  {detail.reviewed_by_email ? (
                    <p className="auth-form__hint">
                      Reviewed by {detail.reviewed_by_email}
                      {detail.reviewed_at ? ` · ${new Date(detail.reviewed_at).toLocaleString()}` : ''}
                    </p>
                  ) : (
                    <p className="auth-form__hint">Awaiting officer decision.</p>
                  )}
                  {detail.officer_notes ? <p className="auth-form__hint">Notes: {detail.officer_notes}</p> : null}
                </article>
              </div>

              {canDecide ? (
                <div className="violation-review-actions">
                  <label className="auth-form__field violation-review-actions__notes">
                    <span className="auth-form__label">Officer notes</span>
                    <textarea
                      className="auth-form__textarea"
                      name="officer_notes"
                      value={officerNotes}
                      onChange={(event) => setOfficerNotes(event.target.value)}
                      rows={3}
                      placeholder="Optional notes for this decision"
                    />
                  </label>
                  <div className="violation-review-actions__buttons">
                    <Button
                      type="button"
                      onClick={() => handleDecision('approve')}
                      isLoading={submittingDecision}
                    >
                      {t.status.approved}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleDecision('reject')}
                      isLoading={submittingDecision}
                    >
                      {t.status.rejected}
                    </Button>
                  </div>
                </div>
              ) : null}

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
