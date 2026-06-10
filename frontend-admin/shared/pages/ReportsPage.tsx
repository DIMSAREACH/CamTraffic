import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Download, TrendingUp, FileText, Users, Camera, PieChart as PieChartIcon,
  BarChart2, LineChart as LineChartIcon, AlertCircle, RefreshCw, Shield, Car, BadgeCheck,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { useLiveData } from '@shared/hooks/useLiveData';
import { dashboardAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { DashboardStats } from '@shared/types';
import {
  CHART,
  CHART_SERIES,
  CHART_ROLE_COLORS,
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

function formatRevenue(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

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

const REPORTS_CACHE_KEY = 'camtraffic_reports_v1';

function loadReportsCache(): DashboardStats | null {
  try {
    const raw = localStorage.getItem(REPORTS_CACHE_KEY);
    if (raw) return JSON.parse(raw) as DashboardStats;
  } catch { /* ignore */ }
  return null;
}

export function ReportsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const cachedReport = loadReportsCache();
  const [stats, setStats] = useState<DashboardStats | null>(cachedReport);
  const [loading, setLoading] = useState(!cachedReport);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState<ReportTab>('overview');
  const reportYear = new Date().getFullYear();

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
      .then((s) => {
        setStats(s);
        try { localStorage.setItem(REPORTS_CACHE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
      })
      .catch(() => {
        setStats(null);
        setLoadError(true);
        if (!silent) toast.error(t('reports.loadFail'));
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, [t, user]);

  useEffect(() => {
    loadStats(Boolean(cachedReport));
  }, [loadStats]);

  useLiveData(() => loadStats(true), 60_000, Boolean(user));

  const handleExport = () => {
    if (!stats) return;
    const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `camtraffic-report-${reportYear}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t('reports.exportSuccess'));
  };

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

  if (!stats) {
    return (
      <div className="enforcement-page enforcement-page--reports dashboard-page--reports">
        <div className="enforcement-page__panel reports-page__empty-panel">
          <div className="enforcement-page__empty-icon enforcement-page__empty-icon--amber">
            <AlertCircle size={28} />
          </div>
          <p className="enforcement-page__empty-title">{t('reports.loadFail')}</p>
          <p className="enforcement-page__empty-subtitle">
            {loadError ? t('reports.loadFailHint') : t('reports.noData')}
          </p>
          <Button type="button" className="reports-page__retry-btn" onClick={() => loadStats()}>
            <RefreshCw size={14} />
            {t('reports.retry')}
          </Button>
        </div>
      </div>
    );
  }

  const collectionRate = stats.total_fines > 0
    ? Math.round((stats.paid_fines / stats.total_fines) * 100)
    : 0;
  const overdueFines = Math.max(0, stats.total_fines - stats.paid_fines - stats.pending_fines);

  const mainStatValues: Record<typeof MAIN_STATS[number]['key'], { value: string; sub: string }> = {
    revenue: { value: formatRevenue(stats.fine_revenue), sub: t('reports.statRevenueSub') },
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
          <button
            type="button"
            className="enforcement-page__hero-btn enforcement-page__hero-btn--amber"
            onClick={handleExport}
          >
            <Download size={16} />
            {t('pages.reports.exportPdf')}
          </button>
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
        <div className="reports-page__grid reports-page__grid--two">
          <ChartPanel
            title={t('reports.chartMonthlyRevenue', { year: reportYear })}
            icon={<TrendingUp size={16} />}
            accent="teal"
          >
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={stats.monthly_fines}>
                <defs>
                  <linearGradient id="reportsRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART.secondary} stopOpacity={0.22} />
                    <stop offset="95%" stopColor={CHART.secondary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  cursor={false}
                  formatter={(v) => [`$${v}`, t('reports.legendRevenue')]}
                  contentStyle={chartTooltipStyle}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={CHART.secondary}
                  fill="url(#reportsRevGrad)"
                  strokeWidth={2}
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
      )}

      {tab === 'fines' && (
        <div className="reports-page__section">
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
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  yAxisId="left"
                  dataKey="count"
                  name={t('reports.legendFinesCount')}
                  fill={CHART.primary}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  dataKey="revenue"
                  name={t('reports.legendRevenueDollar')}
                  fill={CHART.secondary}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>

          <div className="reports-page__mini-grid reports-page__mini-grid--four">
            <MiniStat label={t('reports.statTotalFines')} value={stats.total_fines} variant="slate" />
            <MiniStat label={t('reports.statPaid')} value={stats.paid_fines} variant="emerald" />
            <MiniStat label={t('reports.statPending')} value={stats.pending_fines} variant="amber" />
            <MiniStat label={t('reports.statOverdue')} value={overdueFines} variant="rose" />
          </div>
        </div>
      )}

      {tab === 'detections' && (
        <div className="reports-page__section">
          <ChartPanel
            title={t('reports.chartMonthlyDetections', { year: reportYear })}
            icon={<LineChartIcon size={16} />}
            accent="violet"
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.monthly_detections}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} />
                <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name={t('reports.legendDetections')}
                  stroke={CHART.primary}
                  strokeWidth={2}
                  dot={{ fill: CHART.primary, r: 3 }}
                  activeDot={{ r: 5, fill: CHART.primaryDark }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartPanel>

          <div className="reports-page__mini-grid reports-page__mini-grid--two">
            <MiniStat label={t('reports.statTotalDetections')} value={stats.total_detections} variant="violet" />
            <MiniStat
              label={t('reports.statModelAccuracy')}
              value={`${stats.detection_accuracy}%`}
              variant="blue"
            />
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="reports-page__section">
          <div className="reports-page__mini-grid reports-page__mini-grid--three">
            <MiniStat label={t('reports.statTotalUsers')} value={stats.total_users} variant="slate" />
            <MiniStat label={t('reports.statDrivers')} value={stats.total_drivers} variant="teal" />
            <MiniStat label={t('reports.statPolice')} value={stats.total_police} variant="blue" />
          </div>

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
                    <Cell key={i} fill={CHART_ROLE_COLORS[i % CHART_ROLE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartPanel>

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
    </div>
  );
}
