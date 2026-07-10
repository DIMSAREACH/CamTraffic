import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button, Card, Input, useTranslation } from '@camtraffic/ui';
import type {
  AppealStatus,
  DriverAppealDetail,
  DriverAppealRecord,
  DriverAppealableViolationRecord,
} from '@camtraffic/types';

const STATUS_OPTIONS: AppealStatus[] = ['submitted', 'under_review', 'approved', 'rejected'];

interface DriverAppealsPageProps {
  onLoadAppealable: () => Promise<DriverAppealableViolationRecord[]>;
  onLoadList: (params?: { status?: string; search?: string; limit?: number }) => Promise<DriverAppealRecord[]>;
  onLoadDetail: (appealId: number) => Promise<DriverAppealDetail>;
  onSubmit: (payload: {
    violation_id: number;
    reason: string;
    evidence?: File | null;
  }) => Promise<{ appeal: DriverAppealDetail; message: string }>;
}

function formatStatus(status: AppealStatus): string {
  return status.replace('_', ' ');
}

export function DriverAppealsPage({
  onLoadAppealable,
  onLoadList,
  onLoadDetail,
  onSubmit,
}: DriverAppealsPageProps) {
  const { t } = useTranslation();
  const [appealable, setAppealable] = useState<DriverAppealableViolationRecord[]>([]);
  const [records, setRecords] = useState<DriverAppealRecord[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DriverAppealDetail | null>(null);
  const [violationId, setViolationId] = useState('');
  const [reason, setReason] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [statusFilter, setStatusFilter] = useState<AppealStatus | ''>('');
  const [search, setSearch] = useState('');
  const [loadingAppealable, setLoadingAppealable] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  const refreshAppealable = useCallback(async () => {
    setLoadingAppealable(true);
    try {
      const data = await onLoadAppealable();
      setAppealable(data);
      setViolationId((current) => {
        if (data.length === 0) {
          return '';
        }
        if (current && data.some((record) => String(record.id) === current)) {
          return current;
        }
        return String(data[0].id);
      });
    } catch {
      setErrorMessage(t.errors.generic);
    } finally {
      setLoadingAppealable(false);
    }
  }, [onLoadAppealable, t.errors.generic]);

  useEffect(() => {
    async function bootstrap() {
      await Promise.all([refreshAppealable(), refreshList('', '')]);
    }

    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    const appealId = selectedId;

    async function loadDetail() {
      setLoadingDetail(true);
      setErrorMessage(null);
      try {
        const data = await onLoadDetail(appealId);
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

  function handleEvidenceChange(event: ChangeEvent<HTMLInputElement>) {
    setEvidenceFile(event.target.files?.[0] ?? null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!violationId) {
      setErrorMessage('Select a violation to appeal.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await onSubmit({
        violation_id: Number(violationId),
        reason: reason.trim(),
        evidence: evidenceFile,
      });
      setDetail(result.appeal);
      setSelectedId(result.appeal.id);
      setReason('');
      setEvidenceFile(null);
      setSuccessMessage(result.message);
      await Promise.all([refreshAppealable(), refreshList(statusFilter, search)]);
    } catch {
      setErrorMessage(t.errors.generic);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title={t.nav.appeals} subtitle="Task 080 — Appeal submission">
      <form className="appeals-submit-form auth-form" onSubmit={handleSubmit}>
        <h4>Submit new appeal</h4>
        <p className="auth-form__hint">Appeals can be filed for approved violations that do not already have an active appeal.</p>
        <label className="auth-form__field">
          <span className="auth-form__label">Violation</span>
          <select
            className="auth-form__select"
            value={violationId}
            onChange={(event) => setViolationId(event.target.value)}
            required
            disabled={loadingAppealable || appealable.length === 0}
          >
            {appealable.length === 0 ? <option value="">No appealable violations</option> : null}
            {appealable.map((violation) => (
              <option key={violation.id} value={violation.id}>
                #{violation.id} · {violation.vehicle_plate} · {violation.traffic_sign_code}
                {violation.fine_reference_number ? ` · ${violation.fine_reference_number}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="auth-form__field appeals-submit-form__reason">
          <span className="auth-form__label">Reason</span>
          <textarea
            className="auth-form__textarea"
            name="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            minLength={10}
            required
            placeholder="Explain why this violation should be reviewed again"
          />
        </label>
        <label className="auth-form__field">
          <span className="auth-form__label">Supporting evidence (optional)</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleEvidenceChange} />
        </label>
        <Button type="submit" isLoading={submitting} disabled={appealable.length === 0}>
          Submit appeal
        </Button>
      </form>

      <div className="violation-review-toolbar">
        <label className="auth-form__field">
          <span className="auth-form__label">Status</span>
          <select
            className="auth-form__select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as AppealStatus | '')}
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
        <section className="violation-review-list" aria-label="Appeal history">
          {records.length === 0 && !loadingList ? (
            <p className="auth-form__hint">No appeals match the current filters.</p>
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
                <strong>Appeal #{record.id}</strong> · {formatStatus(record.status)}
              </p>
              <p className="auth-form__hint">
                Violation #{record.violation_id} · {record.vehicle_plate}
              </p>
              <p className="auth-form__hint">
                {record.traffic_sign_code} {record.traffic_sign_name} · {new Date(record.created_at).toLocaleString()}
              </p>
            </button>
          ))}
        </section>

        <section className="violation-review-detail" aria-label="Appeal detail">
          {loadingDetail ? <p className="auth-form__hint">{t.common.loading}</p> : null}
          {!loadingDetail && !detail ? (
            <p className="auth-form__hint">Select an appeal to view details.</p>
          ) : null}
          {detail ? (
            <>
              <header className="violation-review-detail__header">
                <p>
                  <strong>Appeal #{detail.id}</strong> · {formatStatus(detail.status)}
                </p>
                <p className="auth-form__hint">
                  Submitted {new Date(detail.created_at).toLocaleString()}
                  {detail.reviewed_at ? ` · Reviewed ${new Date(detail.reviewed_at).toLocaleString()}` : ''}
                </p>
              </header>

              <div className="violation-review-detail__grid">
                <article>
                  <h4>Violation</h4>
                  <p>
                    #{detail.violation_id} · {detail.violation_status} · {detail.vehicle_plate}
                  </p>
                  <p className="auth-form__hint">Detected {new Date(detail.detected_at).toLocaleString()}</p>
                </article>
                <article>
                  <h4>Traffic sign</h4>
                  <p>
                    {detail.traffic_sign_code} · {detail.traffic_sign_name}
                  </p>
                  <p className="auth-form__hint">
                    {detail.camera_name} ({detail.camera_code})
                    {detail.station_name ? ` · ${detail.station_name}` : ''}
                  </p>
                </article>
                <article>
                  <h4>Your appeal</h4>
                  <p>{detail.reason}</p>
                  {detail.response ? <p className="auth-form__hint">Officer response: {detail.response}</p> : null}
                </article>
              </div>

              {detail.evidence_url ? (
                <div className="violation-review-detail__evidence">
                  <figure>
                    <a href={detail.evidence_url} target="_blank" rel="noreferrer">
                      View supporting evidence
                    </a>
                  </figure>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </Card>
  );
}
