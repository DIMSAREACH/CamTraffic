import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Input, useTranslation } from '@camtraffic/ui';
import type { DriverVehicleDetail, DriverVehicleRecord } from '@camtraffic/types';

interface DriverVehiclesPageProps {
  onLoadList: (params?: { search?: string; is_active?: string }) => Promise<DriverVehicleRecord[]>;
  onLoadDetail: (vehicleId: number) => Promise<DriverVehicleDetail>;
}

export function DriverVehiclesPage({ onLoadList, onLoadDetail }: DriverVehiclesPageProps) {
  const { t } = useTranslation();
  const [records, setRecords] = useState<DriverVehicleRecord[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DriverVehicleDetail | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshList = useCallback(
    async (nextSearch = search, nextActiveFilter = activeFilter) => {
      setLoadingList(true);
      setErrorMessage(null);
      try {
        const data = await onLoadList({
          search: nextSearch || undefined,
          is_active:
            nextActiveFilter === 'all' ? undefined : nextActiveFilter === 'active' ? 'true' : 'false',
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
    [activeFilter, onLoadList, search, t.errors.generic],
  );

  useEffect(() => {
    void refreshList('', 'all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    const vehicleId = selectedId;

    async function loadDetail() {
      setLoadingDetail(true);
      setErrorMessage(null);
      try {
        const data = await onLoadDetail(vehicleId);
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
    <Card title={t.nav.vehicles} subtitle="Task 076 — My registered vehicles">
      <p className="auth-form__hint">
        Vehicles are registered by traffic officers. Contact your local station to update registration details.
      </p>

      <div className="vehicles-toolbar">
        <Input label="Search" name="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <label className="auth-form__field">
          <span className="auth-form__label">Status</span>
          <select
            className="auth-form__select"
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value as 'all' | 'active' | 'inactive')}
          >
            <option value="all">All vehicles</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </label>
        <Button type="button" variant="secondary" onClick={() => refreshList(search, activeFilter)} isLoading={loadingList}>
          Search
        </Button>
      </div>

      {errorMessage ? <p className="auth-form__error">{errorMessage}</p> : null}

      <div className="vehicles-layout">
        <div className="vehicles-list">
          {loadingList ? <p className="auth-form__hint">{t.common.loading}</p> : null}
          {!loadingList && records.length === 0 ? (
            <p className="auth-form__hint">No vehicles registered to your account.</p>
          ) : null}
          {records.map((vehicle) => (
            <button
              key={vehicle.id}
              type="button"
              className={`vehicles-list__item${selectedId === vehicle.id ? ' vehicles-list__item--active' : ''}`}
              onClick={() => setSelectedId(vehicle.id)}
            >
              <p>
                <strong>{vehicle.plate_number}</strong> · {vehicle.make} {vehicle.model} ({vehicle.year})
              </p>
              <p className="auth-form__hint">
                {vehicle.violation_count} violation{vehicle.violation_count === 1 ? '' : 's'} ·{' '}
                {vehicle.is_active ? 'Active' : 'Inactive'}
              </p>
            </button>
          ))}
        </div>

        <div className="vehicles-detail">
          {loadingDetail ? <p className="auth-form__hint">{t.common.loading}</p> : null}
          {!loadingDetail && !detail ? <p className="auth-form__hint">Select a vehicle to view details.</p> : null}
          {detail ? (
            <>
              <div className="vehicles-detail__header">
                <p>
                  <strong>{detail.plate_number}</strong> · {detail.make} {detail.model} ({detail.year})
                </p>
                <p>
                  {detail.color || 'No color'}
                  {detail.registration_date ? ` · Registered ${detail.registration_date}` : ''}
                </p>
                <p className="auth-form__hint">{detail.is_active ? 'Active' : 'Inactive'}</p>
              </div>

              <div className="vehicles-detail__stats">
                <p>
                  <strong>{detail.violation_count}</strong> violation{detail.violation_count === 1 ? '' : 's'} linked
                  to this vehicle
                </p>
              </div>

              <div className="vehicles-detail__violations">
                <h4>Recent violations</h4>
                {detail.violations.length === 0 ? (
                  <p className="auth-form__hint">No violations recorded for this vehicle.</p>
                ) : (
                  detail.violations.map((violation) => (
                    <p key={violation.id}>
                      <strong>{violation.traffic_sign_code}</strong> · {violation.traffic_sign_name} · {violation.status}{' '}
                      · {new Date(violation.detected_at).toLocaleString()}
                    </p>
                  ))
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
