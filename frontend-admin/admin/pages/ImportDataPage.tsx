import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Camera, Car, CheckCircle2, Download, FileSpreadsheet, FileUp, History, Loader2,
  OctagonAlert, Shield, TrafficCone, Upload, Users, XCircle,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
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
  accent: string;
}> = [
  { type: 'users', labelKey: 'importData.typeUsers', icon: Users, accent: 'violet' },
  { type: 'vehicles', labelKey: 'importData.typeVehicles', icon: Car, accent: 'teal' },
  { type: 'signs', labelKey: 'importData.typeSigns', icon: TrafficCone, accent: 'amber' },
  { type: 'cameras', labelKey: 'importData.typeCameras', icon: Camera, accent: 'blue' },
  { type: 'violations', labelKey: 'importData.typeViolations', icon: Shield, accent: 'rose' },
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function statusMeta(status: string): { bg: string; color: string; label: string } {
  switch (status) {
    case 'ok':
    case 'success':
      return { bg: 'rgba(16,185,129,0.12)', color: '#059669', label: status };
    case 'skip':
      return { bg: 'rgba(245,158,11,0.12)', color: '#D97706', label: status };
    case 'error':
    case 'failed':
      return { bg: 'rgba(239,68,68,0.12)', color: '#DC2626', label: status };
    default:
      return { bg: 'rgba(100,116,139,0.12)', color: '#64748B', label: status };
  }
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

  return (
    <div className="enforcement-page enforcement-page--users space-y-5">
      <div className="enforcement-page__header">
        <div>
          <p className="enforcement-page__eyebrow">{t('importData.eyebrow')}</p>
          <h1 className="enforcement-page__title">{t('importData.title')}</h1>
          <p className="enforcement-page__subtitle">{t('importData.subtitle')}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {IMPORT_TYPES.map((item) => {
          const Icon = item.icon;
          const active = importType === item.type;
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => setImportType(item.type)}
              className={`enforcement-page__stat-card enforcement-page__stat-card--${item.accent}${active ? ' enforcement-page__stat-card--active' : ''}`}
            >
              <div className="enforcement-page__stat-icon">
                <Icon size={18} />
              </div>
              <div>
                <p className="enforcement-page__stat-label">{t(item.labelKey)}</p>
                <p className="enforcement-page__stat-value" style={{ fontSize: '0.95rem' }}>
                  {item.type}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="enforcement-page__panel enforcement-page__panel--users p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={busy === 'template'}
            onClick={() => void handleDownloadTemplate('csv')}
          >
            {busy === 'template' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {t('importData.downloadCsv')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={busy === 'template'}
            onClick={() => void handleDownloadTemplate('xlsx')}
          >
            <FileSpreadsheet size={15} />
            {t('importData.downloadXlsx')}
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-violet-300 bg-violet-50/50 px-4 py-3 text-sm font-medium text-violet-800 hover:bg-violet-50">
            <FileUp size={16} />
            <span>{file ? file.name : t('importData.chooseFile')}</span>
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
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="gap-2" disabled={!file || busy === 'validate'} onClick={() => void handleValidate()}>
              {busy === 'validate' ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {t('importData.validate')}
            </Button>
            <Button type="button" className="gap-2" disabled={!canImport} onClick={() => void handleCommit()}>
              {busy === 'commit' ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              {t('importData.import')}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel}>{t('importData.cancel')}</Button>
          </div>
        </div>

        {counts ? (
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <span className="text-slate-500">{t('importData.statTotal')}</span>
              <strong className="ml-2">{counts.total}</strong>
            </div>
            <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm">
              <span className="text-emerald-700">{t('importData.statValid')}</span>
              <strong className="ml-2 text-emerald-800">{counts.valid}</strong>
            </div>
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm">
              <span className="text-amber-700">{t('importData.statSkipped')}</span>
              <strong className="ml-2 text-amber-800">{counts.skipped}</strong>
            </div>
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm">
              <span className="text-rose-700">{t('importData.statErrors')}</span>
              <strong className="ml-2 text-rose-800">{counts.error}</strong>
            </div>
          </div>
        ) : null}

        {preview ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="enforcement-page__table-head">
                  <TableHead>{t('importData.colRow')}</TableHead>
                  <TableHead>{t('importData.colStatus')}</TableHead>
                  <TableHead>{t('importData.colData')}</TableHead>
                  <TableHead>{t('importData.colErrors')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row) => {
                  const meta = statusMeta(row.status);
                  return (
                    <TableRow key={`${row.row}-${row.status}`}>
                      <TableCell>{row.row}</TableCell>
                      <TableCell>
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          {row.status === 'ok' || row.status === 'success' ? <CheckCircle2 size={12} /> : null}
                          {row.status === 'error' || row.status === 'failed' ? <XCircle size={12} /> : null}
                          {row.status === 'skip' ? <OctagonAlert size={12} /> : null}
                          {t(`importData.status.${row.status}`) !== `importData.status.${row.status}`
                            ? t(`importData.status.${row.status}`)
                            : row.status}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-slate-600">
                        {JSON.stringify(row.data)}
                      </TableCell>
                      <TableCell className="text-xs text-rose-600">
                        {(row.errors || []).join('; ') || '—'}
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
      </div>

      <div className="enforcement-page__panel enforcement-page__panel--users p-5 space-y-3">
        <div className="flex items-center gap-2">
          <History size={18} className="text-violet-600" />
          <h2 className="text-base font-semibold">{t('importData.historyTitle')}</h2>
        </div>
        {historyLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" /> {t('common.loading')}
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-slate-500">{t('importData.historyEmpty')}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="enforcement-page__table-head">
                  <TableHead>{t('importData.colWhen')}</TableHead>
                  <TableHead>{t('importData.colType')}</TableHead>
                  <TableHead>{t('importData.colFile')}</TableHead>
                  <TableHead>{t('importData.colStatus')}</TableHead>
                  <TableHead>{t('importData.colResult')}</TableHead>
                  <TableHead>{t('importData.colBy')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="whitespace-nowrap text-sm">{formatWhen(job.created_at)}</TableCell>
                    <TableCell>{job.import_type}</TableCell>
                    <TableCell className="max-w-[12rem] truncate">{job.file_name}</TableCell>
                    <TableCell>{job.status}</TableCell>
                    <TableCell className="text-sm">
                      ✓{job.success_count} · ↷{job.skipped_count} · ✗{job.failed_count}
                    </TableCell>
                    <TableCell className="text-sm">{job.created_by_name || job.created_by_email || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
