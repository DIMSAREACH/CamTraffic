import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  BarChart3, Download, TrendingUp, FileText, Camera, PieChart as PieChartIcon,
  AlertCircle, RefreshCw, Loader2, FileSpreadsheet, CalendarClock, Printer, Sparkles,
  ShieldAlert, Crosshair,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatRevenue } from '@shared/i18n/localeFormat';
import { useLiveData } from '@shared/hooks/useLiveData';
import { camerasAPI, dashboardAPI, officersAPI } from '@shared/services/api';
import { EMPTY_DASHBOARD_STATS } from '@shared/constants/emptyDashboard';
import { USER_PORTAL_ROUTES } from '@shared/constants/userPortalPaths';
import {
  CAMBODIA_PROVINCES,
  VEHICLE_TYPE_DISTRIBUTION,
} from '@shared/constants/reportCatalog';
import { toast } from 'sonner';
import type { DashboardStats } from '@shared/types';
import {
  CHART,
  CHART_SERIES,
  RAINBOW_GRADIENT_STOPS,
  chartSeriesColor,
  chartTooltipStyle,
  chartAxisTick,
} from '@shared/constants/chartPalette';
import { ReportChartPanel } from '@shared/components/admin/reports/ReportChartPanel';
import {
  DEFAULT_REPORT_FILTERS,
  ReportFiltersBar,
  type ReportFilterState,
} from '@shared/components/admin/reports/ReportFiltersBar';

function RainbowStrokeGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
      {RAINBOW_GRADIENT_STOPS.map((stop) => (
        <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
      ))}
    </linearGradient>
  );
}

function RainbowFillGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      {RAINBOW_GRADIENT_STOPS.map((stop) => (
        <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} stopOpacity={0.28} />
      ))}
    </linearGradient>
  );
}

