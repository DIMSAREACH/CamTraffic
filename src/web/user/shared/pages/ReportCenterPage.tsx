import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  CheckCircle2, Download, FileSpreadsheet, FileText, Loader2, Printer, RefreshCw,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@shared/components/ui/table';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { dashboardAPI } from '@shared/services/api';
import { EMPTY_DASHBOARD_STATS } from '@shared/constants/emptyDashboard';
import type { DashboardStats } from '@shared/types';
import { toast } from 'sonner';

type LiveExport = {
  id: string;
  name: string;
  format: 'PDF' | 'Excel';
  description: string;
};

const LIVE_EXPORTS: LiveExport[] = [
  {
    id: 'enforcement-pdf',
    name: 'Enforcement summary (PDF)',
    format: 'PDF',
    description: 'Live PDF from dashboard / fines / violations.',
  },
  {
    id: 'enforcement-xlsx',
    name: 'Enforcement workbook (Excel)',
    format: 'Excel',
    description: 'Live Excel export for the current month.',
  },
];

/** Officer-safe report center — live exports only (no catalog rows). */
export function ReportCenterPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>(() => ({ ...EMPTY_DASHBOARD_STATS }));
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const s = user.role === 'admin'
        ? await dashboardAPI.getAdminStats()
        : await dashboardAPI.getPoliceReportStats();
      setStats(s);
    } catch {
      setStats({ ...EMPTY_DASHBOARD_STATS });
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
  ]), [stats, t]);

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
            <div className="enforcement-page__eyebrow">Live REST exports</div>
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
            <button type="button" className="enforcement-page__hero-btn enforcement-page__hero-btn--teal" onClick={() => navigate('../reports')}>
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
    </div>
  );
}
