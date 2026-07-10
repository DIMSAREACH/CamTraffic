import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Input } from '@camtraffic/ui';
import type { BackupRecord, BackupRestoreResult } from '@camtraffic/types';

interface BackupRestorePageProps {
  onLoad: (params?: { status?: string }) => Promise<BackupRecord[]>;
  onCreate: (notes?: string) => Promise<{ backup: BackupRecord; message: string }>;
  onRestore: (backupId: number) => Promise<{ result: BackupRestoreResult; message: string }>;
  onDelete: (backupId: number) => Promise<string>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BackupRestorePage({ onLoad, onCreate, onRestore, onDelete }: BackupRestorePageProps) {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoreSummary, setRestoreSummary] = useState<BackupRestoreResult | null>(null);

  async function refresh(nextStatusFilter = statusFilter) {
    setLoading(true);
    setError(null);
    try {
      const data = await onLoad({ status: nextStatusFilter || undefined });
      setBackups(data);
    } catch {
      setError('Unable to load backup records.');
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
    setRestoreSummary(null);
    try {
      const result = await onCreate(notes || undefined);
      setMessage(result.message);
      setNotes('');
      await refresh();
    } catch {
      setError('Unable to create backup.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore(backupId: number) {
    setSaving(true);
    setError(null);
    setMessage(null);
    setRestoreSummary(null);
    try {
      const result = await onRestore(backupId);
      setMessage(result.message);
      setRestoreSummary(result.result);
    } catch {
      setError('Unable to restore backup.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(backupId: number) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onDelete(backupId);
      setMessage(result);
      await refresh();
    } catch {
      setError('Unable to delete backup.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Backup & Restore" subtitle="Task 058 — Snapshot and restore core reference data">
      <p className="auth-form__hint">
        Backups include system settings, notification templates, sign categories, and traffic signs as JSON files.
      </p>

      <form className="auth-form" onSubmit={handleCreate}>
        <Input
          label="Backup notes"
          name="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional description for this backup"
        />
        <Button type="submit" isLoading={saving}>
          Create backup
        </Button>
      </form>

      <div className="backup-toolbar">
        <label className="auth-form__field">
          <span className="auth-form__label">Status filter</span>
          <select
            className="auth-form__select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </label>
        <Button type="button" variant="secondary" onClick={() => refresh()} isLoading={loading}>
          Refresh history
        </Button>
      </div>

      {loading && backups.length === 0 ? <p className="auth-form__hint">Loading backup records...</p> : null}
      {error ? <p className="auth-form__error">{error}</p> : null}
      {message ? <p className="auth-form__success">{message}</p> : null}

      {restoreSummary ? (
        <div className="dashboard-stats backup-restore-summary">
          <article className="dashboard-stats__item">
            <p>Settings restored</p>
            <strong>{restoreSummary.system_settings}</strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Templates restored</p>
            <strong>{restoreSummary.notification_templates}</strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Categories restored</p>
            <strong>{restoreSummary.sign_categories}</strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Signs restored</p>
            <strong>{restoreSummary.traffic_signs}</strong>
          </article>
        </div>
      ) : null}

      <div className="backup-list">
        {backups.length === 0 && !loading ? <p className="auth-form__hint">No backups yet.</p> : null}
        {backups.map((backup) => (
          <article className={`backup-list__item backup-list__item--${backup.status}`} key={backup.id}>
            <p>
              <strong>{backup.filename || `Backup #${backup.id}`}</strong> · {backup.status}
            </p>
            <p className="auth-form__hint">
              Size: {formatFileSize(backup.file_size)} · {new Date(backup.created_at).toLocaleString()}
            </p>
            {backup.notes ? <p className="auth-form__hint">{backup.notes}</p> : null}
            {backup.file_url ? (
              <a className="backup-list__download" href={backup.file_url} target="_blank" rel="noreferrer" download>
                Download JSON
              </a>
            ) : null}
            <div className="backup-list__actions">
              <Button
                type="button"
                variant="secondary"
                disabled={backup.status !== 'completed'}
                onClick={() => handleRestore(backup.id)}
                isLoading={saving}
              >
                Restore
              </Button>
              <Button type="button" variant="ghost" onClick={() => handleDelete(backup.id)} isLoading={saving}>
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
