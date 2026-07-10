import { useEffect, useState } from 'react';
import { Button, Card, Input } from '@camtraffic/ui';
import type { AuditLogAction, AuditLogRecord, AuditLogSummary } from '@camtraffic/types';

interface AuditLogsManagementPageProps {
  onLoadSummary: () => Promise<AuditLogSummary>;
  onLoad: (params?: {
    action?: string;
    module?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
  }) => Promise<AuditLogRecord[]>;
}

const ACTION_OPTIONS: Array<{ value: '' | AuditLogAction; label: string }> = [
  { value: '', label: 'All actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'other', label: 'Other' },
];

function formatActionLabel(action: AuditLogAction): string {
  return action.charAt(0).toUpperCase() + action.slice(1);
}

export function AuditLogsManagementPage({ onLoadSummary, onLoad }: AuditLogsManagementPageProps) {
  const [summary, setSummary] = useState<AuditLogSummary | null>(null);
  const [records, setRecords] = useState<AuditLogRecord[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh(
    nextAction = actionFilter,
    nextModule = moduleFilter,
    nextSearch = search,
    nextDateFrom = dateFrom,
    nextDateTo = dateTo,
  ) {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, logData] = await Promise.all([
        onLoadSummary(),
        onLoad({
          action: nextAction || undefined,
          module: nextModule || undefined,
          search: nextSearch || undefined,
          date_from: nextDateFrom || undefined,
          date_to: nextDateTo || undefined,
          limit: 50,
        }),
      ]);
      setSummary(summaryData);
      setRecords(logData);
    } catch {
      setError('Unable to load audit logs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh('', '', '', '', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card title="Audit Logs" subtitle="Task 055 — System activity trail with filters and summary metrics">
      {summary ? (
        <div className="dashboard-stats audit-logs-summary">
          <article className="dashboard-stats__item">
            <p>Total logs</p>
            <strong>{summary.total_logs}</strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Today</p>
            <strong>{summary.logs_today}</strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Top action</p>
            <strong>{summary.by_action[0] ? formatActionLabel(summary.by_action[0].action) : '—'}</strong>
          </article>
          <article className="dashboard-stats__item">
            <p>Top module</p>
            <strong>{summary.by_module[0]?.module ?? '—'}</strong>
          </article>
        </div>
      ) : null}

      <div className="audit-logs-toolbar">
        <label className="auth-form__field">
          <span className="auth-form__label">Action</span>
          <select
            className="auth-form__select"
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
          >
            {ACTION_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Module"
          name="module"
          value={moduleFilter}
          onChange={(event) => setModuleFilter(event.target.value)}
          placeholder="users, cameras, auth..."
        />
        <Input
          label="Search"
          name="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Description, object type, or ID"
        />
        <Input label="Date from" name="date_from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <Input label="Date to" name="date_to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        <Button type="button" variant="secondary" onClick={() => refresh()} isLoading={loading}>
          Apply filters
        </Button>
      </div>

      {loading && records.length === 0 ? <p className="auth-form__hint">Loading audit logs...</p> : null}
      {error ? <p className="auth-form__error">{error}</p> : null}

      <div className="audit-log-list">
        {records.length === 0 && !loading ? <p className="auth-form__hint">No audit logs match the current filters.</p> : null}
        {records.map((record) => (
          <article className={`audit-log-item audit-log-item--${record.action}`} key={record.id}>
            <div className="audit-log-item__header">
              <strong>{formatActionLabel(record.action)}</strong>
              <span className="audit-log-item__module">{record.module}</span>
            </div>
            <p>{record.description || 'No description provided.'}</p>
            <p>
              Actor: <strong>{record.user_full_name}</strong>
              {record.user_email ? ` (${record.user_email})` : ''}
            </p>
            {record.object_type ? (
              <p className="auth-form__hint">
                Object: {record.object_type}
                {record.object_id ? ` #${record.object_id}` : ''}
              </p>
            ) : null}
            <p className="auth-form__hint">
              IP: {record.ip_address || 'N/A'} · {new Date(record.created_at).toLocaleString()}
            </p>
          </article>
        ))}
      </div>
    </Card>
  );
}
