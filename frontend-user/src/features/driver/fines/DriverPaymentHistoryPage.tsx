import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Input, useTranslation } from '@camtraffic/ui';
import type { DriverFinePaymentHistoryDetail, DriverFinePaymentHistoryRecord, FinePaymentMethod } from '@camtraffic/types';
import { FinesTabs } from './FinesTabs';

const PAYMENT_METHODS: FinePaymentMethod[] = ['cash', 'bank', 'mobile'];

interface DriverPaymentHistoryPageProps {
  onLoadList: (params?: { method?: string; search?: string; limit?: number }) => Promise<DriverFinePaymentHistoryRecord[]>;
  onLoadDetail: (paymentId: number) => Promise<DriverFinePaymentHistoryDetail>;
}

function formatPaymentMethod(method: FinePaymentMethod): string {
  if (method === 'bank') {
    return 'Bank Transfer';
  }
  return method.charAt(0).toUpperCase() + method.slice(1);
}

function formatAmount(value: number, currency: string): string {
  return `${new Intl.NumberFormat().format(value)} ${currency}`;
}

export function DriverPaymentHistoryPage({ onLoadList, onLoadDetail }: DriverPaymentHistoryPageProps) {
  const { t } = useTranslation();
  const [records, setRecords] = useState<DriverFinePaymentHistoryRecord[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DriverFinePaymentHistoryDetail | null>(null);
  const [methodFilter, setMethodFilter] = useState<FinePaymentMethod | ''>('');
  const [search, setSearch] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshList = useCallback(
    async (nextMethod = methodFilter, nextSearch = search) => {
      setLoadingList(true);
      setErrorMessage(null);
      try {
        const data = await onLoadList({
          method: nextMethod || undefined,
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
    [methodFilter, onLoadList, search, t.errors.generic],
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

    const paymentId = selectedId;

    async function loadDetail() {
      setLoadingDetail(true);
      setErrorMessage(null);
      try {
        const data = await onLoadDetail(paymentId);
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

  const totalPaid = records.reduce((sum, record) => sum + record.amount, 0);

  return (
    <Card title={t.nav.fines} subtitle="Task 079 — Fine payment history">
      <FinesTabs />

      <div className="fines-summary">
        <p>
          Total paid (filtered): <strong>{formatAmount(totalPaid, records[0]?.currency ?? 'KHR')}</strong>
        </p>
        <p className="auth-form__hint">{records.length} payment record(s)</p>
      </div>

      <div className="violation-review-toolbar">
        <label className="auth-form__field">
          <span className="auth-form__label">Method</span>
          <select
            className="auth-form__select"
            value={methodFilter}
            onChange={(event) => setMethodFilter(event.target.value as FinePaymentMethod | '')}
          >
            <option value="">All methods</option>
            {PAYMENT_METHODS.map((option) => (
              <option key={option} value={option}>
                {formatPaymentMethod(option)}
              </option>
            ))}
          </select>
        </label>
        <Input label="Search" name="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Button
          type="button"
          variant="secondary"
          onClick={() => refreshList(methodFilter, search)}
          isLoading={loadingList}
        >
          Refresh
        </Button>
      </div>

      {errorMessage ? <p className="auth-form__error">{errorMessage}</p> : null}
      {loadingList ? <p className="auth-form__hint">{t.common.loading}</p> : null}

      <div className="violation-review-layout">
        <section className="violation-review-list" aria-label="Payment history">
          {records.length === 0 && !loadingList ? (
            <p className="auth-form__hint">No payments match the current filters.</p>
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
                <strong>{record.fine_reference_number}</strong> · {formatPaymentMethod(record.method)}
              </p>
              <p className="auth-form__hint">
                {formatAmount(record.amount, record.currency)} · {new Date(record.paid_at).toLocaleString()}
              </p>
              <p className="auth-form__hint">
                {record.vehicle_plate} · {record.traffic_sign_code}
                {record.transaction_id ? ` · ${record.transaction_id}` : ''}
              </p>
            </button>
          ))}
        </section>

        <section className="violation-review-detail" aria-label="Payment detail">
          {loadingDetail ? <p className="auth-form__hint">{t.common.loading}</p> : null}
          {!loadingDetail && !detail ? (
            <p className="auth-form__hint">Select a payment to view receipt details.</p>
          ) : null}
          {detail ? (
            <>
              <header className="violation-review-detail__header">
                <p>
                  <strong>Payment #{detail.id}</strong> · {formatPaymentMethod(detail.method)}
                </p>
                <p className="auth-form__hint">
                  {formatAmount(detail.amount, detail.currency)} · Paid {new Date(detail.paid_at).toLocaleString()}
                </p>
              </header>

              <div className="violation-review-detail__grid">
                <article>
                  <h4>Fine</h4>
                  <p>
                    <strong>{detail.fine_reference_number}</strong> · Fine #{detail.fine_id}
                  </p>
                  <p className="auth-form__hint">
                    Violation #{detail.violation_id} · Detected {new Date(detail.detected_at).toLocaleString()}
                  </p>
                </article>
                <article>
                  <h4>Vehicle & Sign</h4>
                  <p>
                    {detail.vehicle_plate} · {detail.vehicle_make} {detail.vehicle_model} ({detail.vehicle_year})
                  </p>
                  <p>
                    {detail.traffic_sign_code} · {detail.traffic_sign_name}
                  </p>
                </article>
                <article>
                  <h4>Payment</h4>
                  <p>Method: {formatPaymentMethod(detail.method)}</p>
                  <p className="auth-form__hint">
                    Transaction ID: {detail.transaction_id || 'Not provided'}
                  </p>
                  <p className="auth-form__hint">
                    {detail.camera_name} ({detail.camera_code})
                    {detail.station_name ? ` · ${detail.station_name}` : ''}
                  </p>
                </article>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </Card>
  );
}
