import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Users, Car, FileText, Camera, TrendingUp, AlertTriangle, Clock, ArrowUpRight, ArrowDownRight,
  Shield, RefreshCw, Brain, MapPin, History, ArrowRight, ScanSearch, BarChart3, Gavel,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { useAdminDashboardStats, useCameraLiveStatus } from '@shared/hooks/queries/useDashboardQueries';
import { EMPTY_DASHBOARD_STATS } from '@shared/constants/emptyDashboard';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppDate, greetingKey, formatRevenue, formatAppCurrency } from '@shared/i18n/localeFormat';
import { WelcomeProfileAvatar } from '@shared/components/WelcomeProfileAvatar';
import type { DashboardActivityItem, DashboardStats, TrendBadge } from '@shared/types';
import {
  clearAdminRecentViews,
  getAdminRecentViews,
  type RecentViewItem,
} from '@shared/utils/recentViews';
import { toast } from 'sonner';
import {
  CHART,
  CHART_SERIES,
  CHART_ROLE_COLORS,
  DASHBOARD_PALETTE,
  chartTooltipStyle,
  chartAxisTick,
  chartCategoryTick,
} from '@shared/constants/chartPalette';

const EMPTY_STATS: DashboardStats = {
  ...EMPTY_DASHBOARD_STATS,
};

function translateRoleLabel(
  role: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const r = role.toLowerCase();
  if (r.startsWith('driver')) return t('dashboard.roleDrivers');
  if (r.startsWith('police')) return t('dashboard.rolePolice');
  if (r.startsWith('admin')) return t('dashboard.roleAdmins');
  return role;
}

function normalizeAdminStats(raw: Partial<DashboardStats>): DashboardStats {
  return {
    ...EMPTY_STATS,
    ...raw,
    monthly_fines: raw.monthly_fines ?? [],
    monthly_detections: raw.monthly_detections ?? [],
    monthly_violations: raw.monthly_violations ?? [],
    fine_by_reason: raw.fine_by_reason ?? [],
    user_distribution: raw.user_distribution ?? [],
    recent_activity: raw.recent_activity ?? [],
    top_locations: raw.top_locations ?? [],
    total_detections: raw.total_detections ?? 0,
    total_fines: raw.total_fines ?? 0,
    total_signs: raw.total_signs ?? 0,
    total_violations: raw.total_violations ?? 0,
    pending_violations: raw.pending_violations ?? 0,
    paid_fines: raw.paid_fines ?? 0,
    fine_revenue: raw.fine_revenue ?? 0,
    detection_accuracy: raw.detection_accuracy ?? 0,
  };
}

function relativeTime(
  iso: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 60_000) return t('dashboard.justNow');
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return t('dashboard.minutesAgo', { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 48) return t('dashboard.hoursAgo', { n: hours });
  return t('dashboard.daysAgo', { n: Math.floor(hours / 24) });
}

function activityKindLabel(
  kind: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  if (kind === 'violation') return t('dashboard.activityViolation');
  if (kind === 'fine') return t('dashboard.activityFine');
  if (kind === 'detection') return t('dashboard.activityDetection');
  return kind;
}

function StatCard({ title, value, sub, icon, gradient, glow, trend }: {
  title: string; value: string | number; sub: string;
  icon: ReactNode; gradient: string; glow?: string; trend?: TrendBadge | null;
}) {
  return (
    <div className="admin-dash-kpi admin-dash-kpi--color" style={{ background: gradient, boxShadow: glow ? `0 12px 28px ${glow}` : undefined }}>
      <div className="admin-dash-kpi__orb" aria-hidden />
      <div className="admin-dash-kpi__top">
        <div className="admin-dash-kpi__icon admin-dash-kpi__icon--on-color">
          {icon}
        </div>
        {trend && (
          <span className="admin-dash-kpi__trend admin-dash-kpi__trend--on-color">
            {trend.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend.value}%
          </span>
        )}
      </div>
      <p className="admin-dash-kpi__value admin-dash-kpi__value--on-color">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="admin-dash-kpi__label admin-dash-kpi__label--on-color">{title}</p>
      <p className="admin-dash-kpi__sub admin-dash-kpi__sub--on-color">{sub}</p>
    </div>
  );
}

