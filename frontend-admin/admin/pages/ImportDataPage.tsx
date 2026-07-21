import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Camera, Car, CheckCircle2, Database, Download, FileSpreadsheet, FileUp, History, Loader2,
  OctagonAlert, RefreshCw, Shield, TrafficCone, Upload, Users, XCircle,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { EmptyStatePanel } from '@shared/components/ui/TableEmptyState';
import { useLanguage } from '@shared/context/LanguageContext';
import { importsAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type {
  ImportDataType, ImportJobSummary, ImportRowReport, ImportValidateCounts, ImportValidateResult,
} from '@shared/types';

const IMPORT_TYPES: Array<{
  type: ImportDataType;
  labelKey: string;
  icon: typeof Users;
  variant: 'violet' | 'teal' | 'amber' | 'blue' | 'rose';
}> = [
  { type: 'users', labelKey: 'importData.typeUsers', icon: Users, variant: 'violet' },
  { type: 'vehicles', labelKey: 'importData.typeVehicles', icon: Car, variant: 'teal' },
  { type: 'signs', labelKey: 'importData.typeSigns', icon: TrafficCone, variant: 'amber' },
  { type: 'cameras', labelKey: 'importData.typeCameras', icon: Camera, variant: 'blue' },
  { type: 'violations', labelKey: 'importData.typeViolations', icon: Shield, variant: 'rose' },
];

const PREVIEW_KEYS: Record<ImportDataType, string[]> = {
  users: ['name', 'email', 'role', 'phone'],
  vehicles: ['plate_number', 'vehicle_type', 'owner_email', 'model'],
  signs: ['code', 'name', 'category'],
  cameras: ['camera_id', 'location', 'road_name', 'status'],
  violations: ['plate_number', 'observed_action', 'violation_type', 'fine_amount'],
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function statusMeta(status: string): { bg: string; color: string } {
  switch (status) {
    case 'ok':
    case 'success':
    case 'committed':
    case 'validated':
      return { bg: 'rgba(16,185,129,0.12)', color: '#059669' };
    case 'skip':
      return { bg: 'rgba(245,158,11,0.12)', color: '#D97706' };
    case 'error':
    case 'failed':
      return { bg: 'rgba(239,68,68,0.12)', color: '#DC2626' };
    default:
      return { bg: 'rgba(100,116,139,0.12)', color: '#64748B' };
  }
}

function formatRowSummary(type: ImportDataType, data: Record<string, unknown>): string {
  const keys = PREVIEW_KEYS[type] || Object.keys(data).slice(0, 4);
  const parts = keys
    .map((key) => {
      const value = data[key];
      if (value === undefined || value === null || value === '') return null;
      return String(value);
    })
    .filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
}

export function ImportDataPage() {
  const { t, locale } = useLanguage();
  const [importType, setImportType] = useState<ImportDataType>('users');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<'template' | 'validate' | 'commit' | null>(null);
  const [preview, setPreview] = useState<ImportValidateResult | null>(null);
  const [history, setHistory] = useState<ImportJobSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setHistory(await importsAPI.history());
    } catch {
      toast.error(t('importData.historyFailed'));
    } finally {
      setHistoryLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    setFile(null);
    setPreview(null);
  }, [importType]);

  const counts: ImportValidateCounts | null = preview?.counts ?? null;
  const canImport = Boolean(preview?.job_id && (counts?.valid ?? 0) > 0 && busy !== 'commit');

  const previewRows: ImportRowReport[] = useMemo(
    () => (preview?.rows || []).slice(0, 200),
    [preview],
  );

  const historyStats = useMemo(() => {
    const committed = history.filter((j) => j.status === 'committed');
    return {
      jobs: history.length,
      success: committed.reduce((sum, j) => sum + (j.success_count || 0), 0),
      latest: history[0] ? history[0].file_name : '—',
    };
  }, [history]);

  const handleDownloadTemplate = async (format: 'csv' | 'xlsx') => {
    setBusy('template');
    try {
      const blob = await importsAPI.downloadTemplate(importType, format);
      downloadBlob(blob, `camtraffic-import-${importType}.${format}`);
      toast.success(t('importData.templateDownloaded'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('importData.templateFailed'));
    } finally {
      setBusy(null);
    }
  };

  const handleValidate = async () => {
    if (!file) {
      toast.error(t('importData.chooseFileFirst'));
      return;
    }
    setBusy('validate');
    try {
      const result = await importsAPI.validate(importType, file);
      setPreview(result);
      toast.success(t('importData.validated'));
    } catch (err: unknown) {
      setPreview(null);
      toast.error(err instanceof Error ? err.message : t('importData.validateFailed'));
    } finally {
      setBusy(null);
    }
  };

  const handleCommit = async () => {
    if (!preview?.job_id) return;
    setBusy('commit');
    try {
      const result = await importsAPI.commit(preview.job_id);
      toast.success(
        t('importData.importDone', {
          success: String(result.counts.success),
          skipped: String(result.counts.skipped),
          failed: String(result.counts.failed),
        }),
      );
      setPreview(null);
      setFile(null);
      await loadHistory();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('importData.importFailed'));
    } finally {
      setBusy(null);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setPreview(null);
  };

  const formatWhen = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(locale === 'km' ? 'km-KH' : undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const statusLabel = (status: string) => {
    const key = `importData.status.${status}`;
    const translated = t(key);
    return translated !== key ? translated : status;
  };

  return (
    <div className="enforcement-page enforcement-page--import">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <Database size={14} aria-hidden />
              {t('importData.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('importData.title')}</h1>
            <p className="enforcement-page__subtitle">{t('importData.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="enforcement-page__hero-btn enforcement-page__hero-btn--violet"
              onClick={() => void loadHistory()}
              disabled={historyLoading}
            >
              <RefreshCw size={16} className={historyLoading ? 'animate-spin' : undefined} aria-hidden />
              {t('importData.refreshHistory')}
            </button>
          </div>
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--three mb-6">
        <div className="enforcement-page__stat-card enforcement-page__stat-card--violet">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--violet">
            <History size={18} aria-hidden />
          </div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{historyStats.jobs}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--violet">
              {t('importData.statJobs')}
            </p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--teal">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--teal">
            <CheckCircle2 size={18} aria-hidden />
          </div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{historyStats.success}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--teal">
              {t('importData.statRowsImported')}
            </p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--blue">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--blue">
            <FileUp size={18} aria-hidden />
          </div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value text-base sm:text-lg truncate" title={historyStats.latest}>
              {historyStats.latest}
            </p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--blue">
              {t('importData.statLatestFile')}
            </p>
          </div>
        </div>
      </div>

      <section className="enforcement-page__panel import-page__panel mb-6">
        <div className="import-page__panel-head">
          <div>
            <h2 className="import-page__panel-title">{t('importData.stepChooseType')}</h2>
            <p className="import-page__panel-hint">{t('importData.stepChooseTypeHint')}</p>
          </div>
        </div>
        <div className="import-page__type-grid" role="tablist" aria-label={t('importData.stepChooseType')}>
          {IMPORT_TYPES.map((item) => {
            const Icon = item.icon;
            const active = importType === item.type;
            return (
              <button
                key={item.type}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setImportType(item.type)}
                className={`import-page__type-card import-page__type-card--${item.variant}${active ? ' is-active' : ''}`}
              >
                <span className={`import-page__type-icon import-page__type-icon--${item.variant}`}>
                  <Icon size={18} aria-hidden />
                </span>
                <span className="import-page__type-copy">
                  <span className="import-page__type-label">{t(item.labelKey)}</span>
                  <span className="import-page__type-key">{item.type}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="enforcement-page__panel import-page__panel mb-6">
        <div className="import-page__panel-head">
          <div>
            <h2 className="import-page__panel-title">{t('importData.stepUpload')}</h2>
            <p className="import-page__panel-hint">{t('importData.stepUploadHint')}</p>
          </div>
          <div className="import-page__steps" aria-hidden>
            <span className={`import-page__step${file ? ' is-done' : ' is-current'}`}>1</span>
            <span className="import-page__step-line" />
            <span className={`import-page__step${preview ? ' is-done' : file ? ' is-current' : ''}`}>2</span>
            <span className="import-page__step-line" />
            <span className={`import-page__step${canImport ? ' is-current' : ''}`}>3</span>
          </div>
        </div>

        <div className="import-page__actions">
          <button
            type="button"
            className="enforcement-page__btn-outline"
            disabled={busy === 'template'}
            onClick={() => void handleDownloadTemplate('csv')}
          >
            {busy === 'template' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {t('importData.downloadCsv')}
          </button>
          <button
            type="button"
            className="enforcement-page__btn-outline"
            disabled={busy === 'template'}
            onClick={() => void handleDownloadTemplate('xlsx')}
          >
            <FileSpreadsheet size={15} />
            {t('importData.downloadXlsx')}
          </button>
        </div>

        <div className="import-page__upload-row">
          <label className="import-page__file-drop">
            <FileUp size={20} aria-hidden />
            <span className="import-page__file-drop-copy">
              <strong>{file ? file.name : t('importData.chooseFile')}</strong>
              <span>{t('importData.fileHint')}</span>
            </span>
            <input
              type="file"
              accept=".csv,.xlsx,.xlsm,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(e) => {
                const next = e.target.files?.[0] || null;
                setFile(next);
                setPreview(null);
              }}
            />
          </label>

          <div className="import-page__action-btns">
            <button
              type="button"
              className="enforcement-page__btn-violet"
              disabled={!file || busy === 'validate'}
              onClick={() => void handleValidate()}
            >
              {busy === 'validate' ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {t('importData.validate')}
            </button>
            <button
              type="button"
              className="enforcement-page__btn-success"
              disabled={!canImport}
              onClick={() => void handleCommit()}
            >
              {busy === 'commit' ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              {t('importData.import')}
            </button>
            <button type="button" className="enforcement-page__btn-outline" onClick={handleCancel}>
              {t('importData.cancel')}
            </button>
          </div>
        </div>

        {counts ? (
          <div className="import-page__count-grid">
            <div className="import-page__count-card">
              <span>{t('importData.statTotal')}</span>
              <strong>{counts.total}</strong>
            </div>
            <div className="import-page__count-card import-page__count-card--ok">
              <span>{t('importData.statValid')}</span>
              <strong>{counts.valid}</strong>
            </div>
            <div className="import-page__count-card import-page__count-card--skip">
              <span>{t('importData.statSkipped')}</span>
              <strong>{counts.skipped}</strong>
            </div>
            <div className="import-page__count-card import-page__count-card--err">
              <span>{t('importData.statErrors')}</span>
              <strong>{counts.error}</strong>
            </div>
          </div>
        ) : null}
      </section>

      <section className="enforcement-page__panel import-page__panel mb-6">
        <div className="import-page__panel-head">
          <div>
            <h2 className="import-page__panel-title">{t('importData.stepPreview')}</h2>
            <p className="import-page__panel-hint">{t('importData.stepPreviewHint')}</p>
          </div>
        </div>

        {preview ? (
          <div className="import-page__table-wrap">
            <Table className="enforcement-page__table import-page__preview-table">
              <TableHeader>
                <TableRow className="enforcement-page__table-head">
                  <TableHead className="enforcement-page__th">{t('importData.colRow')}</TableHead>
                  <TableHead className="enforcement-page__th">{t('importData.colStatus')}</TableHead>
                  <TableHead className="enforcement-page__th">{t('importData.colData')}</TableHead>
                  <TableHead className="enforcement-page__th">{t('importData.colErrors')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row) => {
                  const meta = statusMeta(row.status);
                  return (
                    <TableRow key={`${row.row}-${row.status}`} className="enforcement-page__table-row">
                      <TableCell className="enforcement-page__cell-mono">{row.row}</TableCell>
                      <TableCell>
                        <span
                          className="import-page__badge"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          {row.status === 'ok' || row.status === 'success' ? <CheckCircle2 size={12} /> : null}
                          {row.status === 'error' || row.status === 'failed' ? <XCircle size={12} /> : null}
                          {row.status === 'skip' ? <OctagonAlert size={12} /> : null}
                          {statusLabel(row.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="enforcement-page__cell-primary import-page__row-summary" title={formatRowSummary(importType, row.data || {})}>
                          {formatRowSummary(importType, row.data || {})}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={row.errors?.length ? 'import-page__error-text' : 'enforcement-page__cell-secondary'}>
                          {(row.errors || []).join('; ') || '—'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyStatePanel
            tone="violet"
            icon={<Upload size={28} />}
            title={t('importData.emptyPreview')}
            subtitle={t('importData.emptyPreviewHint')}
          />
        )}
      </section>

      <section className="enforcement-page__panel import-page__panel">
        <div className="import-page__panel-head">
          <div>
            <h2 className="import-page__panel-title">{t('importData.historyTitle')}</h2>
            <p className="import-page__panel-hint">{t('importData.historyHint')}</p>
          </div>
        </div>

        {historyLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label={t('common.loading')}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="enforcement-page__skeleton h-14 rounded-xl" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <EmptyStatePanel
            tone="violet"
            icon={<History size={28} />}
            title={t('importData.historyEmpty')}
            subtitle={t('importData.historyEmptyHint')}
          />
        ) : (
          <div className="import-page__table-wrap">
            <Table className="enforcement-page__table">
              <TableHeader>
                <TableRow className="enforcement-page__table-head">
                  <TableHead className="enforcement-page__th">{t('importData.colWhen')}</TableHead>
                  <TableHead className="enforcement-page__th">{t('importData.colType')}</TableHead>
                  <TableHead className="enforcement-page__th">{t('importData.colFile')}</TableHead>
                  <TableHead className="enforcement-page__th">{t('importData.colStatus')}</TableHead>
                  <TableHead className="enforcement-page__th">{t('importData.colResult')}</TableHead>
                  <TableHead className="enforcement-page__th">{t('importData.colBy')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((job) => {
                  const meta = statusMeta(job.status);
                  return (
                    <TableRow key={job.id} className="enforcement-page__table-row">
                      <TableCell className="enforcement-page__cell-secondary whitespace-nowrap">
                        {formatWhen(job.created_at)}
                      </TableCell>
                      <TableCell>
                        <span className="enforcement-page__code-pill">{job.import_type}</span>
                      </TableCell>
                      <TableCell>
                        <span className="enforcement-page__cell-primary import-page__file-name">{job.file_name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="import-page__badge" style={{ background: meta.bg, color: meta.color }}>
                          {statusLabel(job.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="import-page__result-pills">
                          <span className="import-page__result-pill import-page__result-pill--ok">
                            ✓ {job.success_count}
                          </span>
                          <span className="import-page__result-pill import-page__result-pill--skip">
                            ↷ {job.skipped_count}
                          </span>
                          <span className="import-page__result-pill import-page__result-pill--err">
                            ✗ {job.failed_count}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="enforcement-page__cell-secondary">
                        {job.created_by_name || job.created_by_email || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
