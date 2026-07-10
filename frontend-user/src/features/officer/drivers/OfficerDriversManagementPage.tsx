import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Input } from '@camtraffic/ui';
import type {
  CreateOfficerDriverPayload,
  OfficerDriverManagementDetail,
  OfficerDriverManagementRecord,
  UpdateOfficerDriverPayload,
} from '@camtraffic/types';

interface OfficerDriversManagementPageProps {
  onLoadList: (params?: { search?: string; is_active?: string }) => Promise<OfficerDriverManagementRecord[]>;
  onLoadDetail: (driverId: number) => Promise<OfficerDriverManagementDetail>;
  onCreate: (payload: CreateOfficerDriverPayload) => Promise<{ driver: OfficerDriverManagementRecord; message: string }>;
  onUpdate: (
    driverId: number,
    payload: UpdateOfficerDriverPayload,
  ) => Promise<{ driver: OfficerDriverManagementRecord; message: string }>;
  onDelete: (driverId: number) => Promise<string>;
}

export function OfficerDriversManagementPage({
  onLoadList,
  onLoadDetail,
  onCreate,
  onUpdate,
  onDelete,
}: OfficerDriversManagementPageProps) {
  const [records, setRecords] = useState<OfficerDriverManagementRecord[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<OfficerDriverManagementDetail | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseClass, setLicenseClass] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [nationalId, setNationalId] = useState('');

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
        setErrorMessage('Unable to load drivers.');
      } finally {
        setLoadingList(false);
      }
    },
    [activeFilter, onLoadList, search],
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

    const driverId = selectedId;

    async function loadDetail() {
      setLoadingDetail(true);
      setErrorMessage(null);
      try {
        const data = await onLoadDetail(driverId);
        setDetail(data);
      } catch {
        setErrorMessage('Unable to load driver details.');
        setDetail(null);
      } finally {
        setLoadingDetail(false);
      }
    }

    void loadDetail();
  }, [onLoadDetail, selectedId]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await onCreate({
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        license_number: licenseNumber,
        license_class: licenseClass,
        license_expiry: licenseExpiry || null,
        national_id: nationalId,
        is_active: true,
      });
      setSuccessMessage(result.message);
      setEmail('');
      setFirstName('');
      setLastName('');
      setPhone('');
      setLicenseNumber('');
      setLicenseClass('');
      setLicenseExpiry('');
      setNationalId('');
      await refreshList();
    } catch {
      setErrorMessage('Unable to create driver.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(driver: OfficerDriverManagementRecord) {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await onUpdate(driver.id, { is_active: !driver.is_active });
      setSuccessMessage(result.message);
      await refreshList();
      if (selectedId === driver.id) {
        const updatedDetail = await onLoadDetail(driver.id);
        setDetail(updatedDetail);
      }
    } catch {
      setErrorMessage('Unable to update driver.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(driverId: number) {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const message = await onDelete(driverId);
      setSuccessMessage(message);
      await refreshList();
    } catch {
      setErrorMessage('Unable to delete driver.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Driver Management" subtitle="Task 068 — Driver profiles and license records">
      <form className="auth-form" onSubmit={handleCreate}>
        <Input label="Email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Input
          label="First name"
          name="first_name"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          required
        />
        <Input
          label="Last name"
          name="last_name"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          required
        />
        <Input label="Phone" name="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <Input
          label="License number"
          name="license_number"
          value={licenseNumber}
          onChange={(event) => setLicenseNumber(event.target.value)}
          required
        />
        <Input
          label="License class"
          name="license_class"
          value={licenseClass}
          onChange={(event) => setLicenseClass(event.target.value)}
        />
        <Input
          label="License expiry"
          name="license_expiry"
          type="date"
          value={licenseExpiry}
          onChange={(event) => setLicenseExpiry(event.target.value)}
        />
        <Input
          label="National ID"
          name="national_id"
          value={nationalId}
          onChange={(event) => setNationalId(event.target.value)}
        />
        <Button type="submit" isLoading={saving}>
          Register driver
        </Button>
      </form>

      <div className="drivers-toolbar">
        <Input label="Search" name="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <label className="auth-form__field">
          <span className="auth-form__label">Status</span>
          <select
            className="auth-form__select"
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value as 'all' | 'active' | 'inactive')}
          >
            <option value="all">All drivers</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </label>
        <Button type="button" variant="secondary" onClick={() => refreshList(search, activeFilter)} isLoading={loadingList}>
          Search
        </Button>
      </div>

      {errorMessage ? <p className="auth-form__error">{errorMessage}</p> : null}
      {successMessage ? <p className="auth-form__success">{successMessage}</p> : null}

      <div className="drivers-layout">
        <div className="drivers-list">
          {loadingList ? <p className="auth-form__hint">Loading drivers...</p> : null}
          {!loadingList && records.length === 0 ? <p className="auth-form__hint">No drivers found.</p> : null}
          {records.map((driver) => (
            <button
              key={driver.id}
              type="button"
              className={`drivers-list__item${selectedId === driver.id ? ' drivers-list__item--active' : ''}`}
              onClick={() => setSelectedId(driver.id)}
            >
              <p>
                <strong>{driver.license_number}</strong> · {driver.first_name} {driver.last_name}
              </p>
              <p>{driver.email}</p>
              <p className="auth-form__hint">
                {driver.vehicle_count} vehicle{driver.vehicle_count === 1 ? '' : 's'} · {driver.station_violation_count}{' '}
                station violation{driver.station_violation_count === 1 ? '' : 's'} ·{' '}
                {driver.is_active ? 'Active' : 'Inactive'}
              </p>
            </button>
          ))}
        </div>

        <div className="drivers-detail">
          {loadingDetail ? <p className="auth-form__hint">Loading driver details...</p> : null}
          {!loadingDetail && !detail ? <p className="auth-form__hint">Select a driver to view details.</p> : null}
          {detail ? (
            <>
              <div className="drivers-detail__header">
                <p>
                  <strong>
                    {detail.first_name} {detail.last_name}
                  </strong>{' '}
                  · {detail.license_number}
                </p>
                <p>{detail.email}</p>
                <p className="auth-form__hint">
                  {detail.phone || 'No phone'} · {detail.national_id || 'No national ID'}
                  {detail.license_class ? ` · Class ${detail.license_class}` : ''}
                  {detail.license_expiry ? ` · Expires ${detail.license_expiry}` : ''}
                </p>
              </div>

              <div className="drivers-detail__stats">
                <p>
                  <strong>{detail.vehicle_count}</strong> registered vehicle{detail.vehicle_count === 1 ? '' : 's'}
                </p>
                <p>
                  <strong>{detail.station_violation_count}</strong> violation
                  {detail.station_violation_count === 1 ? '' : 's'} at your station
                </p>
              </div>

              <div className="drivers-detail__vehicles">
                <h4>Registered vehicles</h4>
                {detail.vehicles.length === 0 ? (
                  <p className="auth-form__hint">No vehicles registered.</p>
                ) : (
                  detail.vehicles.map((vehicle) => (
                    <p key={vehicle.id}>
                      <strong>{vehicle.plate_number}</strong> · {vehicle.make} {vehicle.model} ({vehicle.year})
                      {vehicle.color ? ` · ${vehicle.color}` : ''} · {vehicle.is_active ? 'Active' : 'Inactive'}
                    </p>
                  ))
                )}
              </div>

              <div className="drivers-detail__actions">
                <Button type="button" variant="secondary" onClick={() => toggleActive(detail)} isLoading={saving}>
                  {detail.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => handleDelete(detail.id)} isLoading={saving}>
                  Delete
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
