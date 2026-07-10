import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Input } from '@camtraffic/ui';
import type {
  CreateOfficerVehiclePayload,
  OfficerDriverManagementRecord,
  OfficerVehicleManagementDetail,
  OfficerVehicleManagementRecord,
  UpdateOfficerVehiclePayload,
} from '@camtraffic/types';

interface OfficerVehiclesManagementPageProps {
  onLoadDrivers: () => Promise<OfficerDriverManagementRecord[]>;
  onLoadList: (params?: { search?: string; is_active?: string; owner_id?: string }) => Promise<OfficerVehicleManagementRecord[]>;
  onLoadDetail: (vehicleId: number) => Promise<OfficerVehicleManagementDetail>;
  onCreate: (payload: CreateOfficerVehiclePayload) => Promise<{ vehicle: OfficerVehicleManagementRecord; message: string }>;
  onUpdate: (
    vehicleId: number,
    payload: UpdateOfficerVehiclePayload,
  ) => Promise<{ vehicle: OfficerVehicleManagementRecord; message: string }>;
  onDelete: (vehicleId: number) => Promise<string>;
}

export function OfficerVehiclesManagementPage({
  onLoadDrivers,
  onLoadList,
  onLoadDetail,
  onCreate,
  onUpdate,
  onDelete,
}: OfficerVehiclesManagementPageProps) {
  const [drivers, setDrivers] = useState<OfficerDriverManagementRecord[]>([]);
  const [records, setRecords] = useState<OfficerVehicleManagementRecord[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<OfficerVehicleManagementDetail | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [ownerId, setOwnerId] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [color, setColor] = useState('');
  const [registrationDate, setRegistrationDate] = useState('');

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
        setErrorMessage('Unable to load vehicles.');
      } finally {
        setLoadingList(false);
      }
    },
    [activeFilter, onLoadList, search],
  );

  useEffect(() => {
    async function bootstrap() {
      try {
        const driverData = await onLoadDrivers();
        setDrivers(driverData);
        if (driverData.length > 0) {
          setOwnerId(driverData[0].user_id);
        }
      } catch {
        setErrorMessage('Unable to load drivers for vehicle registration.');
      }
      await refreshList('', 'all');
    }

    void bootstrap();
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
        setErrorMessage('Unable to load vehicle details.');
        setDetail(null);
      } finally {
        setLoadingDetail(false);
      }
    }

    void loadDetail();
  }, [onLoadDetail, selectedId]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ownerId) {
      setErrorMessage('Select a driver owner before registering a vehicle.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await onCreate({
        owner_id: ownerId,
        plate_number: plateNumber,
        make,
        model,
        year: Number(year),
        color,
        registration_date: registrationDate || null,
        is_active: true,
      });
      setSuccessMessage(result.message);
      setPlateNumber('');
      setMake('');
      setModel('');
      setYear(String(new Date().getFullYear()));
      setColor('');
      setRegistrationDate('');
      await refreshList();
    } catch {
      setErrorMessage('Unable to register vehicle.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(vehicle: OfficerVehicleManagementRecord) {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await onUpdate(vehicle.id, { is_active: !vehicle.is_active });
      setSuccessMessage(result.message);
      await refreshList();
      if (selectedId === vehicle.id) {
        const updatedDetail = await onLoadDetail(vehicle.id);
        setDetail(updatedDetail);
      }
    } catch {
      setErrorMessage('Unable to update vehicle.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(vehicleId: number) {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const message = await onDelete(vehicleId);
      setSuccessMessage(message);
      await refreshList();
    } catch {
      setErrorMessage('Unable to delete vehicle.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Vehicle Management" subtitle="Task 069 — Vehicle registration and owner records">
      <form className="auth-form" onSubmit={handleCreate}>
        <label className="auth-form__field">
          <span className="auth-form__label">Driver owner</span>
          <select
            className="auth-form__select"
            value={ownerId}
            onChange={(event) => setOwnerId(event.target.value)}
            required
          >
            {drivers.length === 0 ? <option value="">No drivers available</option> : null}
            {drivers.map((driver) => (
              <option key={driver.user_id} value={driver.user_id}>
                {driver.license_number} — {driver.first_name} {driver.last_name}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Plate number"
          name="plate_number"
          value={plateNumber}
          onChange={(event) => setPlateNumber(event.target.value)}
          required
        />
        <Input label="Make" name="make" value={make} onChange={(event) => setMake(event.target.value)} required />
        <Input label="Model" name="model" value={model} onChange={(event) => setModel(event.target.value)} required />
        <Input
          label="Year"
          name="year"
          type="number"
          min={1900}
          max={2100}
          value={year}
          onChange={(event) => setYear(event.target.value)}
          required
        />
        <Input label="Color" name="color" value={color} onChange={(event) => setColor(event.target.value)} />
        <Input
          label="Registration date"
          name="registration_date"
          type="date"
          value={registrationDate}
          onChange={(event) => setRegistrationDate(event.target.value)}
        />
        <Button type="submit" isLoading={saving} disabled={drivers.length === 0}>
          Register vehicle
        </Button>
      </form>

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
      {successMessage ? <p className="auth-form__success">{successMessage}</p> : null}

      <div className="vehicles-layout">
        <div className="vehicles-list">
          {loadingList ? <p className="auth-form__hint">Loading vehicles...</p> : null}
          {!loadingList && records.length === 0 ? <p className="auth-form__hint">No vehicles found.</p> : null}
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
              <p>{vehicle.owner_name}</p>
              <p className="auth-form__hint">
                {vehicle.owner_license_number || 'No license'} · {vehicle.station_violation_count} station violation
                {vehicle.station_violation_count === 1 ? '' : 's'} · {vehicle.is_active ? 'Active' : 'Inactive'}
              </p>
            </button>
          ))}
        </div>

        <div className="vehicles-detail">
          {loadingDetail ? <p className="auth-form__hint">Loading vehicle details...</p> : null}
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
                <p className="auth-form__hint">
                  Owner: {detail.owner_name} · {detail.owner_email}
                  {detail.owner_license_number ? ` · License ${detail.owner_license_number}` : ''}
                </p>
              </div>

              <div className="vehicles-detail__stats">
                <p>
                  <strong>{detail.station_violation_count}</strong> violation
                  {detail.station_violation_count === 1 ? '' : 's'} at your station
                </p>
              </div>

              <div className="vehicles-detail__violations">
                <h4>Recent station violations</h4>
                {detail.station_violations.length === 0 ? (
                  <p className="auth-form__hint">No violations recorded at your station.</p>
                ) : (
                  detail.station_violations.map((violation) => (
                    <p key={violation.id}>
                      <strong>{violation.traffic_sign_code}</strong> · {violation.traffic_sign_name} · {violation.status}{' '}
                      · {violation.detected_at}
                    </p>
                  ))
                )}
              </div>

              <div className="vehicles-detail__actions">
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
