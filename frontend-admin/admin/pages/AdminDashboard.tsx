import { useState, useEffect, type ReactNode } from 'react';
import { Users, Car, FileText, Camera, TrendingUp, AlertTriangle, Clock, ArrowUpRight, ArrowDownRight, Shield, RefreshCw } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { dashboardAPI } from '@shared/services/api';
import {
  getSampleAdminDashboard,
  mergeDashboardStats,
} from '@shared/services/sampleDataFallback';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppDate, greetingKey, formatRevenue } from '@shared/i18n/localeFormat';
import { WelcomeProfileAvatar } from '@shared/components/WelcomeProfileAvatar';
import type { DashboardStats, TrendBadge } from '@shared/types';
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
  total_users: 0,
  total_drivers: 0,
  total_police: 0,
  total_fines: 0,
  paid_fines: 0,
  pending_fines: 0,
  total_detections: 0,
  total_vehicles: 0,
  fine_revenue: 0,
  detection_accuracy: 0,
  monthly_fines: [],
  monthly_detections: [],
  fine_by_reason: [],
  user_distribution: [],
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
    fine_by_reason: raw.fine_by_reason ?? [],
    user_distribution: raw.user_distribution ?? [],
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

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid rgba(37,99,235,0.1)',
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
  padding: '8px 12px',
};

