import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Input } from '@camtraffic/ui';
import type {
  CreateNotificationTemplatePayload,
  NotificationChannel,
  NotificationTemplateRecord,
  UpdateNotificationTemplatePayload,
} from '@camtraffic/types';

interface NotificationTemplatesManagementPageProps {
  onLoad: (params?: { search?: string; channel?: string }) => Promise<NotificationTemplateRecord[]>;
  onCreate: (
    payload: CreateNotificationTemplatePayload,
  ) => Promise<{ template: NotificationTemplateRecord; message: string }>;
  onUpdate: (
    templateId: number,
    payload: UpdateNotificationTemplatePayload,
  ) => Promise<{ template: NotificationTemplateRecord; message: string }>;
  onDelete: (templateId: number) => Promise<string>;
}

const CHANNEL_OPTIONS: Array<{ value: NotificationChannel; label: string }> = [
  { value: 'in_app', label: 'In-App' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
];

function formatChannel(channel: NotificationChannel): string {
  return CHANNEL_OPTIONS.find((option) => option.value === channel)?.label ?? channel;
}

export function NotificationTemplatesManagementPage({
  onLoad,
  onCreate,
  onUpdate,
  onDelete,
}: NotificationTemplatesManagementPageProps) {
  const [templates, setTemplates] = useState<NotificationTemplateRecord[]>([]);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<NotificationChannel>('in_app');
  const [subjectEn, setSubjectEn] = useState('');
  const [subjectKm, setSubjectKm] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [bodyKm, setBodyKm] = useState('');

  async function refresh(nextSearch = search, nextChannelFilter = channelFilter) {
    setLoading(true);
    setError(null);
    try {
      const data = await onLoad({
        search: nextSearch || undefined,
        channel: nextChannelFilter || undefined,
      });
      setTemplates(data);
    } catch {
      setError('Unable to load notification templates.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh('', '');
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
        channel,
        subject_en: subjectEn,
        subject_km: subjectKm,
        body_en: bodyEn,
        body_km: bodyKm,
        is_active: true,
      });
      setMessage(result.message);
      setCode('');
      setName('');
      setChannel('in_app');
      setSubjectEn('');
      setSubjectKm('');
      setBodyEn('');
      setBodyKm('');
      await refresh();
    } catch {
      setError('Unable to create notification template.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(template: NotificationTemplateRecord) {
    setSaving(true);
    setError(null);
    try {
      await onUpdate(template.id, { is_active: !template.is_active });
      await refresh();
    } catch {
      setError('Unable to update notification template.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(templateId: number) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onDelete(templateId);
      setMessage(result);
      await refresh();
    } catch {
      setError('Unable to delete notification template.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Notification Templates" subtitle="Task 056 — Template CRUD for email, SMS, and in-app messages">
      <form className="auth-form notification-template-form" onSubmit={handleCreate}>
        <Input label="Template code" name="code" value={code} onChange={(event) => setCode(event.target.value)} required />
        <Input label="Template name" name="name" value={name} onChange={(event) => setName(event.target.value)} required />
        <label className="auth-form__field">
          <span className="auth-form__label">Channel</span>
          <select
            className="auth-form__select"
            value={channel}
            onChange={(event) => setChannel(event.target.value as NotificationChannel)}
          >
            {CHANNEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Subject (English)"
          name="subject_en"
          value={subjectEn}
          onChange={(event) => setSubjectEn(event.target.value)}
          required
        />
        <Input
          label="Subject (Khmer)"
          name="subject_km"
          value={subjectKm}
          onChange={(event) => setSubjectKm(event.target.value)}
        />
        <label className="auth-form__field">
          <span className="auth-form__label">Body (English)</span>
          <textarea
            className="auth-form__textarea"
            name="body_en"
            value={bodyEn}
            onChange={(event) => setBodyEn(event.target.value)}
            rows={4}
            required
          />
        </label>
        <label className="auth-form__field">
          <span className="auth-form__label">Body (Khmer)</span>
          <textarea
            className="auth-form__textarea"
            name="body_km"
            value={bodyKm}
            onChange={(event) => setBodyKm(event.target.value)}
            rows={4}
          />
        </label>
        <Button type="submit" isLoading={saving}>
          Create template
        </Button>
      </form>

      <div className="notification-templates-toolbar">
        <Input
          label="Search"
          name="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Code, name, or subject"
        />
        <label className="auth-form__field">
          <span className="auth-form__label">Channel filter</span>
          <select
            className="auth-form__select"
            value={channelFilter}
            onChange={(event) => setChannelFilter(event.target.value)}
          >
            <option value="">All channels</option>
            {CHANNEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" variant="secondary" onClick={() => refresh()} isLoading={loading}>
          Apply filters
        </Button>
      </div>

      {loading && templates.length === 0 ? <p className="auth-form__hint">Loading notification templates...</p> : null}
      {error ? <p className="auth-form__error">{error}</p> : null}
      {message ? <p className="auth-form__success">{message}</p> : null}

      <div className="notification-templates-list">
        {templates.length === 0 && !loading ? (
          <p className="auth-form__hint">No notification templates yet.</p>
        ) : null}
        {templates.map((template) => (
          <article className={`notification-templates-list__item notification-templates-list__item--${template.channel}`} key={template.id}>
            <p>
              <strong>{template.name}</strong> · {template.code} · {formatChannel(template.channel)} ·{' '}
              {template.is_active ? 'Active' : 'Inactive'}
            </p>
            <p className="auth-form__hint">
              EN: {template.subject_en} · KM: {template.subject_km || '—'}
            </p>
            <p className="notification-templates-list__body">{template.body_en}</p>
            <p className="auth-form__hint">
              {template.notification_count} notification{template.notification_count === 1 ? '' : 's'} sent
            </p>
            <div className="notification-templates-list__actions">
              <Button type="button" variant="secondary" onClick={() => toggleActive(template)} isLoading={saving}>
                {template.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => handleDelete(template.id)} isLoading={saving}>
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
