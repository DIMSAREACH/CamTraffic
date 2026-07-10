import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Input } from '@camtraffic/ui';
import type {
  CreatePoliceStationPayload,
  PoliceStationManagementRecord,
  UpdatePoliceStationPayload,
} from '@camtraffic/types';

interface PoliceStationsManagementPageProps {
  onLoad: (params?: { search?: string; province?: string }) => Promise<PoliceStationManagementRecord[]>;
  onCreate: (
    payload: CreatePoliceStationPayload,
  ) => Promise<{ station: PoliceStationManagementRecord; message: string }>;
  onUpdate: (
    stationId: number,
    payload: UpdatePoliceStationPayload,
  ) => Promise<{ station: PoliceStationManagementRecord; message: string }>;
  onDelete: (stationId: number) => Promise<string>;
}

export function PoliceStationsManagementPage({
  onLoad,
  onCreate,
  onUpdate,
  onDelete,
}: PoliceStationsManagementPageProps) {
  const [stations, setStations] = useState<PoliceStationManagementRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [nameKm, setNameKm] = useState('');
  const [address, setAddress] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [phone, setPhone] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  async function refresh(nextSearch = search) {
    setLoading(true);
    setError(null);
    try {
      const data = await onLoad({ search: nextSearch || undefined });
      setStations(data);
    } catch {
      setError('Unable to load police stations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onCreate({
        code,
        name,
        name_km: nameKm,
        address,
        province,
        district,
        phone,
        latitude: latitude || null,
        longitude: longitude || null,
        is_active: true,
      });
      setMessage(result.message);
      setCode('');
      setName('');
      setNameKm('');
      setAddress('');
      setProvince('');
      setDistrict('');
      setPhone('');
      setLatitude('');
      setLongitude('');
      await refresh();
    } catch {
      setError('Unable to create police station.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(station: PoliceStationManagementRecord) {
    setSaving(true);
    setError(null);
    try {
      await onUpdate(station.id, { is_active: !station.is_active });
      await refresh();
    } catch {
      setError('Unable to update police station.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(stationId: number) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onDelete(stationId);
      setMessage(result);
      await refresh();
    } catch {
      setError('Unable to delete police station. It may still have assigned officers.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Police Station Management" subtitle="Task 042 — Station CRUD and location records">
      <form className="auth-form" onSubmit={handleCreate}>
        <Input label="Station code" name="code" value={code} onChange={(event) => setCode(event.target.value)} required />
        <Input label="Name" name="name" value={name} onChange={(event) => setName(event.target.value)} required />
        <Input
          label="Khmer name"
          name="name_km"
          value={nameKm}
          onChange={(event) => setNameKm(event.target.value)}
        />
        <Input
          label="Address"
          name="address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          required
        />
        <Input
          label="Province"
          name="province"
          value={province}
          onChange={(event) => setProvince(event.target.value)}
          required
        />
        <Input
          label="District"
          name="district"
          value={district}
          onChange={(event) => setDistrict(event.target.value)}
        />
        <Input label="Phone" name="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <Input
          label="Latitude"
          name="latitude"
          value={latitude}
          onChange={(event) => setLatitude(event.target.value)}
        />
        <Input
          label="Longitude"
          name="longitude"
          value={longitude}
          onChange={(event) => setLongitude(event.target.value)}
        />
        <Button type="submit" isLoading={saving}>
          Create station
        </Button>
      </form>

      <div className="police-stations-toolbar">
        <Input label="Search" name="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Button type="button" variant="secondary" onClick={() => refresh(search)} isLoading={loading}>
          Search
        </Button>
      </div>

      {loading ? <p className="auth-form__hint">Loading police stations...</p> : null}
      {error ? <p className="auth-form__error">{error}</p> : null}
      {message ? <p className="auth-form__success">{message}</p> : null}

      <div className="police-stations-list">
        {stations.map((station) => (
          <article className="police-stations-list__item" key={station.id}>
            <p>
              <strong>{station.code}</strong> · {station.name} · {station.is_active ? 'Active' : 'Inactive'}
            </p>
            <p>{station.address}</p>
            <p className="auth-form__hint">
              {station.province}
              {station.district ? ` · ${station.district}` : ''}
              {station.phone ? ` · ${station.phone}` : ''}
              {station.latitude && station.longitude ? ` · ${station.latitude}, ${station.longitude}` : ''}
            </p>
            <div className="police-stations-list__actions">
              <Button type="button" variant="secondary" onClick={() => toggleActive(station)} isLoading={saving}>
                {station.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => handleDelete(station.id)} isLoading={saving}>
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
