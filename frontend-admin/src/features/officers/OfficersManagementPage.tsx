import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Input } from '@camtraffic/ui';
import type {
  CreateOfficerPayload,
  OfficerManagementRecord,
  PoliceStationOption,
  UpdateOfficerPayload,
} from '@camtraffic/types';

interface OfficersManagementPageProps {
  onLoadStations: () => Promise<PoliceStationOption[]>;
  onLoad: (params?: { search?: string; station_id?: string }) => Promise<OfficerManagementRecord[]>;
  onCreate: (payload: CreateOfficerPayload) => Promise<{ officer: OfficerManagementRecord; message: string }>;
  onUpdate: (
    officerId: number,
    payload: UpdateOfficerPayload,
  ) => Promise<{ officer: OfficerManagementRecord; message: string }>;
  onDelete: (officerId: number) => Promise<string>;
}

export function OfficersManagementPage({
  onLoadStations,
  onLoad,
  onCreate,
  onUpdate,
  onDelete,
}: OfficersManagementPageProps) {
  const [stations, setStations] = useState<PoliceStationOption[]>([]);
  const [officers, setOfficers] = useState<OfficerManagementRecord[]>([]);
  const [search, setSearch] = useState('');
  const [stationFilter, setStationFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [rank, setRank] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [stationId, setStationId] = useState('');

  async function refresh(nextSearch = search, nextStationFilter = stationFilter) {
    setLoading(true);
    setError(null);
    try {
      const data = await onLoad({
        search: nextSearch || undefined,
        station_id: nextStationFilter || undefined,
      });
      setOfficers(data);
    } catch {
      setError('Unable to load officers.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const stationData = await onLoadStations();
        setStations(stationData);
        if (stationData.length > 0) {
          setStationId(String(stationData[0].id));
        }
      } catch {
        setError('Unable to load police stations.');
      }
      await refresh('', '');
    }

    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stationId) {
      setError('Select a police station before creating an officer.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onCreate({
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        badge_number: badgeNumber,
        station_id: Number(stationId),
        rank,
        hire_date: hireDate || null,
        is_active: true,
      });
      setMessage(result.message);
      setEmail('');
      setFirstName('');
      setLastName('');
      setPhone('');
      setBadgeNumber('');
      setRank('');
      setHireDate('');
      await refresh();
    } catch {
      setError('Unable to create officer.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(officer: OfficerManagementRecord) {
    setSaving(true);
    setError(null);
    try {
      await onUpdate(officer.id, { is_active: !officer.is_active });
      await refresh();
    } catch {
      setError('Unable to update officer.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(officerId: number) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onDelete(officerId);
      setMessage(result);
      await refresh();
    } catch {
      setError('Unable to delete officer.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Officer Management" subtitle="Task 041 — Officer profiles and station assignments">
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
          label="Badge number"
          name="badge_number"
          value={badgeNumber}
          onChange={(event) => setBadgeNumber(event.target.value)}
          required
        />
        <Input label="Rank" name="rank" value={rank} onChange={(event) => setRank(event.target.value)} />
        <Input
          label="Hire date"
          name="hire_date"
          type="date"
          value={hireDate}
          onChange={(event) => setHireDate(event.target.value)}
        />
        <label className="auth-form__field">
          <span className="auth-form__label">Police station</span>
          <select className="auth-form__select" value={stationId} onChange={(event) => setStationId(event.target.value)}>
            {stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.code} — {station.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" isLoading={saving} disabled={stations.length === 0}>
          Create officer
        </Button>
      </form>

      <div className="officers-toolbar">
        <Input label="Search" name="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <label className="auth-form__field">
          <span className="auth-form__label">Station filter</span>
          <select
            className="auth-form__select"
            value={stationFilter}
            onChange={(event) => setStationFilter(event.target.value)}
          >
            <option value="">All stations</option>
            {stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.code}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" variant="secondary" onClick={() => refresh(search, stationFilter)} isLoading={loading}>
          Search
        </Button>
      </div>

      {loading ? <p className="auth-form__hint">Loading officers...</p> : null}
      {error ? <p className="auth-form__error">{error}</p> : null}
      {message ? <p className="auth-form__success">{message}</p> : null}

      <div className="officers-list">
        {officers.map((officer) => (
          <article className="officers-list__item" key={officer.id}>
            <p>
              <strong>{officer.badge_number}</strong> · {officer.first_name} {officer.last_name} ·{' '}
              {officer.is_active ? 'Active' : 'Inactive'}
            </p>
            <p>{officer.email}</p>
            <p className="auth-form__hint">
              {officer.station_code} — {officer.station_name}
              {officer.rank ? ` · ${officer.rank}` : ''}
              {officer.hire_date ? ` · Hired ${officer.hire_date}` : ''}
            </p>
            <div className="officers-list__actions">
              <Button type="button" variant="secondary" onClick={() => toggleActive(officer)} isLoading={saving}>
                {officer.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => handleDelete(officer.id)} isLoading={saving}>
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