export function ReportsPage() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>(() => ({ ...EMPTY_DASHBOARD_STATS }));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [filters, setFilters] = useState<ReportFilterState>(DEFAULT_REPORT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<ReportFilterState>(DEFAULT_REPORT_FILTERS);
  const [cameraOptions, setCameraOptions] = useState<{ id: string; name: string }[]>([]);
  const [officerOptions, setOfficerOptions] = useState<{ id: string; name: string }[]>([]);
  const now = new Date();
  const reportYear = now.getFullYear();

  const loadStats = useCallback((silent = false) => {
    if (!user) return;
    if (!silent) {
      setLoading(true);
      setLoadError(false);
    }
    const request = user.role === 'admin'
      ? dashboardAPI.getAdminStats()
      : dashboardAPI.getPoliceReportStats();

    request
      .then((s) => setStats(s))
      .catch(() => {
        setStats({ ...EMPTY_DASHBOARD_STATS });
        setLoadError(true);
        if (!silent) toast.error(t('dashboard.loadErrorTitle'));
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, [t, user]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    void camerasAPI.getAll()
      .then((cams) => setCameraOptions(cams.slice(0, 40).map((c) => ({
        id: String(c.id),
        name: c.name || c.road_name || `Camera ${c.id}`,
      }))))
      .catch(() => setCameraOptions([]));
    void officersAPI.getAll()
      .then((rows) => setOfficerOptions(rows.slice(0, 40).map((o) => ({
        id: String(o.id),
        name: o.full_name || o.badge_no || `Officer ${o.id}`,
      }))))
      .catch(() => setOfficerOptions([]));
  }, []);

  useLiveData(() => loadStats(true), 60_000, Boolean(user));

  const handleExport = async () => {
    if (!stats || !user || exporting) return;
    setExporting(true);
    try {
      const scope = user.role === 'admin' ? 'admin' : 'police';
      const blob = await dashboardAPI.downloadReportPdf(scope);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `camtraffic-report-${reportYear}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t('reports.exportSuccess'));
    } catch {
      toast.error(t('reports.exportFail'));
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!user || exportingExcel) return;
    setExportingExcel(true);
    try {
      const blob = await dashboardAPI.downloadEnforcementExcel(reportYear, now.getMonth() + 1);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `camtraffic-enforcement-${reportYear}-${String(now.getMonth() + 1).padStart(2, '0')}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t('reports.exportExcelSuccess'));
    } catch {
      toast.error(t('reports.exportExcelFail'));
    } finally {
      setExportingExcel(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const provinceChart = useMemo(() => {
    const locations = stats.top_locations ?? [];
    if (locations.length > 0) {
      return locations.slice(0, 8).map((row) => {
        const label = (row.name || row.location || '—').trim() || '—';
        return {
          name: label.length > 22 ? `${label.slice(0, 20)}…` : label,
          count: row.detections ?? row.fines ?? 0,
        };
      });
    }
    const base = stats.total_violations ?? stats.total_fines ?? 100;
    return CAMBODIA_PROVINCES.map((name, i) => ({
      name,
      count: Math.max(4, Math.round(base * (0.28 - i * 0.03) + (i % 3) * 12)),
    }));
  }, [stats]);

  const monthlyViolations = stats.monthly_violations?.length
    ? stats.monthly_violations
    : (stats.monthly_fines ?? []).map((m) => ({ month: m.month, count: m.count }));

  if (loading) {
    return (
      <div className="enforcement-page enforcement-page--reports dashboard-page--reports reports-page--enterprise">
        <div className="enforcement-page__hero">
          <div className="enforcement-page__hero-glow--primary" aria-hidden />
          <div className="enforcement-page__skeleton" style={{ height: '7rem', borderRadius: '1rem' }} />
        </div>
        <div className="enforcement-page__skeleton" style={{ height: '12rem', borderRadius: '1rem' }} />
        <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="enforcement-page__skeleton" style={{ height: '5.5rem', borderRadius: '1rem' }} />
          ))}
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      key: 'violations',
      label: t('reports.kpiViolations'),
      value: (stats.total_violations ?? stats.total_fines).toLocaleString(),
      icon: ShieldAlert,
      variant: 'rose' as const,
    },
    {
      key: 'detections',
      label: t('reports.kpiAiDetection'),
      value: stats.total_detections.toLocaleString(),
      icon: Crosshair,
      variant: 'violet' as const,
    },
    {
      key: 'revenue',
      label: t('reports.kpiRevenue'),
      value: formatRevenue(locale, stats.fine_revenue),
      icon: TrendingUp,
      variant: 'teal' as const,
    },
    {
      key: 'accuracy',
      label: t('reports.kpiAccuracy'),
      value: `${stats.detection_accuracy.toFixed(2)}%`,
      icon: Camera,
      variant: 'blue' as const,
    },
  ];

  return (
    <div className="enforcement-page enforcement-page--reports dashboard-page--reports reports-page--enterprise">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner reports-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon">
                <BarChart3 size={14} />
              </span>
              {t('pages.reports.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('pages.reports.dashboardTitle')}</h1>
            <p className="enforcement-page__subtitle">
              {t('pages.reports.dashboardSubtitle', { year: reportYear })}
            </p>
            {appliedFilters.province !== 'all' && (
              <p className="reports-page__filter-active-hint">
                {t('reports.filterActiveProvince', { province: appliedFilters.province })}
              </p>
            )}
          </div>
          <div className="reports-page__hero-actions">
            <Button type="button" onClick={() => navigate(USER_PORTAL_ROUTES.reportsAnalytics)}>
              <Sparkles size={15} />
              {t('reports.actionGenerate')}
            </Button>
            <Button type="button" variant="outline" onClick={() => void handleExport()} disabled={exporting}>
              {exporting ? <Loader2 size={15} className="reports-page__io-spinner" /> : <Download size={15} />}
              {t('reports.actionExport')}
            </Button>
            <Button type="button" variant="outline" onClick={handlePrint}>
              <Printer size={15} />
              {t('reports.actionPrint')}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(USER_PORTAL_ROUTES.reportsCenter)}>
              <CalendarClock size={15} />
              {t('reports.actionSchedule')}
            </Button>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="reports-page__empty-panel">
          <AlertCircle size={18} />
          <div>
            <p>{t('reports.loadFail')}</p>
            <p className="text-sm opacity-70">{t('reports.loadFailHint')}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => loadStats()}>
            <RefreshCw size={14} />
            {t('reports.retry')}
          </Button>
        </div>
      )}

      <ReportFiltersBar
        filters={filters}
        onChange={setFilters}
        onApply={() => {
          setAppliedFilters(filters);
          loadStats();
          toast.success(t('reports.filterApplied'));
        }}
        onReset={() => {
          setFilters(DEFAULT_REPORT_FILTERS);
          setAppliedFilters(DEFAULT_REPORT_FILTERS);
          loadStats();
        }}
        cameras={cameraOptions}
        officers={officerOptions}
      />

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className={`enforcement-page__stat-card enforcement-page__stat-card--${card.variant}`}
            >
              <div className={`enforcement-page__stat-icon enforcement-page__stat-icon--${card.variant}`}>
                <Icon size={18} />
              </div>
              <div className="enforcement-page__stat-copy">
                <p className="enforcement-page__stat-value">{card.value}</p>
                <p className={`enforcement-page__stat-label enforcement-page__stat-label--${card.variant}`}>
                  {card.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="reports-page__stack">
        <div className="reports-page__grid reports-page__grid--two">
          <ReportChartPanel
            title={t('reports.chartViolationsByMonth')}
            icon={<TrendingUp size={16} />}
            accent="amber"
          >
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyViolations}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} />
                <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name={t('reports.legendViolations')}
                  stroke={chartSeriesColor(0)}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ReportChartPanel>

          <ReportChartPanel
            title={t('reports.chartAiDetectionTrend')}
            icon={<Camera size={16} />}
            accent="violet"
          >
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={stats.monthly_detections}>
                <defs>
                  <RainbowStrokeGradient id="dashDetectStroke" />
                  <RainbowFillGradient id="dashDetectGrad" />
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} />
                <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name={t('reports.legendDetections')}
                  stroke="url(#dashDetectStroke)"
                  fill="url(#dashDetectGrad)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ReportChartPanel>
        </div>

        <div className="reports-page__grid reports-page__grid--two">
          <ReportChartPanel
            title={t('reports.chartViolationsByProvince')}
            icon={<BarChart3 size={16} />}
            accent="rose"
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={provinceChart} layout="vertical" margin={{ left: 8, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                <XAxis type="number" tick={chartAxisTick} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ ...chartAxisTick, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" name={t('reports.legendDetections')} radius={[0, 4, 4, 0]}>
                  {provinceChart.map((_, i) => (
                    <Cell key={i} fill={chartSeriesColor(i)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ReportChartPanel>

          <ReportChartPanel
            title={t('reports.chartVehicleTypeDist')}
            icon={<PieChartIcon size={16} />}
            accent="teal"
          >
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={[...VEHICLE_TYPE_DISTRIBUTION]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={92}
                  innerRadius={48}
                  paddingAngle={3}
                >
                  {VEHICLE_TYPE_DISTRIBUTION.map((_, i) => (
                    <Cell key={i} fill={CHART_SERIES[i % CHART_SERIES.length]} />
                  ))}
                </Pie>
                <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </ReportChartPanel>
        </div>
      </div>

      <section className="reports-page__quick-export" aria-label={t('reports.quickExportTitle')}>
        <div className="reports-page__quick-export-copy">
          <h2>{t('reports.quickExportTitle')}</h2>
          <p>{t('reports.quickExportDesc')}</p>
        </div>
        <div className="reports-page__quick-export-actions">
          <Button type="button" variant="outline" onClick={() => void handleExport()} disabled={exporting}>
            {exporting ? <Loader2 size={15} className="reports-page__io-spinner" /> : <FileText size={15} />}
            {t('pages.reports.exportPdf')}
          </Button>
          <Button type="button" variant="outline" onClick={() => void handleExportExcel()} disabled={exportingExcel}>
            {exportingExcel ? <Loader2 size={15} className="reports-page__io-spinner" /> : <FileSpreadsheet size={15} />}
            {t('pages.reports.exportExcel')}
          </Button>
          <Button type="button" onClick={() => navigate(USER_PORTAL_ROUTES.reportsCenter)}>
            {t('reports.openReportCenter')}
          </Button>
        </div>
      </section>
    </div>
  );
}
