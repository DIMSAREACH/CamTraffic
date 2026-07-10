import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Input } from '@camtraffic/ui';
import type {
  CreateSystemSettingPayload,
  SystemSettingRecord,
  SystemSettingValueType,
  UpdateSystemSettingPayload,
} from '@camtraffic/types';

interface SystemSettingsManagementPageProps {
  onLoad: (params?: { search?: string; value_type?: string; is_public?: boolean }) => Promise<SystemSettingRecord[]>;
  onCreate: (payload: CreateSystemSettingPayload) => Promise<{ setting: SystemSettingRecord; message: string }>;
  onUpdate: (
    settingId: number,
    payload: UpdateSystemSettingPayload,
  ) => Promise<{ setting: SystemSettingRecord; message: string }>;
  onDelete: (settingId: number) => Promise<string>;
}

const VALUE_TYPE_OPTIONS: Array<{ value: SystemSettingValueType; label: string }> = [
  { value: 'string', label: 'String' },
  { value: 'integer', label: 'Integer' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'json', label: 'JSON' },
];

function formatValueType(valueType: SystemSettingValueType): string {
  return VALUE_TYPE_OPTIONS.find((option) => option.value === valueType)?.label ?? valueType;
}

export function SystemSettingsManagementPage({
  onLoad,
  onCreate,
  onUpdate,
  onDelete,
}: SystemSettingsManagementPageProps) {
  const [settings, setSettings] = useState<SystemSettingRecord[]>([]);
  const [draftValues, setDraftValues] = useState<Record<number, string>>({});
  const [search, setSearch] = useState('');
  const [valueTypeFilter, setValueTypeFilter] = useState('');
  const [publicFilter, setPublicFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [valueType, setValueType] = useState<SystemSettingValueType>('string');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  async function refresh(nextSearch = search, nextValueType = valueTypeFilter, nextPublicFilter = publicFilter) {
    setLoading(true);
    setError(null);
    try {
      const data = await onLoad({
        search: nextSearch || undefined,
        value_type: nextValueType || undefined,
        is_public: nextPublicFilter === '' ? undefined : nextPublicFilter === 'true',
      });
      setSettings(data);
      setDraftValues(Object.fromEntries(data.map((setting) => [setting.id, setting.value])));
    } catch {
      setError('Unable to load system settings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh('', '', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onCreate({
        key,
        value,
        value_type: valueType,
        description,
        is_public: isPublic,
      });
      setMessage(result.message);
      setKey('');
      setValue('');
      setValueType('string');
      setDescription('');
      setIsPublic(false);
      await refresh();
    } catch {
      setError('Unable to create system setting.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(setting: SystemSettingRecord) {
    const nextValue = draftValues[setting.id];
    if (nextValue === undefined || nextValue === setting.value) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onUpdate(setting.id, { value: nextValue });
      setMessage(result.message);
      await refresh();
    } catch {
      setError('Unable to update system setting.');
    } finally {
      setSaving(false);
    }
  }

  async function togglePublic(setting: SystemSettingRecord) {
    setSaving(true);
    setError(null);
    try {
      await onUpdate(setting.id, { is_public: !setting.is_public });
      await refresh();
    } catch {
      setError('Unable to update system setting visibility.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(settingId: number) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onDelete(settingId);
      setMessage(result);
      await refresh();
    } catch {
      setError('Unable to delete system setting.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="System Settings" subtitle="Task 057 — Global configuration keys for the CamTraffic platform">
      <form className="auth-form system-settings-form" onSubmit={handleCreate}>
        <Input label="Setting key" name="key" value={key} onChange={(event) => setKey(event.target.value)} required />
        <label className="auth-form__field">
          <span className="auth-form__label">Value type</span>
          <select
            className="auth-form__select"
            value={valueType}
            onChange={(event) => setValueType(event.target.value as SystemSettingValueType)}
          >
            {VALUE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Input label="Value" name="value" value={value} onChange={(event) => setValue(event.target.value)} required />
        <Input
          label="Description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <label className="auth-form__field system-settings-form__checkbox">
          <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
          <span>Expose publicly to client apps</span>
        </label>
        <Button type="submit" isLoading={saving}>
          Create setting
        </Button>
      </form>

      <div className="system-settings-toolbar">
        <Input
          label="Search"
          name="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Key, value, or description"
        />
        <label className="auth-form__field">
          <span className="auth-form__label">Type filter</span>
          <select
            className="auth-form__select"
            value={valueTypeFilter}
            onChange={(event) => setValueTypeFilter(event.target.value)}
          >
            <option value="">All types</option>
            {VALUE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="auth-form__field">
          <span className="auth-form__label">Visibility</span>
          <select
            className="auth-form__select"
            value={publicFilter}
            onChange={(event) => setPublicFilter(event.target.value)}
          >
            <option value="">All settings</option>
            <option value="true">Public only</option>
            <option value="false">Private only</option>
          </select>
        </label>
        <Button type="button" variant="secondary" onClick={() => refresh()} isLoading={loading}>
          Apply filters
        </Button>
      </div>

      {loading && settings.length === 0 ? <p className="auth-form__hint">Loading system settings...</p> : null}
      {error ? <p className="auth-form__error">{error}</p> : null}
      {message ? <p className="auth-form__success">{message}</p> : null}

      <div className="system-settings-list">
        {settings.length === 0 && !loading ? <p className="auth-form__hint">No system settings match the current filters.</p> : null}
        {settings.map((setting) => (
          <article className={`system-settings-list__item system-settings-list__item--${setting.value_type}`} key={setting.id}>
            <p>
              <strong>{setting.key}</strong> · {formatValueType(setting.value_type)} ·{' '}
              {setting.is_public ? 'Public' : 'Private'}
            </p>
            <p className="auth-form__hint">{setting.description || 'No description'}</p>
            <Input
              label="Value"
              name={`value_${setting.id}`}
              value={draftValues[setting.id] ?? setting.value}
              onChange={(event) =>
                setDraftValues((current) => ({
                  ...current,
                  [setting.id]: event.target.value,
                }))
              }
            />
            <div className="system-settings-list__actions">
              <Button type="button" variant="secondary" onClick={() => handleSave(setting)} isLoading={saving}>
                Save value
              </Button>
              <Button type="button" variant="secondary" onClick={() => togglePublic(setting)} isLoading={saving}>
                {setting.is_public ? 'Make private' : 'Make public'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => handleDelete(setting.id)} isLoading={saving}>
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
