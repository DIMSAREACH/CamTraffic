import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Input, useTranslation } from '@camtraffic/ui';
import type { DriverFineDetail, DriverFineRecord, FinePaymentMethod, FineStatus } from '@camtraffic/types';
import { FinesTabs } from './FinesTabs';

const STATUS_OPTIONS: FineStatus[] = ['unpaid', 'paid', 'overdue', 'waived'];
const PAYMENT_METHODS: FinePaymentMethod[] = ['cash', 'bank', 'mobile'];

interface DriverFinesPageProps {
  onLoadList: (params?: { status?: string; search?: string; limit?: number }) => Promise<DriverFineRecord[]>;
  onLoadDetail: (fineId: number) => Promise<DriverFineDetail>;
  onPay: (
    fineId: number,
    method: FinePaymentMethod,
    transactionId?: string,
  ) => Promise<{ fine: DriverFineDetail; message: string }>;
}

function formatStatus(status: FineStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatAmount(value: number, currency: string): string {
  return `${new Intl.NumberFormat().format(value)} ${currency}`;
}

function formatPaymentMethod(method: FinePaymentMethod): string {
  if (method === 'bank') {
    return 'Bank Transfer';
  }
  return method.charAt(0).toUpperCase() + method.slice(1);
}

export function DriverFinesPage({ onLoadList, onLoadDetail, onPay }: DriverFinesPageProps) {
  const { t } = useTranslation();
  const [records, setRecords] = useState<DriverFineRecord[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DriverFineDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<FineStatus | ''>('');
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<FinePaymentMethod>('mobile');
  const [transactionId, setTransactionId] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [paying, setPaying] = useState(false);
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
    void refreshList('', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    const fineId = selectedId;

    async function loadDetail() {
      setLoadingDetail(true);
      setErrorMessage(null);
      try {
        const data = await onLoadDetail(fineId);
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

  async function handlePay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !detail?.can_pay) {
      return;
    }

    setPaying(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await onPay(selectedId, paymentMethod, transactionId.trim() || undefined);
      setDetail(result.fine);
      setSuccessMessage(result.message);
      setTransactionId('');
      await refreshList(statusFilter, search);
    } catch {
      setErrorMessage(t.errors.generic);
    } finally {
      setPaying(false);
    }
  }

  const outstandingTotal = records
    .filter((record) => record.status === 'unpaid' || record.status === 'overdue')
    .reduce((sum, record) => sum + record.amount, 0);

  return (
    <Card title={t.nav.fines} subtitle="Task 078 — Fine management and payment">
      <FinesTabs />

      <div className="fines-summary">
        <p>
          Outstanding: <strong>{formatAmount(outstandingTotal, 'KHR')}</strong>
        </p>
        <p className="auth-form__hint">
          {records.filter((record) => record.status === 'unpaid' || record.status === 'overdue').length} unpaid or
          overdue fine(s)
        </p>
      </div>

      <div className="violation-review-toolbar">
        <label className="auth-form__field">
          <span className="auth-form__label">Status</span>
          <select
            className="auth-form__select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as FineStatus | '')}
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
        <section className="violation-review-list" aria-label="Fine list">
          {records.length === 0 && !loadingList ? (
            <p className="auth-form__hint">No fines match the current filters.</p>
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
                <strong>{record.reference_number}</strong> · {formatStatus(record.status)}
              </p>
              <p className="auth-form__hint">
                {formatAmount(record.amount, record.currency)} · Due {record.due_date}
              </p>
              <p className="auth-form__hint">
                {record.vehicle_plate} · {record.traffic_sign_code} {record.traffic_sign_name}
              </p>
            </button>
          ))}
        </section>

        <section className="violation-review-detail" aria-label="Fine detail">
          {loadingDetail ? <p className="auth-form__hint">{t.common.loading}</p> : null}
          {!loadingDetail && !detail ? (
            <p className="auth-form__hint">Select a fine to view details and pay.</p>
          ) : null}
          {detail ? (
            <>
              <header className="violation-review-detail__header">
                <p>
                  <strong>{detail.reference_number}</strong> · {formatStatus(detail.status)}
                </p>
                <p className="auth-form__hint">
                  {formatAmount(detail.amount, detail.currency)} · Due {detail.due_date}
                  {detail.paid_at ? ` · Paid ${new Date(detail.paid_at).toLocaleString()}` : ''}
                </p>
              </header>

              <div className="violation-review-detail__grid">
                <article>
                  <h4>Violation</h4>
                  <p>
                    Violation #{detail.violation_id} · {detail.violation_status}
                  </p>
                  <p className="auth-form__hint">Detected {new Date(detail.detected_at).toLocaleString()}</p>
                  {detail.officer_notes ? <p className="auth-form__hint">Notes: {detail.officer_notes}</p> : null}
                </article>
                <article>
                  <h4>Vehicle & Sign</h4>
                  <p>
                    {detail.vehicle_plate} · {detail.vehicle_make} {detail.vehicle_model} ({detail.vehicle_year})
                  </p>
                  <p>
                    {detail.traffic_sign_code} · {detail.traffic_sign_name}
                  </p>
                  <p className="auth-form__hint">{detail.traffic_sign_name_km}</p>
                </article>
                <article>
                  <h4>Location</h4>
                  <p>
                    {detail.camera_name} ({detail.camera_code})
                  </p>
                  <p className="auth-form__hint">{detail.camera_location}</p>
                  {detail.station_name ? <p className="auth-form__hint">{detail.station_name}</p> : null}
                </article>
              </div>

              {detail.can_pay ? (
                <form className="fines-payment-form" onSubmit={handlePay}>
                  <h4>Pay fine</h4>
                  <label className="auth-form__field">
                    <span className="auth-form__label">Payment method</span>
                    <select
                      className="auth-form__select"
                      value={paymentMethod}
                      onChange={(event) => setPaymentMethod(event.target.value as FinePaymentMethod)}
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {formatPaymentMethod(method)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Input
                    label="Transaction ID"
                    name="transaction_id"
                    value={transactionId}
                    onChange={(event) => setTransactionId(event.target.value)}
                    placeholder="Optional reference for bank or mobile payment"
                  />
                  <Button type="submit" isLoading={paying}>
                    Pay {formatAmount(detail.amount, detail.currency)}
                  </Button>
                </form>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </Card>
  );
}
