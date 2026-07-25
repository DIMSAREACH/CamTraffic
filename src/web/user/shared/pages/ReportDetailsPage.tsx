import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  ArrowLeft, CheckCircle2, Download, FileSpreadsheet, FileText, Printer, Loader2,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatRevenue } from '@shared/i18n/localeFormat';
import { dashboardAPI } from '@shared/services/api';
import { getCatalogReport } from '@shared/constants/reportCatalog';
import { USER_PORTAL_ROUTES } from '@shared/constants/userPortalPaths';
import { toast } from 'sonner';

export function ReportDetailsPage() {
  const { reportId = '' } = useParams();
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const report = useMemo(() => getCatalogReport(reportId), [reportId]);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  if (!report) {
    return (
      <div className="enforcement-page enforcement-page--reports dashboard-page--reports reports-page--enterprise">
        <div className="enforcement-page__panel reports-page__panel p-8 text-center space-y-4">
          <p>{t('reports.detailsNotFound')}</p>
          <Button type="button" onClick={() => navigate(USER_PORTAL_ROUTES.reportsCenter)}>
            {t('reports.backToCenter')}
          </Button>
        </div>
      </div>
    );
  }

  const handleExportPdf = async () => {
    if (!user || exportingPdf) return;
    setExportingPdf(true);
    try {
      const scope = user.role === 'admin' ? 'admin' : 'police';
      const blob = await dashboardAPI.downloadReportPdf(scope);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.id}.pdf`;
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
      link.download = `${report.id}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t('reports.exportExcelSuccess'));
    } catch {
      toast.error(t('reports.exportExcelFail'));
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <div className="enforcement-page enforcement-page--reports dashboard-page--reports reports-page--enterprise">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-inner reports-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><FileText size={14} /></span>
              {t('pages.reports.detailsEyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('pages.reports.detailsTitle')}</h1>
            <p className="enforcement-page__subtitle">{report.name}</p>
          </div>
          <Link to={USER_PORTAL_ROUTES.reportsCenter} className="reports-page__back-link">
            <ArrowLeft size={14} />
            {t('reports.backToCenter')}
          </Link>
        </div>
      </div>

      <div className="reports-page__details-grid">
        <section className="enforcement-page__panel reports-page__panel reports-page__details-card">
          <h2 className="reports-page__details-card-title">{t('reports.detailsInfoTitle')}</h2>
          <dl className="reports-page__details-dl">
            <div>
              <dt>{t('reports.detailsReportName')}</dt>
              <dd>{report.name}</dd>
            </div>
            <div>
              <dt>{t('reports.detailsGeneratedBy')}</dt>
              <dd>{report.createdBy}</dd>
            </div>
            <div>
              <dt>{t('reports.detailsGeneratedDate')}</dt>
              <dd>{report.generatedAt}</dd>
            </div>
            <div>
              <dt>{t('reports.detailsPeriod')}</dt>
              <dd>{report.period}</dd>
            </div>
          </dl>
        </section>

        <section className="enforcement-page__panel reports-page__panel reports-page__details-card">
          <h2 className="reports-page__details-card-title">{t('reports.detailsSummaryTitle')}</h2>
          <div className="reports-page__details-kpis">
            <div>
              <p className="reports-page__details-kpi-value">{report.summary.violations.toLocaleString()}</p>
              <p className="reports-page__details-kpi-label">{t('reports.kpiViolations')}</p>
            </div>
            <div>
              <p className="reports-page__details-kpi-value">{report.summary.detections.toLocaleString()}</p>
              <p className="reports-page__details-kpi-label">{t('reports.kpiAiDetection')}</p>
            </div>
            <div>
              <p className="reports-page__details-kpi-value">
                {report.summary.revenue > 0 ? formatRevenue(locale, report.summary.revenue) : '—'}
              </p>
              <p className="reports-page__details-kpi-label">{t('reports.kpiRevenue')}</p>
            </div>
            <div>
              <p className="reports-page__details-kpi-value">
                {report.summary.accuracy > 0 ? `${report.summary.accuracy.toFixed(2)}%` : '—'}
              </p>
              <p className="reports-page__details-kpi-label">{t('reports.kpiAccuracy')}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="enforcement-page__panel reports-page__panel reports-page__details-card">
        <h2 className="reports-page__details-card-title">{t('reports.detailsChartsTitle')}</h2>
        <ul className="reports-page__attached-charts">
          {report.charts.map((chart) => (
            <li key={chart}>
              <CheckCircle2 size={16} />
              {chart}
            </li>
          ))}
        </ul>
      </section>

      <div className="reports-page__details-actions">
        <Button type="button" onClick={() => void handleExportPdf()} disabled={exportingPdf}>
          {exportingPdf ? <Loader2 size={15} className="reports-page__io-spinner" /> : <FileText size={15} />}
          {t('pages.reports.exportPdf')}
        </Button>
        <Button type="button" variant="outline" onClick={() => void handleExportExcel()} disabled={exportingExcel}>
          {exportingExcel ? <Loader2 size={15} className="reports-page__io-spinner" /> : <FileSpreadsheet size={15} />}
          {t('pages.reports.exportExcel')}
        </Button>
        <Button type="button" variant="outline" onClick={() => window.print()}>
          <Printer size={15} />
          {t('reports.actionPrint')}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate(USER_PORTAL_ROUTES.reportsScheduled)}>
          <Download size={15} />
          {t('reports.actionSchedule')}
        </Button>
      </div>
    </div>
  );
}
