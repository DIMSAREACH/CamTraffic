import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Input } from '@camtraffic/ui';
import type {
  CreateReportExportPayload,
  ReportCatalogItem,
  ReportExportRecord,
  ReportFormat,
} from '@camtraffic/types';

interface OfficerReportsPageProps {
  onLoadCatalog: () => Promise<ReportCatalogItem[]>;
  onLoadExports: (params?: { report_type?: string; status?: string }) => Promise<ReportExportRecord[]>;
  onCreateExport: (payload: CreateReportExportPayload) => Promise<{ exportRecord: ReportExportRecord; message: string }>;
}

const FORMAT_OPTIONS: ReportFormat[] = ['csv', 'pdf', 'excel'];

export function OfficerReportsPage({ onLoadCatalog, onLoadExports, onCreateExport }: OfficerReportsPageProps) {
  const [catalog, setCatalog] = useState<ReportCatalogItem[]>([]);
  const [exports, setExports] = useState<ReportExportRecord[]>([]);
  const [reportType, setReportType] = useState('');
  const [format, setFormat] = useState<ReportFormat>('csv');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshExports(nextStatusFilter = statusFilter) {
    setLoading(true);
    setError(null);
    try {
      const data = await onLoadExports({ status: nextStatusFilter || undefined });
      setExports(data);
    } catch {
      setError('Unable to load report exports.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const catalogData = await onLoadCatalog();
        setCatalog(catalogData);
        if (catalogData.length > 0) {
          setReportType(catalogData[0].code);
        }
      } catch {
        setError('Unable to load report catalog.');
      }
      await refreshExports('');
    }

    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reportType) {
      setError('Select a report type before generating.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onCreateExport({
        report_type: reportType,
        format,
        parameters: {
          ...(dateFrom ? { date_from: dateFrom } : {}),
          ...(dateTo ? { date_to: dateTo } : {}),
        },
      });
      setMessage(result.message);
      await refreshExports(statusFilter);
    } catch {
      setError('Unable to generate report export.');
    } finally {
      setSaving(false);
    }
  }

  const selectedReport = catalog.find((item) => item.code === reportType);

  useEffect(() => {
    if (!selectedReport) {
      return;
    }
    if (!selectedReport.supported_formats.includes(format)) {
      setFormat(selectedReport.supported_formats[0] ?? 'csv');
    }
  }, [reportType, selectedReport, format]);

  const availableFormats = selectedReport?.supported_formats ?? FORMAT_OPTIONS;

  return (
    <Card title="Reports" subtitle="Task 071 — Station-scoped report catalog, export, and history">
      <p className="auth-form__hint">
        Reports are scoped to your assigned police station. Exports include only station violations, detections, fines,
        and cameras.
      </p>

      <form className="auth-form" onSubmit={handleGenerate}>
        <label className="auth-form__field">
          <span className="auth-form__label">Report type</span>
          <select
            className="auth-form__select"
            value={reportType}
            onChange={(event) => setReportType(event.target.value)}
          >
            {catalog.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {selectedReport ? <p className="auth-form__hint">{selectedReport.description}</p> : null}
        <label className="auth-form__field">
          <span className="auth-form__label">Format</span>
          <select className="auth-form__select" value={format} onChange={(event) => setFormat(event.target.value as ReportFormat)}>
            {availableFormats.map((option) => (
              <option key={option} value={option}>
                {option.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Date from"
          name="date_from"
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
        />
        <Input label="Date to" name="date_to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        <Button type="submit" isLoading={saving} disabled={catalog.length === 0}>
          Generate report
        </Button>
      </form>

      <div className="reports-toolbar">
        <label className="auth-form__field">
          <span className="auth-form__label">Status filter</span>
          <select
            className="auth-form__select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </label>
        <Button type="button" variant="secondary" onClick={() => refreshExports(statusFilter)} isLoading={loading}>
          Refresh history
        </Button>
      </div>

      {loading && exports.length === 0 ? <p className="auth-form__hint">Loading report exports...</p> : null}
      {error ? <p className="auth-form__error">{error}</p> : null}
      {message ? <p className="auth-form__success">{message}</p> : null}

      <div className="reports-list">
        {exports.length === 0 && !loading ? <p className="auth-form__hint">No report exports yet.</p> : null}
        {exports.map((record) => (
          <article className="reports-list__item" key={record.id}>
            <p>
              <strong>
                {record.report_type} · {record.format.toUpperCase()}
              </strong>{' '}
              · {record.status}
            </p>
            <p className="auth-form__hint">{new Date(record.created_at).toLocaleString()}</p>
            {record.error_message ? <p className="auth-form__error">{record.error_message}</p> : null}
            {record.file_url ? (
              <a className="reports-list__download" href={record.file_url} target="_blank" rel="noreferrer" download>
                Download {record.format.toUpperCase()} export
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </Card>
  );
}
