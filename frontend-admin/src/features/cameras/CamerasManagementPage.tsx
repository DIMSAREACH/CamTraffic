import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Input } from '@camtraffic/ui';
import type {
  CameraManagementRecord,
  CameraStatus,
  CreateCameraPayload,
  PoliceStationOption,
  UpdateCameraPayload,
} from '@camtraffic/types';

interface CamerasManagementPageProps {
  onLoadStations: () => Promise<PoliceStationOption[]>;
  onLoad: (params?: {
    search?: string;
    station_id?: string;
    status?: string;
    is_active?: string;
  }) => Promise<CameraManagementRecord[]>;
  onCreate: (payload: CreateCameraPayload) => Promise<{ camera: CameraManagementRecord; message: string }>;
  onUpdate: (
    cameraId: number,
    payload: UpdateCameraPayload,
  ) => Promise<{ camera: CameraManagementRecord; message: string }>;
  onDelete: (cameraId: number) => Promise<string>;
}

const STATUS_OPTIONS: CameraStatus[] = ['online', 'offline', 'maintenance', 'error'];

export function CamerasManagementPage({
  onLoadStations,
  onLoad,
  onCreate,
  onUpdate,
  onDelete,
}: CamerasManagementPageProps) {
  const [stations, setStations] = useState<PoliceStationOption[]>([]);
  const [cameras, setCameras] = useState<CameraManagementRecord[]>([]);
  const [search, setSearch] = useState('');
  const [stationFilter, setStationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [status, setStatus] = useState<CameraStatus>('offline');
  const [stationId, setStationId] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  async function refresh(nextSearch = search, nextStationFilter = stationFilter, nextStatusFilter = statusFilter) {
    setLoading(true);
    setError(null);
    try {
      const data = await onLoad({
        search: nextSearch || undefined,
        station_id: nextStationFilter || undefined,
        status: nextStatusFilter || undefined,
      });
      setCameras(data);
    } catch {
      setError('Unable to load cameras.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const stationData = await onLoadStations();
        setStations(stationData);
      } catch {
        setError('Unable to load police stations for camera assignment.');
      }
      await refresh('', '', '');
    }

    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onCreate({
        name,
        code,
        location,
        stream_url: streamUrl,
        status,
        station_id: stationId ? Number(stationId) : null,
        latitude: latitude || null,
        longitude: longitude || null,
        is_active: true,
      });
      setMessage(result.message);
      setName('');
      setCode('');
      setLocation('');
      setStreamUrl('');
      setStatus('offline');
      setStationId('');
      setLatitude('');
      setLongitude('');
      await refresh();
    } catch {
      setError('Unable to create camera.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(camera: CameraManagementRecord) {
    setSaving(true);
    setError(null);
    try {
      await onUpdate(camera.id, { is_active: !camera.is_active });
      await refresh();
    } catch {
      setError('Unable to update camera.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cameraId: number) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onDelete(cameraId);
      setMessage(result);
      await refresh();
    } catch {
      setError('Unable to delete camera. It may still have detection history.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Camera Management" subtitle="Task 047 — Camera CRUD and station assignment">
      <form className="auth-form" onSubmit={handleCreate}>
        <Input label="Camera name" name="name" value={name} onChange={(event) => setName(event.target.value)} required />
        <Input label="Camera code" name="code" value={code} onChange={(event) => setCode(event.target.value)} required />
        <Input
          label="Location"
          name="location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          required
        />
        <Input
          label="Stream URL"
          name="stream_url"
          value={streamUrl}
          onChange={(event) => setStreamUrl(event.target.value)}
        />
        <label className="auth-form__field">
          <span className="auth-form__label">Status</span>
          <select className="auth-form__select" value={status} onChange={(event) => setStatus(event.target.value as CameraStatus)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="auth-form__field">
          <span className="auth-form__label">Police station</span>
          <select className="auth-form__select" value={stationId} onChange={(event) => setStationId(event.target.value)}>
            <option value="">Unassigned</option>
            {stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.code} — {station.name}
              </option>
            ))}
          </select>
        </label>
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
          Create camera
        </Button>
      </form>

      <div className="cameras-toolbar">
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
                {station.code} — {station.name}
              </option>
            ))}
          </select>
        </label>
        <label className="auth-form__field">
          <span className="auth-form__label">Status filter</span>
          <select
            className="auth-form__select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" variant="secondary" onClick={() => refresh(search, stationFilter, statusFilter)} isLoading={loading}>
          Filter
        </Button>
      </div>

      {loading ? <p className="auth-form__hint">Loading cameras...</p> : null}
      {error ? <p className="auth-form__error">{error}</p> : null}
      {message ? <p className="auth-form__success">{message}</p> : null}

      <div className="cameras-list">
        {cameras.map((camera) => (
          <article className="cameras-list__item" key={camera.id}>
            <p>
              <strong>
                {camera.name} ({camera.code})
              </strong>{' '}
              · {camera.status} · {camera.is_active ? 'active' : 'inactive'}
            </p>
            <p className="auth-form__hint">
              {camera.location}
              {camera.station_name ? ` · ${camera.station_code} ${camera.station_name}` : ' · No station assigned'}
            </p>
            <p className="auth-form__hint">
              {camera.stream_url ? `Stream ${camera.stream_url}` : 'No stream URL'}
              {camera.latitude && camera.longitude ? ` · ${camera.latitude}, ${camera.longitude}` : ''}
            </p>
            <p className="auth-form__hint">
              {camera.last_health_check
                ? `Last health check ${new Date(camera.last_health_check).toLocaleString()}`
                : 'No health check recorded'}
            </p>
            <div className="cameras-list__actions">
              <Button type="button" variant="secondary" onClick={() => toggleActive(camera)} isLoading={saving}>
                {camera.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => handleDelete(camera.id)} isLoading={saving}>
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
