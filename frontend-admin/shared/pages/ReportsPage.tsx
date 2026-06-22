import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Download, TrendingUp, FileText, Users, Camera, PieChart as PieChartIcon,
  BarChart2, LineChart as LineChartIcon, AlertCircle, RefreshCw, Shield, Car, BadgeCheck,
  MapPin, Activity, Gauge, Layers, Database, Archive, HardDrive, FileJson, Settings2,
  Cpu, Loader2, Lock,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppCurrency, formatChartAxisCurrency, formatRevenue } from '@shared/i18n/localeFormat';
import { useLiveData } from '@shared/hooks/useLiveData';
import { dashboardAPI } from '@shared/services/api';
import { getSampleAdminDashboard, mergeDashboardStats } from '@shared/services/sampleDataFallback';
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

type ReportTab = 'overview' | 'fines' | 'detections' | 'users';

const TABS: { key: ReportTab; labelKey: string; gradient: string }[] = [
  { key: 'overview', labelKey: 'reports.tabOverview', gradient: 'linear-gradient(135deg, #D97706, #F59E0B)' },
  { key: 'fines', labelKey: 'reports.tabFines', gradient: 'linear-gradient(135deg, #EF4444, #DC2626)' },
  { key: 'detections', labelKey: 'reports.tabDetections', gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' },
  { key: 'users', labelKey: 'reports.tabUsers', gradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)' },
];

const MAIN_STATS = [
  { key: 'revenue', labelKey: 'reports.statRevenue', subKey: 'reports.statRevenueSub', icon: TrendingUp, variant: 'teal' },
  { key: 'fines', labelKey: 'reports.statFines', subKey: 'reports.statFinesSub', icon: FileText, variant: 'amber' },
  { key: 'users', labelKey: 'reports.statUsers', subKey: 'reports.statUsersSub', icon: Users, variant: 'blue' },
  { key: 'detections', labelKey: 'reports.statDetections', subKey: 'reports.statDetectionsSub', icon: Camera, variant: 'violet' },
] as const;

function ChartPanel({
  title,
  icon,
  accent,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  accent: 'teal' | 'violet' | 'rose' | 'blue' | 'amber';
  children: React.ReactNode;
}) {
  return (
    <div className="enforcement-page__panel reports-page__panel">
      <div className={`reports-page__chart-head reports-page__chart-head--${accent}`}>
        <div className={`reports-page__chart-icon reports-page__chart-icon--${accent}`}>
          {icon}
        </div>
        <h3 className="reports-page__chart-title">{title}</h3>
      </div>
      <div className="reports-page__chart-body">{children}</div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  variant,
}: {
  label: string;
  value: string | number;
  variant: 'slate' | 'emerald' | 'amber' | 'rose' | 'blue' | 'violet' | 'teal';
}) {
  return (
    <div className={`reports-page__mini-stat reports-page__mini-stat--${variant}`}>
      <p className="reports-page__mini-stat-value">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="reports-page__mini-stat-label">{label}</p>
    </div>
  );
}

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

function TopLocationsPanel({
  rows,
  t,
}: {
  rows: NonNullable<DashboardStats['top_locations']>;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const max = Math.max(...rows.map((r) => r.detections), 1);
  return (
    <div className="enforcement-page__panel reports-page__panel reports-page__rank-panel">
      <div className="reports-page__chart-head reports-page__chart-head--blue">
        <div className="reports-page__chart-icon reports-page__chart-icon--blue">
          <MapPin size={16} />
        </div>
        <h3 className="reports-page__chart-title">{t('reports.chartTopLocations')}</h3>
      </div>
      <ul className="reports-page__rank-list">
        {rows.map((row, index) => (
          <li key={row.name} className="reports-page__rank-row">
            <span
              className="reports-page__rank-index"
              style={{
                color: chartSeriesColor(index),
                background: `${chartSeriesColor(index)}22`,
              }}
            >
              {index + 1}
            </span>
            <div className="reports-page__rank-copy">
              <p className="reports-page__rank-title">{row.name}</p>
              <div className="reports-page__rank-bar-track">
                <div
                  className="reports-page__rank-bar-fill"
                  style={{
                    width: `${Math.round((row.detections / max) * 100)}%`,
                    background: `linear-gradient(90deg, ${chartSeriesColor(index)}, ${chartSeriesColor(index + 2)})`,
                  }}
                />
              </div>
              <p className="reports-page__rank-meta">
                {t('reports.locationMeta', { fines: row.fines, detections: row.detections })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReportsPage() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>(() => getSampleAdminDashboard());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState<ReportTab>('overview');
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [includeWeights, setIncludeWeights] = useState(false);
  const now = new Date();
  const [reportYear, setReportYear] = useState(now.getFullYear());
  const [reportMonth, setReportMonth] = useState(now.getMonth() + 1);

  const loadStats = useCallback((silent = false) => {
    if (!user) return;
    if (!silent) {
      setLoading(true);
      setLoadError(false);
    }
    const request = user.role === 'admin'
      ? dashboardAPI.getAdminStats()
      : user.role === 'police'
        ? dashboardAPI.getPoliceReportStats()
        : dashboardAPI.getPoliceReportStats();

    request
      .then((s) => setStats(mergeDashboardStats(s)))
      .catch(() => {
        setStats(getSampleAdminDashboard());
        setLoadError(false);
        if (!silent) toast.message(t('reports.demoData') || 'Showing demo report data.');
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, [t, user]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

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
      const blob = await dashboardAPI.downloadEnforcementExcel(reportYear, reportMonth);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `camtraffic-enforcement-${reportYear}-${String(reportMonth).padStart(2, '0')}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t('reports.exportExcelSuccess'));
    } catch {
      toast.error(t('reports.exportExcelFail'));
    } finally {
      setExportingExcel(false);
    }
  };

  const handleSystemBackup = async () => {
    if (!user || user.role !== 'admin' || backingUp) return;
    setBackingUp(true);
    try {
      const blob = await dashboardAPI.downloadSystemBackup(includeWeights);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      link.download = `camtraffic-backup-${stamp}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t('reports.systemBackupSuccess'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('reports.systemBackupFail');
      toast.error(msg || t('reports.systemBackupFail'));
    } finally {
      setBackingUp(false);
    }
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  if (loading) {
    return (
      <div className="enforcement-page enforcement-page--reports dashboard-page--reports">
        <div className="enforcement-page__hero">
          <div className="enforcement-page__hero-glow--primary" aria-hidden />
          <div className="enforcement-page__skeleton" style={{ height: '7rem', borderRadius: '1rem' }} />
        </div>
        <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="enforcement-page__skeleton" style={{ height: '5.5rem', borderRadius: '1rem' }} />
          ))}
        </div>
        <div className="enforcement-page__skeleton" style={{ height: '3.5rem', borderRadius: '1rem' }} />
        <div className="enforcement-page__skeleton" style={{ height: '18rem', borderRadius: '1rem' }} />
      </div>
    );
  }

  const collectionRate = stats.total_fines > 0
    ? Math.round((stats.paid_fines / stats.total_fines) * 100)
    : 0;
  const overdueFines = Math.max(0, stats.total_fines - stats.paid_fines - stats.pending_fines);
  const detectionBySign = stats.detection_by_sign ?? [];
  const topLocations = stats.top_locations ?? [];
  const peakHours = stats.peak_hours ?? [];
  const monthlyRegistrations = stats.monthly_registrations ?? [];
  const monthlyViolations = stats.monthly_violations ?? [];
  const collectionData = [
    { name: t('reports.statPaid'), value: stats.paid_fines },
    { name: t('reports.statPending'), value: stats.pending_fines },
    { name: t('reports.statOverdue'), value: overdueFines },
  ];

  const mainStatValues: Record<typeof MAIN_STATS[number]['key'], { value: string; sub: string }> = {
    revenue: { value: formatRevenue(locale, stats.fine_revenue), sub: t('reports.statRevenueSub') },
    fines: { value: stats.total_fines.toLocaleString(), sub: t('reports.collectedRate', { rate: collectionRate }) },
    users: { value: stats.total_users.toLocaleString(), sub: t('reports.driversCount', { count: stats.total_drivers }) },
    detections: {
      value: stats.total_detections.toLocaleString(),
      sub: t('reports.accuracyRate', { rate: stats.detection_accuracy }),
    },
  };

  return (
    <div className="enforcement-page enforcement-page--reports dashboard-page--reports">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon">
                <BarChart3 size={14} />
              </span>
              {t('pages.reports.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('pages.reports.title')}</h1>
            <p className="enforcement-page__subtitle">
              {t('pages.reports.heroSubtitle', { year: reportYear })}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex gap-2">
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted-foreground">
                {t('reports.exportMonth')}
                <select
                  value={reportMonth}
                  onChange={(e) => setReportMonth(Number(e.target.value))}
                  className="rounded-lg border border-border bg-background px-2.5 py-2 text-[13px] min-w-[5.5rem]"
                >
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted-foreground">
                {t('reports.exportYear')}
                <select
                  value={reportYear}
                  onChange={(e) => setReportYear(Number(e.target.value))}
                  className="rounded-lg border border-border bg-background px-2.5 py-2 text-[13px] min-w-[5.5rem]"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="enforcement-page__hero-btn enforcement-page__hero-btn--amber"
                onClick={handleExport}
                disabled={exporting}
              >
                <Download size={16} />
                {exporting ? t('reports.exporting') : t('pages.reports.exportPdf')}
              </button>
              <button
                type="button"
                className="enforcement-page__hero-btn"
                onClick={() => void handleExportExcel()}
                disabled={exportingExcel}
              >
                <Download size={16} />
                {exportingExcel ? t('reports.exporting') : t('pages.reports.exportExcel')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
        {MAIN_STATS.map((card) => {
          const Icon = card.icon;
          const { value, sub } = mainStatValues[card.key];
          return (
            <div
              key={card.key}
              className={`enforcement-page__stat-card enforcement-page__stat-card--${card.variant}`}
            >
              <div className={`enforcement-page__stat-icon enforcement-page__stat-icon--${card.variant}`}>
                <Icon size={18} />
              </div>
              <div className="enforcement-page__stat-copy">
                <p className="enforcement-page__stat-value">{value}</p>
                <p className={`enforcement-page__stat-label enforcement-page__stat-label--${card.variant}`}>
                  {t(card.labelKey)}
                </p>
                <p className="reports-page__stat-sub">{sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="reports-page__mini-grid reports-page__mini-grid--four">
        {tab === 'overview' && (
          <>
            <MiniStat label={t('reports.statViolations')} value={stats.total_violations ?? 0} variant="rose" />
            <MiniStat label={t('reports.statVehicles')} value={stats.total_vehicles} variant="teal" />
            <MiniStat label={t('reports.statSignCatalog')} value={stats.total_signs ?? 10} variant="violet" />
            <MiniStat label={t('reports.statCollectionRate')} value={`${collectionRate}%`} variant="emerald" />
          </>
        )}
        {tab === 'fines' && (
          <>
            <MiniStat label={t('reports.statTotalFines')} value={stats.total_fines} variant="slate" />
            <MiniStat label={t('reports.statPaid')} value={stats.paid_fines} variant="emerald" />
            <MiniStat label={t('reports.statPending')} value={stats.pending_fines} variant="amber" />
            <MiniStat label={t('reports.statOverdue')} value={overdueFines} variant="rose" />
          </>
        )}
        {tab === 'detections' && (
          <>
            <MiniStat label={t('reports.statTotalDetections')} value={stats.total_detections} variant="violet" />
            <MiniStat
              label={t('reports.statModelAccuracy')}
              value={`${stats.detection_accuracy}%`}
              variant="blue"
            />
            <MiniStat label={t('reports.statSignCatalog')} value={stats.total_signs ?? 10} variant="teal" />
            <MiniStat label={t('reports.statPeakHour')} value={peakHours.reduce((best, row) => row.count > best.count ? row : best, peakHours[0] ?? { hour: '—', count: 0 }).hour} variant="amber" />
          </>
        )}
        {tab === 'users' && (
          <>
            <MiniStat label={t('reports.statTotalUsers')} value={stats.total_users} variant="slate" />
            <MiniStat label={t('reports.statDrivers')} value={stats.total_drivers} variant="teal" />
            <MiniStat label={t('reports.statPolice')} value={stats.total_police} variant="blue" />
            <MiniStat label={t('reports.statAdmins')} value={stats.user_distribution.find((r) => r.role.toLowerCase().includes('admin'))?.count ?? 0} variant="violet" />
          </>
        )}
      </div>

      <div className="enforcement-page__toolbar">
        <div className="enforcement-page__filters">
          {TABS.map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`enforcement-page__filter-btn${active ? ' enforcement-page__filter-btn--active' : ''}`}
                style={active ? { background: item.gradient } : undefined}
              >
                {t(item.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'overview' && (
        <div className="reports-page__stack">
          <div className="reports-page__grid reports-page__grid--two">
            <ChartPanel
              title={t('reports.chartMonthlyRevenue', { year: reportYear })}
              icon={<TrendingUp size={16} />}
              accent="teal"
            >
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={stats.monthly_fines}>
                  <defs>
                    <RainbowStrokeGradient id="reportsRevStroke" />
                    <RainbowFillGradient id="reportsRevGrad" />
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} tickFormatter={(v) => formatChartAxisCurrency(locale, Number(v))} />
                  <Tooltip
                    cursor={false}
                    formatter={(v) => [formatAppCurrency(locale, Number(v)), t('reports.legendRevenue')]}
                    contentStyle={chartTooltipStyle}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="url(#reportsRevStroke)"
                    fill="url(#reportsRevGrad)"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel
              title={t('reports.chartViolationsBreakdown')}
              icon={<PieChartIcon size={16} />}
              accent="rose"
            >
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={stats.fine_by_reason}
                    dataKey="count"
                    nameKey="reason"
                    cx="50%"
                    cy="50%"
                    outerRadius={92}
                    innerRadius={52}
                    paddingAngle={3}
                  >
                    {stats.fine_by_reason.map((_, i) => (
                      <Cell key={i} fill={CHART_SERIES[i % CHART_SERIES.length]} />
                    ))}
                  </Pie>
                  <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>

          <div className="reports-page__grid reports-page__grid--two">
            <ChartPanel
              title={t('reports.chartDetectionsBySign')}
              icon={<Layers size={16} />}
              accent="violet"
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={detectionBySign} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                  <XAxis type="number" tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="sign"
                    width={118}
                    tick={{ ...chartAxisTick, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                  <Bar dataKey="count" name={t('reports.legendDetections')} radius={[0, 4, 4, 0]}>
                    {detectionBySign.map((_, i) => (
                      <Cell key={i} fill={chartSeriesColor(i)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel
              title={t('reports.chartViolationsTrend', { year: reportYear })}
              icon={<Activity size={16} />}
              accent="amber"
            >
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyViolations}>
                  <defs>
                    <RainbowStrokeGradient id="reportsViolStroke" />
                    <RainbowFillGradient id="reportsViolGrad" />
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name={t('reports.legendViolations')}
                    stroke="url(#reportsViolStroke)"
                    fill="url(#reportsViolGrad)"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>

          <div className="reports-page__grid reports-page__grid--aside">
            <ChartPanel
              title={t('reports.chartPeakHours')}
              icon={<Gauge size={16} />}
              accent="blue"
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={peakHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis dataKey="hour" tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                  <Bar dataKey="count" name={t('reports.legendActivity')} radius={[4, 4, 0, 0]}>
                    {peakHours.map((_, i) => (
                      <Cell key={i} fill={chartSeriesColor(i)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>

            {topLocations.length > 0 ? (
              <TopLocationsPanel rows={topLocations} t={t} />
            ) : null}
          </div>
        </div>
      )}

      {tab === 'fines' && (
        <div className="reports-page__section">
          <div className="reports-page__grid reports-page__grid--two">
            <ChartPanel
              title={t('reports.chartFineVolume')}
              icon={<BarChart2 size={16} />}
              accent="amber"
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.monthly_fines}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={chartAxisTick}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatChartAxisCurrency(locale, Number(v))}
                  />
                  <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    yAxisId="left"
                    dataKey="count"
                    name={t('reports.legendFinesCount')}
                    fill={chartSeriesColor(0)}
                    radius={[4, 4, 0, 0]}
                  >
                    {stats.monthly_fines.map((_, i) => (
                      <Cell key={i} fill={chartSeriesColor(i)} />
                    ))}
                  </Bar>
                  <Bar
                    yAxisId="right"
                    dataKey="revenue"
                    name={t('reports.legendRevenueDollar')}
                    fill={chartSeriesColor(5)}
                    radius={[4, 4, 0, 0]}
                  >
                    {stats.monthly_fines.map((_, i) => (
                      <Cell key={`rev-${i}`} fill={chartSeriesColor(i + 3)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel
              title={t('reports.chartCollectionStatus')}
              icon={<PieChartIcon size={16} />}
              accent="teal"
            >
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={collectionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={58}
                    paddingAngle={4}
                  >
                    {collectionData.map((_, i) => (
                      <Cell key={i} fill={chartSeriesColor(i)} />
                    ))}
                  </Pie>
                  <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>

          <ChartPanel
            title={t('reports.chartTopFineReasons')}
            icon={<FileText size={16} />}
            accent="rose"
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.fine_by_reason} layout="vertical" margin={{ left: 4, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                <XAxis type="number" tick={chartAxisTick} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="reason"
                  width={108}
                  tick={{ ...chartAxisTick, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" name={t('reports.legendFinesCount')} radius={[0, 4, 4, 0]}>
                  {stats.fine_by_reason.map((_, i) => (
                    <Cell key={i} fill={chartSeriesColor(i)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>
        </div>
      )}

      {tab === 'detections' && (
        <div className="reports-page__section">
          <div className="reports-page__grid reports-page__grid--two">
            <ChartPanel
              title={t('reports.chartMonthlyDetections', { year: reportYear })}
              icon={<LineChartIcon size={16} />}
              accent="violet"
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.monthly_detections}>
                  <defs>
                    <RainbowStrokeGradient id="reportsDetectLine" />
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name={t('reports.legendDetections')}
                    stroke="url(#reportsDetectLine)"
                    strokeWidth={2.5}
                    dot={({ cx, cy, index }) => (
                      <circle
                        key={index}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={chartSeriesColor(index ?? 0)}
                        stroke="#fff"
                        strokeWidth={1.5}
                      />
                    )}
                    activeDot={({ cx, cy, index }) => (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill={chartSeriesColor(index ?? 0)}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    )}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel
              title={t('reports.chartDetectionsBySign')}
              icon={<Camera size={16} />}
              accent="violet"
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={detectionBySign.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis dataKey="sign" tick={{ ...chartAxisTick, fontSize: 9 }} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={72} />
                  <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                  <Bar dataKey="count" name={t('reports.legendDetections')} radius={[4, 4, 0, 0]}>
                    {detectionBySign.slice(0, 6).map((_, i) => (
                      <Cell key={i} fill={chartSeriesColor(i)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="reports-page__section">
          <div className="reports-page__grid reports-page__grid--two">
            <ChartPanel
              title={t('reports.chartUserRoles')}
              icon={<Users size={16} />}
              accent="blue"
            >
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={stats.user_distribution}
                    dataKey="count"
                    nameKey="role"
                    cx="50%"
                    cy="50%"
                    outerRadius={102}
                    innerRadius={62}
                    paddingAngle={3}
                  >
                    {stats.user_distribution.map((_, i) => (
                      <Cell key={i} fill={chartSeriesColor(i)} />
                    ))}
                  </Pie>
                  <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel
              title={t('reports.chartUserGrowth', { year: reportYear })}
              icon={<TrendingUp size={16} />}
              accent="teal"
            >
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyRegistrations}>
                  <defs>
                    <RainbowStrokeGradient id="reportsUserStroke" />
                    <RainbowFillGradient id="reportsUserGrad" />
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name={t('reports.legendNewUsers')}
                    stroke="url(#reportsUserStroke)"
                    fill="url(#reportsUserGrad)"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>

          <div className="reports-page__role-legend">
            {[
              { label: t('reports.roleAdmin'), icon: Shield, variant: 'violet' },
              { label: t('reports.rolePolice'), icon: BadgeCheck, variant: 'blue' },
              { label: t('reports.roleDriver'), icon: Car, variant: 'teal' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className={`reports-page__role-chip reports-page__role-chip--${item.variant}`}>
                  <Icon size={13} />
                  {item.label}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {user?.role === 'admin' && (
        <section className="reports-page__backup" aria-labelledby="system-backup-title">
          <div className="reports-page__backup-glow reports-page__backup-glow--primary" aria-hidden />
          <div className="reports-page__backup-glow reports-page__backup-glow--secondary" aria-hidden />
          <div className="reports-page__backup-grid-bg" aria-hidden />

          <div className="reports-page__backup-inner">
            <header className="reports-page__backup-header">
              <p className="reports-page__backup-eyebrow">{t('reports.systemBackupEyebrow')}</p>
              <div className="reports-page__backup-title-row">
                <div className="reports-page__backup-hero-icon">
                  <Archive size={18} strokeWidth={2.2} />
                </div>
                <div className="reports-page__backup-title-copy">
                  <div className="reports-page__backup-title-line">
                    <h2 id="system-backup-title" className="reports-page__backup-title">
                      {t('reports.systemBackup')}
                    </h2>
                    <span className="reports-page__backup-badge">{t('reports.systemBackupAdminBadge')}</span>
                  </div>
                  <p className="reports-page__backup-desc">{t('reports.systemBackupDesc')}</p>
                </div>
              </div>
            </header>

            <div className="reports-page__backup-body">
              <div className="reports-page__backup-chips" role="list">
                {[
                  { icon: Database, label: t('reports.systemBackupChipDb'), tone: 'blue' },
                  { icon: HardDrive, label: t('reports.systemBackupChipMedia'), tone: 'violet' },
                  { icon: FileJson, label: t('reports.systemBackupChipJson'), tone: 'teal' },
                  { icon: Settings2, label: t('reports.systemBackupChipConfig'), tone: 'amber' },
                ].map(({ icon: Icon, label, tone }) => (
                  <div
                    key={label}
                    className={`reports-page__backup-chip reports-page__backup-chip--${tone}`}
                    role="listitem"
                  >
                    <span className="reports-page__backup-chip-icon">
                      <Icon size={13} strokeWidth={2.2} />
                    </span>
                    <span>{label}</span>
                  </div>
                ))}
                {includeWeights && (
                  <div
                    className="reports-page__backup-chip reports-page__backup-chip--rose reports-page__backup-chip--active"
                    role="listitem"
                  >
                    <span className="reports-page__backup-chip-icon">
                      <Cpu size={13} strokeWidth={2.2} />
                    </span>
                    <span>{t('reports.systemBackupChipWeights')}</span>
                  </div>
                )}
              </div>

              <aside className="reports-page__backup-console">
                <button
                  type="button"
                  role="switch"
                  aria-checked={includeWeights}
                  className={`reports-page__backup-toggle${includeWeights ? ' reports-page__backup-toggle--on' : ''}`}
                  onClick={() => setIncludeWeights((v) => !v)}
                  disabled={backingUp}
                >
                  <span className="reports-page__backup-toggle-icon">
                    <Cpu size={14} />
                  </span>
                  <span className="reports-page__backup-toggle-copy">
                    <span className="reports-page__backup-toggle-label">{t('reports.systemBackupIncludeWeights')}</span>
                    <span className="reports-page__backup-toggle-hint">{t('reports.systemBackupWeightsHint')}</span>
                  </span>
                  <span className="reports-page__backup-toggle-track" aria-hidden>
                    <span className="reports-page__backup-toggle-thumb" />
                  </span>
                </button>

                <button
                  type="button"
                  className={`reports-page__backup-btn${backingUp ? ' reports-page__backup-btn--loading' : ''}`}
                  onClick={() => void handleSystemBackup()}
                  disabled={backingUp}
                >
                  {backingUp ? <Loader2 size={16} className="reports-page__backup-btn-spinner" /> : <Download size={16} />}
                  <span>{backingUp ? t('reports.exporting') : t('reports.systemBackupDownload')}</span>
                </button>

                <p className="reports-page__backup-secure">
                  <Lock size={12} strokeWidth={2.2} />
                  {t('reports.systemBackupSecureNote')}
                </p>
              </aside>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
