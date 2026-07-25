import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  CheckCircle2, Download, FileSpreadsheet, FileText, Loader2, Printer, RefreshCw,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { dashboardAPI, notificationsAPI } from '@shared/services/api';
import { EMPTY_DASHBOARD_STATS } from '@shared/constants/emptyDashboard';
import type { DashboardStats } from '@shared/types';
import { toast } from 'sonner';

type LiveExport = {
  id: string;
  name: string;
  format: 'PDF' | 'Excel';
  category: string;
  status: 'ready';
  description: string;
};

const LIVE_EXPORTS: LiveExport[] = [
  {
    id: 'enforcement-pdf',
    name: 'Enforcement summary (PDF)',
    format: 'PDF',
    category: 'Enforcement',
    status: 'ready',
    description: 'Live PDF from dashboard / fines / violations.',
  },
  {
    id: 'enforcement-xlsx',
    name: 'Enforcement workbook (Excel)',
    format: 'Excel',
    category: 'Enforcement',
    status: 'ready',
    description: 'Live Excel export for the current month.',
  },
];

type ScheduleRow = {
  id: string;
  name: string;
  report_type?: string;
  frequency?: string;
  enabled?: boolean;
  last_status?: string;
  run_at?: string | null;
};

export function ReportCenterPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>(() => ({ ...EMPTY_DASHBOARD_STATS }));
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const request = user.role === 'admin'
        ? dashboardAPI.getAdminStats()
        : dashboardAPI.getPoliceReportStats();
      const [s, sched] = await Promise.all([
        request,
        user.role === 'admin'
          ? notificationsAPI.listReportSchedules().catch(() => [])
          : Promise.resolve([]),
      ]);
      setStats(s);
      setSchedules(sched as ScheduleRow[]);
    } catch {
      setStats({ ...EMPTY_DASHBOARD_STATS });
      setSchedules([]);
      toast.error(t('dashboard.loadErrorTitle'));
    } finally {
      setLoading(false);
    }
  }, [t, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = useMemo(() => ([
    { label: t('reports.kpiViolations'), value: (stats.total_violations ?? stats.total_fines ?? 0).toLocaleString() },
    { label: t('reports.kpiAiDetection'), value: (stats.total_detections ?? 0).toLocaleString() },
    { label: t('reports.kpiReady'), value: String(LIVE_EXPORTS.length) },
    { label: 'Scheduled', value: String(schedules.filter((r) => r.enabled !== false).length) },
  ]), [schedules, stats, t]);

  const handleDownload = async (row: LiveExport) => {
    if (!user || downloading) return;
    setDownloading(row.id);
    try {
      const scope = user.role === 'admin' ? 'admin' : 'police';
      const now = new Date();
      let blob: Blob;
      let filename: string;
      if (row.format === 'Excel') {
        blob = await dashboardAPI.downloadEnforcementExcel(now.getFullYear(), now.getMonth() + 1);
        filename = `camtraffic-enforcement-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.xlsx`;
      } else {
        blob = await dashboardAPI.downloadReportPdf(scope);
        filename = `camtraffic-report-${row.id}.pdf`;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('reports.centerDownloadReady', { name: row.name, format: row.format }));
    } catch {
      toast.error(t('reports.centerDownloadFailed'));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="enforcement-page enforcement-page--reports dashboard-page--reports reports-page--enterprise report-center-page">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-inner reports-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><FileText size={14} /></span>
              Live REST exports
            </div>
            <h1 className="enforcement-page__title">{t('pages.reports.centerTitle')}</h1>
            <p className="enforcement-page__subtitle">
              Downloads hit live dashboard PDF/Excel. No catalog or sample report rows.
            </p>
          </div>
          <div className="reports-page__hero-actions">
            <button type="button" className="enforcement-page__hero-btn enforcement-page__hero-btn--outline" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Refresh
            </button>
            <button type="button" className="enforcement-page__hero-btn enforcement-page__hero-btn--teal" onClick={() => navigate('/admin/reports')}>
              {t('reports.actionGenerate')}
            </button>
            <button type="button" className="enforcement-page__hero-btn enforcement-page__hero-btn--outline" onClick={() => window.print()}>
              <Printer size={15} />
              {t('reports.actionPrint')}
            </button>
          </div>
        </div>
      </div>

      <section className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
        {kpis.map((k) => (
          <article key={k.label} className="enforcement-page__stat-card">
            <div className="enforcement-page__stat-copy">
              <p className="enforcement-page__stat-value">{loading ? '…' : k.value}</p>
              <p className="enforcement-page__stat-label">{k.label}</p>
            </div>
          </article>
        ))}
      </section>

      <div className="enforcement-page__panel p-4 mt-4">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Download size={16} /> Live exports
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {LIVE_EXPORTS.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground">{row.description}</p>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-sm">
                    {row.format === 'Excel' ? <FileSpreadsheet size={14} /> : <FileText size={14} />}
                    {row.format}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-emerald-700 text-sm">
                    <CheckCircle2 size={14} /> ready
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <button
                    type="button"
                    className="enforcement-page__hero-btn enforcement-page__hero-btn--outline"
                    disabled={downloading === row.id}
                    onClick={() => void handleDownload(row)}
                  >
                    {downloading === row.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    Download
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="enforcement-page__panel p-4 mt-4">
        <h2 className="text-sm font-semibold mb-3">Scheduled reports (database)</h2>
        {schedules.length === 0 ? (
          <TableEmptyState
            title="0 scheduled reports"
            subtitle="Create schedules under Reports → Scheduled Reports."
          />
        ) : (
          <ul className="space-y-2 text-sm">
            {schedules.map((s) => (
              <li key={s.id} className="flex justify-between border-b py-2">
                <span>
                  <strong>{s.name}</strong>
                  {' · '}
                  {s.report_type || 'report'}
                  {' · '}
                  {s.frequency || 'once'}
                </span>
                <span className="opacity-70">{s.enabled === false ? 'disabled' : (s.last_status || 'enabled')}</span>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="mt-3 text-sm underline"
          onClick={() => navigate('/admin/reports/scheduled')}
        >
          Manage schedules
        </button>
      </div>
    </div>
  );
}
