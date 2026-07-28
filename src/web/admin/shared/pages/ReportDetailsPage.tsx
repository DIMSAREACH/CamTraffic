import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Download, FileSpreadsheet, FileText, Loader2, Printer } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatRevenue } from '@shared/i18n/localeFormat';
import { dashboardAPI } from '@shared/services/api';
import { EMPTY_DASHBOARD_STATS } from '@shared/constants/emptyDashboard';
import type { DashboardStats } from '@shared/types';
import { toast } from 'sonner';

const REPORT_META: Record<string, { title: string; format: 'PDF' | 'Excel' }> = {
  'enforcement-pdf': { title: 'Enforcement summary (PDF)', format: 'PDF' },
  'enforcement-xlsx': { title: 'Enforcement workbook (Excel)', format: 'Excel' },
};

export function ReportDetailsPage() {
  const { reportId = '' } = useParams();
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const meta = REPORT_META[reportId] ?? {
    title: reportId || 'Live enforcement report',
    format: 'PDF' as const,
  };
  const [stats, setStats] = useState<DashboardStats>(() => ({ ...EMPTY_DASHBOARD_STATS }));
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

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

  const handleExportPdf = async () => {
    if (!user || exportingPdf) return;
    setExportingPdf(true);
    try {
      const scope = user.role === 'admin' ? 'admin' : 'police';
      const blob = await dashboardAPI.downloadReportPdf(scope);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportId || 'camtraffic-report'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t('reports.exportSuccess'));
    } catch {
      toast.error(t('reports.exportFail'));
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    if (!user || exportingExcel) return;
    setExportingExcel(true);
    try {
      const now = new Date();
      const blob = await dashboardAPI.downloadEnforcementExcel(now.getFullYear(), now.getMonth() + 1);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportId || 'camtraffic-enforcement'}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t('reports.exportExcelSuccess'));
    } catch {
      toast.error(t('reports.exportExcelFail'));
    } finally {
      setExportingExcel(false);
    }
  };

  const cards = [
    { label: t('reports.kpiViolations'), value: (stats.total_violations ?? stats.total_fines ?? 0).toLocaleString() },
    { label: t('reports.kpiAiDetection'), value: (stats.total_detections ?? 0).toLocaleString() },
    { label: t('reports.kpiRevenue'), value: formatRevenue(locale, stats.fine_revenue ?? 0) },
    { label: t('reports.kpiAccuracy'), value: `${Number(stats.detection_accuracy || 0).toFixed(2)}%` },
  ];

  return (
    <div className="enforcement-page enforcement-page--reports dashboard-page--reports reports-page--enterprise">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-inner reports-page__hero-inner">
          <div>
            <button type="button" className="notif-center__back-link mb-2" onClick={() => navigate('/admin/reports/center')}>
              <ArrowLeft size={14} />
              {t('reports.backToCenter')}
            </button>
            <h1 className="enforcement-page__title">{meta.title}</h1>
            <p className="enforcement-page__subtitle">
              Live dashboard KPIs from PostgreSQL — not catalog sample figures.
            </p>
          </div>
          <div className="reports-page__hero-actions">
            <Button type="button" variant="outline" onClick={() => void handleExportPdf()} disabled={exportingPdf}>
              {exportingPdf ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
              PDF
            </Button>
            <Button type="button" variant="outline" onClick={() => void handleExportExcel()} disabled={exportingExcel}>
              {exportingExcel ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />}
              Excel
            </Button>
            <Button type="button" variant="outline" onClick={() => window.print()}>
              <Printer size={15} />
              Print
            </Button>
          </div>
        </div>
      </div>

      <section className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
        {cards.map((c) => (
          <article key={c.label} className="enforcement-page__stat-card">
            <div className="enforcement-page__stat-copy">
              <p className="enforcement-page__stat-value">{loading ? '…' : c.value}</p>
              <p className="enforcement-page__stat-label">{c.label}</p>
            </div>
          </article>
        ))}
      </section>

      <div className="enforcement-page__panel p-6 mt-4 space-y-2 text-sm">
        <p><strong>Paid fines:</strong> {(stats.paid_fines ?? 0).toLocaleString()}</p>
        <p><strong>Pending fines:</strong> {(stats.pending_fines ?? 0).toLocaleString()}</p>
        <p><strong>Vehicles:</strong> {(stats.total_vehicles ?? 0).toLocaleString()}</p>
        <p><strong>Drivers:</strong> {(stats.total_drivers ?? 0).toLocaleString()}</p>
        <p className="text-muted-foreground pt-2">
          Use Download to pull the current live PDF/Excel. Detail charts live under Reports → Analytics.
        </p>
        <Button type="button" variant="outline" onClick={() => navigate('/admin/reports/analytics')}>
          <Download size={15} />
          Open analytics
        </Button>
      </div>
    </div>
  );
}