function SecondaryCard({ label, value, sub, icon, accent, soft }: {
  label: string; value: string | number; sub?: string; icon: ReactNode; accent: string; soft: string;
}) {
  return (
    <div className="admin-dash-ops-card admin-dash-ops-card--color" style={{ borderTopColor: accent, background: `linear-gradient(180deg, ${soft} 0%, var(--ad-card) 55%)` }}>
      <div className="admin-dash-ops-card__icon" style={{ background: soft, color: accent, boxShadow: `0 6px 14px ${soft}` }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="admin-dash-ops-card__value">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="admin-dash-ops-card__label">{label}</p>
        {sub ? <p className="admin-dash-ops-card__sub">{sub}</p> : null}
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children, action, className = '', accent }: {
  title: string; subtitle?: string; children: ReactNode; action?: ReactNode; className?: string; accent?: string;
}) {
  return (
    <section className={`admin-dash-panel admin-dash-panel--color ${className}`}>
      {accent ? <div className="admin-dash-panel__accent" style={{ background: accent }} /> : null}
      <header className="admin-dash-panel__head">
        <div className="flex items-start gap-2.5 min-w-0">
          {accent ? <span className="admin-dash-panel__dot" style={{ background: accent, boxShadow: `0 0 12px ${accent}` }} /> : null}
          <div className="min-w-0">
            <h3 className="admin-dash-panel__title">{title}</h3>
            {subtitle ? <p className="admin-dash-panel__subtitle">{subtitle}</p> : null}
          </div>
        </div>
        {action}
      </header>
      <div className="admin-dash-panel__body">{children}</div>
    </section>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="admin-dash-empty">
      {message}
    </div>
  );
}

const DASH_CACHE_KEY = 'camtraffic_admin_dashboard_v2';

export function AdminDashboard() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const {
    data: rawStats,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useAdminDashboardStats();
  const { data: cameraLive } = useCameraLiveStatus();
  const now = new Date();
  const chartYear = now.getFullYear();
  const [recentViews, setRecentViews] = useState<RecentViewItem[]>(() => getAdminRecentViews());

  const stats = normalizeAdminStats(rawStats ?? EMPTY_DASHBOARD_STATS);
  const cameraSummary = cameraLive?.summary ?? { active: 0, offline: 0, total: 0 };

  useEffect(() => {
    if (!rawStats || isError) return;
    try {
      localStorage.setItem(DASH_CACHE_KEY, JSON.stringify(stats));
    } catch { /* ignore */ }
  }, [rawStats, isError, stats]);

  useEffect(() => {
    if (isError) toast.error(t('dashboard.loadErrorTitle'));
  }, [isError, t]);

  useEffect(() => {
    setRecentViews(getAdminRecentViews());
  }, [rawStats]);

  const quickStartActions = useMemo(() => [
    { label: t('dashboard.qaManageUsers'), icon: Users, path: '/admin/users', accent: DASHBOARD_PALETTE[1].solid },
    {
      label: t('dashboard.qaReviewViolations'),
      icon: Gavel,
      path: '/admin/violations',
      accent: DASHBOARD_PALETTE[4].solid,
      badge: (stats.pending_violations ?? 0) > 0 ? String(stats.pending_violations) : null,
    },
    { label: t('dashboard.qaIssueFines'), icon: FileText, path: '/admin/fines', accent: DASHBOARD_PALETTE[5].solid },
    { label: t('dashboard.qaLiveCameras'), icon: Camera, path: '/admin/cameras', accent: DASHBOARD_PALETTE[2].solid },
    { label: t('dashboard.qaRunAi'), icon: Brain, path: '/admin/ai-detection/new', accent: DASHBOARD_PALETTE[0].solid },
    { label: t('dashboard.qaReports'), icon: BarChart3, path: '/admin/reports', accent: DASHBOARD_PALETTE[6].solid },
  ], [stats.pending_violations, t]);

  const recentActivity = (stats.recent_activity ?? []) as DashboardActivityItem[];
  const hotLocations = stats.top_locations ?? [];
  const loading = isLoading && !rawStats;
  const C = DASHBOARD_PALETTE;

  if (loading) {
    return (
      <div className="dashboard-home admin-dashboard-page admin-dash space-y-5">
        <div className="h-[96px] rounded-2xl animate-pulse bg-slate-100" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-[112px] rounded-2xl animate-pulse bg-slate-100" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => <div key={i} className="h-[260px] rounded-2xl animate-pulse bg-slate-50" />)}
        </div>
      </div>
    );
  }

  const fineRate = stats.total_fines > 0
    ? Math.round((stats.paid_fines / stats.total_fines) * 100)
    : 0;
  const revenueDisplay = formatRevenue(locale, stats.fine_revenue);

  const userDistributionChart = stats.user_distribution.map((d) => ({
    ...d,
    role: translateRoleLabel(d.role, t),
  }));

  const formatViolationLabel = (raw: string) => {
    const cleaned = (raw || 'Unknown').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace(/\bU Turn\b/gi, 'U-Turn');
  };

  const topViolationChart = (() => {
    const source =
      (stats.violation_by_type?.length ?? 0) > 0
        ? (stats.violation_by_type ?? []).map((row) => ({
            reason: formatViolationLabel(row.violation_type || row.reason || 'Unknown'),
            count: row.count,
          }))
        : (stats.fine_by_reason ?? []).map((row) => ({
            reason: formatViolationLabel(row.reason || 'Other'),
            count: row.count,
          }));

    const merged = new Map<string, number>();
    for (const row of source) {
      const key = row.reason.toUpperCase();
      merged.set(key, (merged.get(key) ?? 0) + (Number(row.count) || 0));
    }
    return [...merged.entries()]
      .map(([key, count]) => ({ reason: formatViolationLabel(key), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  })();

  return (
    <div className="dashboard-home admin-dashboard-page admin-dash admin-dash--colorful space-y-5">
      {/* Header */}
      <header className="admin-dash-hero admin-dash-hero--colorful">
        <div className="admin-dash-hero__glow admin-dash-hero__glow--1" aria-hidden />
        <div className="admin-dash-hero__glow admin-dash-hero__glow--2" aria-hidden />
        <div className="admin-dash-hero__glow admin-dash-hero__glow--3" aria-hidden />
        <div className="admin-dash-hero__main relative">
          <WelcomeProfileAvatar role="admin" variant="welcome" />
          <div className="min-w-0">
            <div className="admin-dash-hero__eyebrow">
              <Shield size={13} />
              <span>{t('dashboard.adminEyebrow')}</span>
              <span className="admin-dash-hero__live">LIVE</span>
            </div>
            <h1 className="admin-dash-hero__title">
              {t(greetingKey(now.getHours()))}, {user?.full_name.split(' ')[0]}
            </h1>
            <p className="admin-dash-hero__meta">
              {formatAppDate(locale, now)} · Cambodia Traffic Enforcement
            </p>
          </div>
        </div>
        <div className="admin-dash-hero__aside relative">
          <div className="admin-dash-hero__pills">
            <span className="admin-dash-pill is-online">{t('dashboard.statusOnline')}</span>
            <span className="admin-dash-pill is-cyan">{t('dashboard.aiModelValue')}</span>
            <span className="admin-dash-pill is-amber">
              {(stats.total_violations ?? 0).toLocaleString()} {t('dashboard.totalViolations')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => { void refetch(); }}
            disabled={isFetching}
            className="admin-dash-refresh"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            {t('dashboard.refreshData')}
          </button>
        </div>
      </header>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title={t('dashboard.totalUsers')}
          value={stats.total_users}
          sub={t('dashboard.usersSub', { drivers: stats.total_drivers, officers: stats.total_police })}
          icon={<Users size={18} />}
          gradient={C[6].grad}
          glow={C[6].soft}
          trend={stats.trends?.users}
        />
        <StatCard
          title={t('dashboard.totalFines')}
          value={stats.total_fines}
          sub={t('dashboard.collectionRate', { rate: fineRate })}
          icon={<FileText size={18} />}
          gradient={C[1].grad}
          glow={C[1].soft}
          trend={stats.trends?.fines}
        />
        <StatCard
          title={t('dashboard.aiDetections')}
          value={Number(stats.total_detections).toLocaleString()}
          sub={t('dashboard.avgConfidence', { rate: stats.detection_accuracy })}
          icon={<Camera size={18} />}
          gradient={C[5].grad}
          glow={C[5].soft}
          trend={stats.trends?.detections}
        />
        <StatCard
          title={t('dashboard.revenue')}
          value={revenueDisplay}
          sub={t('dashboard.paidFinesSub', { count: stats.paid_fines })}
          icon={<TrendingUp size={18} />}
          gradient={C[4].grad}
          glow={C[4].soft}
          trend={stats.trends?.revenue}
        />
      </div>

      {/* Operations */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <SecondaryCard label={t('dashboard.registeredVehicles')} value={stats.total_vehicles} icon={<Car size={16} />} accent={C[7].solid} soft={C[7].soft} />
        <SecondaryCard label={t('dashboard.totalTrafficSigns')} value={stats.total_signs ?? 0} icon={<Shield size={16} />} accent={C[3].solid} soft={C[3].soft} />
        <SecondaryCard label={t('dashboard.totalViolations')} value={stats.total_violations ?? 0} icon={<AlertTriangle size={16} />} accent={C[0].solid} soft={C[0].soft} />
        <SecondaryCard label={t('dashboard.pendingViolations')} value={stats.pending_violations ?? 0} icon={<Clock size={16} />} accent={C[1].solid} soft={C[1].soft} />
        <SecondaryCard
          label={t('dashboard.liveCameras')}
          value={cameraSummary.total > 0 ? `${cameraSummary.active}/${cameraSummary.total}` : '—'}
          sub={cameraSummary.total > 0 ? t('dashboard.liveCamerasSub', { offline: cameraSummary.offline }) : t('dashboard.liveCamerasEmpty')}
          icon={<Camera size={16} />}
          accent={C[5].solid}
          soft={C[5].soft}
        />
      </div>

      {/* Quick Start — compact toolbar */}
      <Panel title={t('dashboard.quickStartTitle')} subtitle={t('dashboard.quickStartHint')} accent={C[8].solid}>
        <div className="admin-dash-quick-grid">
          {quickStartActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.path}
                type="button"
                onClick={() => navigate(action.path)}
                className="admin-dash-quick-btn admin-dash-quick-btn--color"
                style={{ borderColor: `${action.accent}33`, background: `linear-gradient(135deg, ${action.accent}18 0%, var(--ad-card) 62%)` }}
              >
                <span className="admin-dash-quick-btn__icon" style={{ background: `${action.accent}22`, color: action.accent }}>
                  <Icon size={16} />
                </span>
                <span className="admin-dash-quick-btn__label">{action.label}</span>
                {action.badge && <span className="admin-dash-quick-btn__badge">{action.badge}</span>}
                <ArrowRight size={13} className="admin-dash-quick-btn__arrow" style={{ color: action.accent }} />
              </button>
            );
          })}
        </div>
      </Panel>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel
          className="lg:col-span-2"
          title={t('dashboard.monthlyFinesTitle', { year: chartYear })}
          subtitle={t('dashboard.monthlyFinesSubtitle')}
          accent={C[1].solid}
        >
          {stats.monthly_fines.length === 0 ? (
            <ChartEmpty message={t('dashboard.chartNoFines')} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.monthly_fines}>
                <defs>
                  <linearGradient id="fineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C[1].solid} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={C[1].solid} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} />
                <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="count" name={t('dashboard.chartLegendFines')} stroke={C[1].solid} fill="url(#fineGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: C[1].dark }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title={t('dashboard.userDistributionTitle')} subtitle={t('dashboard.userDistributionSubtitle')} accent={C[8].solid}>
          {stats.user_distribution.every((d) => d.count === 0) ? (
            <ChartEmpty message={t('dashboard.chartNoUsers')} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={userDistributionChart} dataKey="count" nameKey="role" cx="50%" cy="45%" outerRadius={76} innerRadius={44} paddingAngle={3}>
                  {userDistributionChart.map((_, i) => <Cell key={i} fill={CHART_ROLE_COLORS[i % CHART_ROLE_COLORS.length]} />)}
                </Pie>
                <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title={t('dashboard.topViolationsTitle')} subtitle={t('dashboard.topViolationsSubtitle')} accent={C[0].solid}>
          {topViolationChart.length === 0 ? (
            <ChartEmpty message={t('dashboard.chartNoViolations')} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topViolationChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                <XAxis type="number" tick={chartAxisTick} axisLine={false} tickLine={false} />
                <YAxis dataKey="reason" type="category" tick={chartCategoryTick} axisLine={false} tickLine={false} width={118} />
                <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" name={t('dashboard.chartLegendCount')} radius={[0, 6, 6, 0]}>
                  {topViolationChart.map((_, i) => <Cell key={i} fill={CHART_SERIES[i % CHART_SERIES.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title={t('dashboard.aiDetectionsMonthlyTitle')} subtitle={t('dashboard.aiDetectionsMonthlySubtitle')} accent={C[5].solid}>
          {stats.monthly_detections.length === 0 ? (
            <ChartEmpty message={t('dashboard.chartNoDetections')} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.monthly_detections}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} />
                <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" name={t('dashboard.chartLegendDetections')} radius={[6, 6, 0, 0]} maxBarSize={34}>
                  {stats.monthly_detections.map((_, i) => (
                    <Cell key={i} fill={CHART_SERIES[i % CHART_SERIES.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title={t('dashboard.monthlyViolationsTitle', { year: chartYear })} subtitle={t('dashboard.monthlyViolationsSubtitle')} accent={C[4].solid}>
          {(stats.monthly_violations ?? []).length === 0 ? (
            <ChartEmpty message={t('dashboard.chartNoViolations')} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.monthly_violations ?? []}>
                <defs>
                  <linearGradient id="violationGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C[4].solid} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={C[4].solid} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} />
                <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="count" name={t('dashboard.chartLegendViolations')} stroke={C[4].solid} fill="url(#violationGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: C[4].dark }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      {/* Under charts: activity + hotspots */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Panel
          className="xl:col-span-3"
          title={t('dashboard.recentActivityTitle')}
          subtitle={t('dashboard.recentActivityHint')}
          accent={C[0].solid}
          action={(
            <button type="button" className="admin-dash-link" onClick={() => navigate('/admin/violations')}>
              {t('dashboard.viewAll')}
            </button>
          )}
        >
          {recentActivity.length === 0 ? (
            <ChartEmpty message={t('dashboard.recentActivityEmpty')} />
          ) : (
            <div className="admin-dash-activity">
              {recentActivity.map((item) => {
                const tone =
                  item.kind === 'fine' ? C[1].solid
                    : item.kind === 'detection' ? C[5].solid
                      : C[0].solid;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => item.href && navigate(item.href)}
                    className="admin-dash-activity__row"
                  >
                    <span className="admin-dash-activity__icon" style={{ background: `${tone}18`, color: tone }}>
                      {item.kind === 'fine' ? <FileText size={14} />
                        : item.kind === 'detection' ? <ScanSearch size={14} />
                          : <AlertTriangle size={14} />}
                    </span>
                    <div className="admin-dash-activity__main">
                      <div className="admin-dash-activity__title-row">
                        <span className="admin-dash-activity__title">{item.title}</span>
                        <span className="admin-dash-activity__kind" style={{ color: tone, background: `${tone}16` }}>
                          {activityKindLabel(item.kind, t)}
                        </span>
                      </div>
                      <p className="admin-dash-activity__meta">
                        <MapPin size={11} />
                        {item.subtitle}
                        {item.meta ? ` · ${item.meta}` : ''}
                      </p>
                    </div>
                    <div className="admin-dash-activity__aside">
                      {typeof item.amount === 'number' && item.amount > 0 && (
                        <span className="admin-dash-activity__amount">{formatAppCurrency(locale, item.amount)}</span>
                      )}
                      <span className="admin-dash-activity__time">{relativeTime(item.created_at, t)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel
          className="xl:col-span-2"
          title={t('dashboard.hotLocationsTitle')}
          subtitle={t('dashboard.hotLocationsHint')}
          accent={C[5].solid}
        >
          {hotLocations.length === 0 ? (
            <ChartEmpty message={t('dashboard.hotLocationsEmpty')} />
          ) : (
            <ul className="admin-dash-hotspots">
              {hotLocations.slice(0, 7).map((loc, idx) => {
                const rankColor = CHART_SERIES[idx % CHART_SERIES.length];
                return (
                  <li key={`${loc.location || loc.name}-${idx}`} className="admin-dash-hotspots__row" style={{ background: `${rankColor}10`, borderColor: `${rankColor}22` }}>
                    <span className="admin-dash-hotspots__rank" style={{ background: rankColor }}>{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="admin-dash-hotspots__name">{loc.name || loc.location}</p>
                      <p className="admin-dash-hotspots__count">
                        {(loc.detections ?? loc.fines ?? 0).toLocaleString()} events
                      </p>
                    </div>
                    <MapPin size={14} style={{ color: rankColor }} className="shrink-0" />
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {/* Recent view history — under charts / activity */}
      <Panel
        title={t('dashboard.recentViewsTitle')}
        subtitle={t('dashboard.recentViewsHint')}
        accent={C[7].solid}
        action={recentViews.length > 0 ? (
          <button
            type="button"
            className="admin-dash-link"
            onClick={() => {
              clearAdminRecentViews();
              setRecentViews([]);
            }}
          >
            {t('dashboard.clearRecentViews')}
          </button>
        ) : undefined}
      >
        {recentViews.length === 0 ? (
          <div className="admin-dash-empty admin-dash-empty--sm">
            <History size={18} className="opacity-40" />
            <span>{t('dashboard.recentViewsEmpty')}</span>
          </div>
        ) : (
          <div className="admin-dash-views">
            {recentViews.map((view, idx) => {
              const tone = CHART_SERIES[idx % CHART_SERIES.length];
              return (
                <button
                  key={`${view.path}-${view.visitedAt}`}
                  type="button"
                  onClick={() => navigate(view.path)}
                  className="admin-dash-views__row"
                  style={{ borderColor: `${tone}33`, background: `linear-gradient(90deg, ${tone}18 0%, var(--ad-card) 48%)` }}
                >
                  <History size={14} style={{ color: tone }} />
                  <span className="admin-dash-views__title">{view.title}</span>
                  <span className="admin-dash-views__path">{view.path}</span>
                  <span className="admin-dash-views__time">{relativeTime(view.visitedAt, t)}</span>
                  <ArrowRight size={13} style={{ color: tone }} />
                </button>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
