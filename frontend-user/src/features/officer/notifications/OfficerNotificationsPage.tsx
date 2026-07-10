import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Input, useTranslation } from '@camtraffic/ui';
import type { OfficerNotificationRecord, OfficerNotificationSummary } from '@camtraffic/types';

interface OfficerNotificationsPageProps {
  onLoadSummary: () => Promise<OfficerNotificationSummary>;
  onLoadList: (params?: { search?: string; is_read?: string; limit?: number }) => Promise<OfficerNotificationRecord[]>;
  onLoadDetail: (notificationId: number) => Promise<OfficerNotificationRecord>;
  onUpdate: (notificationId: number, isRead: boolean) => Promise<{ notification: OfficerNotificationRecord; message: string }>;
  onMarkAllRead: () => Promise<{ updated: number; message: string }>;
}

export function OfficerNotificationsPage({
  onLoadSummary,
  onLoadList,
  onLoadDetail,
  onUpdate,
  onMarkAllRead,
}: OfficerNotificationsPageProps) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<OfficerNotificationSummary | null>(null);
  const [records, setRecords] = useState<OfficerNotificationRecord[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<OfficerNotificationRecord | null>(null);
  const [search, setSearch] = useState('');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const refreshSummary = useCallback(async () => {
    try {
      const data = await onLoadSummary();
      setSummary(data);
    } catch {
      setErrorMessage(t.errors.generic);
    }
  }, [onLoadSummary, t.errors.generic]);

  const refreshList = useCallback(
    async (nextSearch = search, nextReadFilter = readFilter) => {
      setLoadingList(true);
      setErrorMessage(null);
      try {
        const data = await onLoadList({
          search: nextSearch || undefined,
          is_read:
            nextReadFilter === 'all' ? undefined : nextReadFilter === 'read' ? 'true' : 'false',
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
    [onLoadList, readFilter, search, t.errors.generic],
  );

  useEffect(() => {
    async function bootstrap() {
      await refreshSummary();
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

    const notificationId = selectedId;

    async function loadDetail() {
      setLoadingDetail(true);
      setErrorMessage(null);
      try {
        const data = await onLoadDetail(notificationId);
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

  async function handleToggleRead(notification: OfficerNotificationRecord) {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await onUpdate(notification.id, !notification.is_read);
      setSuccessMessage(result.message);
      await refreshSummary();
      await refreshList();
      if (selectedId === notification.id) {
        setDetail(result.notification);
      }
    } catch {
      setErrorMessage(t.errors.generic);
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkAllRead() {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await onMarkAllRead();
      setSuccessMessage(result.message);
      await refreshSummary();
      await refreshList();
      if (selectedId) {
        const updatedDetail = await onLoadDetail(selectedId);
        setDetail(updatedDetail);
      }
    } catch {
      setErrorMessage(t.errors.generic);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title={t.nav.notifications} subtitle="Task 072 — Officer notification center">
      {summary ? (
        <p className="auth-form__hint">
          Total: <strong>{summary.total}</strong> · Unread: <strong>{summary.unread}</strong>
        </p>
      ) : null}

      <div className="notifications-toolbar">
        <Input label="Search" name="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <label className="auth-form__field">
          <span className="auth-form__label">Status</span>
          <select
            className="auth-form__select"
            value={readFilter}
            onChange={(event) => setReadFilter(event.target.value as 'all' | 'unread' | 'read')}
          >
            <option value="all">All notifications</option>
            <option value="unread">Unread only</option>
            <option value="read">Read only</option>
          </select>
        </label>
        <Button type="button" variant="secondary" onClick={() => refreshList(search, readFilter)} isLoading={loadingList}>
          Search
        </Button>
        <Button type="button" onClick={handleMarkAllRead} isLoading={saving} disabled={!summary || summary.unread === 0}>
          Mark all read
        </Button>
      </div>

      {errorMessage ? <p className="auth-form__error">{errorMessage}</p> : null}
      {successMessage ? <p className="auth-form__success">{successMessage}</p> : null}
      {loadingList ? <p className="auth-form__hint">{t.common.loading}</p> : null}

      <div className="notifications-layout">
        <section className="notifications-list" aria-label="Notification list">
          {records.length === 0 && !loadingList ? (
            <p className="auth-form__hint">No notifications match the current filters.</p>
          ) : null}
          {records.map((record) => (
            <button
              type="button"
              key={record.id}
              className={
                record.id === selectedId
                  ? 'notifications-list__item notifications-list__item--active'
                  : 'notifications-list__item'
              }
              onClick={() => setSelectedId(record.id)}
            >
              <p>
                <strong>{record.title}</strong> · {record.is_read ? 'Read' : 'Unread'}
              </p>
              <p className="auth-form__hint">{new Date(record.created_at).toLocaleString()}</p>
            </button>
          ))}
        </section>

        <section className="notifications-detail" aria-label="Notification detail">
          {loadingDetail ? <p className="auth-form__hint">{t.common.loading}</p> : null}
          {!loadingDetail && !detail ? (
            <p className="auth-form__hint">Select a notification to view details.</p>
          ) : null}
          {detail ? (
            <>
              <header className="notifications-detail__header">
                <p>
                  <strong>{detail.title}</strong>
                </p>
                <p className="auth-form__hint">
                  {detail.is_read ? 'Read' : 'Unread'}
                  {detail.read_at ? ` · ${new Date(detail.read_at).toLocaleString()}` : ''}
                  {detail.template_code ? ` · ${detail.template_code}` : ''}
                </p>
              </header>

              <div className="notifications-detail__body">
                <p>{detail.body}</p>
              </div>

              <div className="notifications-detail__actions">
                <Button type="button" variant="secondary" onClick={() => handleToggleRead(detail)} isLoading={saving}>
                  {detail.is_read ? 'Mark unread' : 'Mark read'}
                </Button>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </Card>
  );
}