function StatCard({ title, value, sub, icon, gradient, glow, trend }: {
  title: string; value: string | number; sub: string;
  icon: ReactNode; gradient: string; glow?: string; trend?: TrendBadge | null;
}) {
  return (
    <div
      className="admin-dashboard-kpi relative overflow-hidden rounded-2xl p-5 text-white shadow-lg transition-transform hover:-translate-y-0.5"
      style={{ background: gradient, boxShadow: glow ? `0 12px 32px ${glow}` : undefined }}
    >
      <div className="absolute top-0 right-0 w-36 h-36 rounded-full -translate-y-10 translate-x-10"
        style={{ background: 'rgba(255,255,255,0.07)' }} />
      <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full translate-y-8 -translate-x-6"
        style={{ background: 'rgba(255,255,255,0.05)' }} />
      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="dashboard-kpi__label text-white/65">{title}</p>
          <p className="dashboard-kpi__value text-white mt-2">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {trend && (
              <span className="dashboard-kpi__trend flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
                {trend.up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {trend.value}%
              </span>
            )}
            <p className="dashboard-kpi__sub text-white/55">{sub}</p>
          </div>
        </div>
        <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm shadow-inner">
          {icon}
        </div>
      </div>
    </div>
  );
}

function SecondaryCard({ label, value, icon, bg, color, accent }: {
  label: string; value: string | number; icon: ReactNode; bg: string; color: string; accent: string;
}) {
  return (
    <div
      className="admin-dashboard-secondary bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3.5 transition-all"
      style={{ border: `1px solid ${accent}22`, borderTop: `3px solid ${accent}` }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px ${accent}28`;
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '';
        (e.currentTarget as HTMLElement).style.transform = '';
      }}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
        style={{ background: bg, color }}>
        {icon}
      </div>
      <div>
        <p className="dashboard-stat__value">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        <p className="dashboard-stat__label mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children, action, accent }: {
  title: string; subtitle?: string; children: ReactNode; action?: ReactNode; accent: string;
}) {
  return (
    <div className="admin-dashboard-chart bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
      <div className="h-1" style={{ background: accent }} />
      <div className="px-5 pt-4 pb-3 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: accent, boxShadow: `0 0 10px ${accent}` }} />
          <div>
            <h3 className="dashboard-card__title">{title}</h3>
            {subtitle && <p className="dashboard-card__subtitle mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="px-3 pb-5">{children}</div>
    </div>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[220px] text-sm text-slate-400 rounded-xl"
      style={{ background: '#F8FAFC', border: '1px dashed #E2E8F0' }}>
      {message}
    </div>
  );
}

const DASH_CACHE_KEY = 'camtraffic_admin_dashboard_v2';

export function AdminDashboard() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const [stats, setStats] = useState<DashboardStats>(() => getSampleAdminDashboard());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const now = new Date();
  const chartYear = now.getFullYear();

  const loadStats = (silent = false) => {
    if (!silent) {
      setLoading(true);
      setLoadError(false);
    }
    dashboardAPI
      .getAdminStats()
      .then((s) => {
        const normalized = mergeDashboardStats(normalizeAdminStats(s));
        setStats(normalized);
        setLoadError(false);
        try { localStorage.setItem(DASH_CACHE_KEY, JSON.stringify(normalized)); } catch { /* ignore */ }
      })
      .catch(() => {
        setStats(getSampleAdminDashboard());
        setLoadError(false);
        if (!silent) {
          toast.message('Showing demo dashboard data.');
        }
      })
      .finally(() => { if (!silent) setLoading(false); });
  };

  useEffect(() => {
    loadStats(true);
  }, []);

  if (loading) {
    return (
      <div className="dashboard-home space-y-5">
        <div className="h-[100px] rounded-2xl animate-pulse" style={{ background: 'rgba(37,99,235,0.07)' }} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[120px] rounded-2xl animate-pulse" style={{ background: 'rgba(37,99,235,0.07)' }} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-[280px] rounded-2xl animate-pulse" style={{ background: 'rgba(37,99,235,0.05)' }} />
          ))}
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

  const violationTypeChart = (stats.violation_by_type ?? []).map((row) => ({
    reason: (row.violation_type || row.reason || 'Unknown').replace(/_/g, ' '),
    count: row.count,
  }));

  const topViolationChart = violationTypeChart.length > 0 ? violationTypeChart : stats.fine_by_reason;
  const C = DASHBOARD_PALETTE;

  return (
    <div className="dashboard-home space-y-5">
      {/* Welcome banner */}
      <div className="dashboard-welcome--hero admin-dashboard-hero relative overflow-hidden rounded-3xl p-6" style={{ background: 'linear-gradient(135deg, #0B1220 0%, #1E1B4B 45%, #134E4A 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {C.map((c, i) => (
          <div
            key={c.name}
            className="admin-dashboard-hero__orb"
            style={{
              background: `radial-gradient(circle, ${c.solid}55 0%, transparent 70%)`,
              top: i % 2 === 0 ? '-20%' : 'auto',
              bottom: i % 2 === 1 ? '-25%' : 'auto',
              left: `${8 + i * 12}%`,
              width: `${120 + i * 20}px`,
              height: `${120 + i * 20}px`,
            }}
          />
        ))}
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <WelcomeProfileAvatar role="admin" variant="welcome" />
            <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: C[0].grad }}>
                <Shield size={14} className="text-white" />
              </div>
              <span className="dashboard-welcome__eyebrow" style={{ color: C[0].solid }}>{t('dashboard.adminEyebrow')}</span>
            </div>
            <h1 className="dashboard-welcome__title text-white">
              {t(greetingKey(now.getHours()))}, {user?.full_name.split(' ')[0]}
            </h1>
            <p className="dashboard-welcome__meta mt-1" style={{ color: 'rgba(148,163,184,0.75)' }}>
              {formatAppDate(locale, now)}
            </p>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            {[
              { label: t('dashboard.systemStatus'), value: t('dashboard.statusOnline'), color: C[3].solid },
              { label: t('dashboard.aiModel'), value: t('dashboard.aiModelValue'), color: C[2].solid },
              { label: t('dashboard.uptime'), value: '99.9%', color: C[0].solid },
            ].map(s => (
              <div key={s.label} className="dashboard-welcome__status-card px-3 py-2 rounded-xl text-center min-w-[7.5rem]"
                style={{ borderTop: `2px solid ${s.color}`, background: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
                  <span className="dashboard-welcome__status-label">{s.label}</span>
                </div>
                <p className="dashboard-welcome__status-value">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards — 4 spectrum colors */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('dashboard.totalUsers')} value={stats.total_users}
          sub={t('dashboard.usersSub', { drivers: stats.total_drivers, officers: stats.total_police })}
          icon={<Users size={19} />} gradient={C[1].grad} glow={C[1].soft}
          trend={stats.trends?.users} />
        <StatCard title={t('dashboard.totalFines')} value={stats.total_fines}
          sub={t('dashboard.collectionRate', { rate: fineRate })}
          icon={<FileText size={19} />} gradient={C[5].grad} glow={C[5].soft}
          trend={stats.trends?.fines} />
        <StatCard title={t('dashboard.aiDetections')} value={Number(stats.total_detections).toLocaleString()}
          sub={t('dashboard.avgConfidence', { rate: stats.detection_accuracy })}
          icon={<Camera size={19} />} gradient={C[0].grad} glow={C[0].soft}
          trend={stats.trends?.detections} />
        <StatCard title={t('dashboard.revenue')} value={revenueDisplay}
          sub={t('dashboard.paidFinesSub', { count: stats.paid_fines })}
          icon={<TrendingUp size={19} />} gradient={C[2].grad} glow={C[2].soft}
          trend={stats.trends?.revenue} />
      </div>

      {/* Secondary stats — remaining 3 + wrap */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SecondaryCard label={t('dashboard.registeredVehicles')} value={stats.total_vehicles} icon={<Car size={17} />} bg={C[6].soft} color={C[6].solid} accent={C[6].solid} />
        <SecondaryCard label={t('dashboard.totalTrafficSigns')} value={stats.total_signs ?? 0} icon={<Shield size={17} />} bg={C[3].soft} color={C[3].solid} accent={C[3].solid} />
        <SecondaryCard label={t('dashboard.totalViolations')} value={stats.total_violations ?? 0} icon={<AlertTriangle size={17} />} bg={C[4].soft} color={C[4].solid} accent={C[4].solid} />
        <SecondaryCard label={t('dashboard.pendingViolations')} value={stats.pending_violations ?? 0} icon={<Clock size={17} />} bg={C[5].soft} color={C[5].solid} accent={C[5].solid} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <ChartCard title={t('dashboard.monthlyFinesTitle', { year: chartYear })} subtitle={t('dashboard.monthlyFinesSubtitle')} accent={C[5].solid}>
            {stats.monthly_fines.length === 0 ? (
              <ChartEmpty message={t('dashboard.chartNoFines')} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats.monthly_fines}>
                  <defs>
                    <linearGradient id="fineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C[5].solid} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={C[5].solid} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                  <Area type="monotone" dataKey="count" name="Fines" stroke={C[5].solid} fill="url(#fineGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: C[5].dark }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <ChartCard title={t('dashboard.userDistributionTitle')} subtitle={t('dashboard.userDistributionSubtitle')} accent={C[1].solid}>
          {stats.user_distribution.every(d => d.count === 0) ? (
            <ChartEmpty message={t('dashboard.chartNoUsers')} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={userDistributionChart} dataKey="count" nameKey="role" cx="50%" cy="45%" outerRadius={78} innerRadius={46} paddingAngle={3}>
                  {userDistributionChart.map((_, i) => <Cell key={i} fill={CHART_ROLE_COLORS[i % CHART_ROLE_COLORS.length]} />)}
                </Pie>
                <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard title={t('dashboard.topViolationsTitle')} subtitle={t('dashboard.topViolationsSubtitle')} accent={C[4].solid}>
          {topViolationChart.length === 0 ? (
            <ChartEmpty message={t('dashboard.chartNoViolations')} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topViolationChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                <XAxis type="number" tick={chartAxisTick} axisLine={false} tickLine={false} />
                <YAxis dataKey="reason" type="category" tick={chartCategoryTick} axisLine={false} tickLine={false} width={95} />
                <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" name="Count" radius={[0, 6, 6, 0]}>
                  {topViolationChart.map((_, i) => <Cell key={i} fill={CHART_SERIES[i % CHART_SERIES.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title={t('dashboard.aiDetectionsMonthlyTitle')} subtitle={t('dashboard.aiDetectionsMonthlySubtitle')} accent={C[0].solid}>
          {stats.monthly_detections.length === 0 ? (
            <ChartEmpty message={t('dashboard.chartNoDetections')} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.monthly_detections}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} />
                <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" name="Detections" radius={[6, 6, 0, 0]} maxBarSize={36}>
                  {stats.monthly_detections.map((_, i) => (
                    <Cell key={i} fill={CHART_SERIES[i % CHART_SERIES.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title={t('dashboard.monthlyViolationsTitle', { year: chartYear })} subtitle={t('dashboard.monthlyViolationsSubtitle')} accent={C[4].solid}>
          {(stats.monthly_violations ?? []).length === 0 ? (
            <ChartEmpty message={t('dashboard.chartNoViolations')} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.monthly_violations ?? []}>
                <defs>
                  <linearGradient id="violationGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C[4].solid} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={C[4].solid} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} />
                <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="count" name="Violations" stroke={C[4].solid} fill="url(#violationGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: C[4].dark }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
