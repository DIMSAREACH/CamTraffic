import { useState, useEffect, type ReactNode } from 'react';
import { Users, Car, FileText, Camera, TrendingUp, AlertTriangle, CheckCircle, Clock, ArrowUpRight, ArrowDownRight, Shield, RefreshCw } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { dashboardAPI } from '@shared/services/api';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppDate, greetingKey } from '@shared/i18n/localeFormat';
import { WelcomeProfileAvatar } from '@shared/components/WelcomeProfileAvatar';
import type { DashboardStats, TrendBadge } from '@shared/types';
import { toast } from 'sonner';
import {
  CHART,
  CHART_SERIES,
  CHART_ROLE_COLORS,
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

function StatCard({ title, value, sub, icon, gradient, trend }: {
  title: string; value: string | number; sub: string;
  icon: ReactNode; gradient: string; trend?: TrendBadge | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg" style={{ background: gradient }}>
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

function SecondaryCard({ label, value, icon, bg, color }: { label: string; value: string | number; icon: ReactNode; bg: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3.5 transition-all"
      style={{ border: '1px solid rgba(37,99,235,0.07)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(37,99,235,0.1)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; (e.currentTarget as HTMLElement).style.transform = ''; }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
        style={{ background: bg, color }}>
        {icon}
      </div>
      <div>
        <p className="dashboard-stat__value">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="dashboard-stat__label mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
      <div className="px-5 pt-5 pb-3 flex items-start justify-between">
        <div>
          <h3 className="dashboard-card__title">{title}</h3>
          {subtitle && <p className="dashboard-card__subtitle mt-0.5">{subtitle}</p>}
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

export function AdminDashboard() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const now = new Date();
  const chartYear = now.getFullYear();

  const loadStats = () => {
    setLoading(true);
    setLoadError(false);
    dashboardAPI
      .getAdminStats()
      .then((s) => {
        setStats(normalizeAdminStats(s));
      })
      .catch(() => {
        setStats(null);
        setLoadError(true);
        toast.error('Could not load dashboard. Check that the backend is running.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();
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

  if (!stats) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm" style={{ border: '1px solid rgba(37,99,235,0.1)' }}>
        <p className="text-slate-700 font-semibold mb-2">{t('dashboard.loadErrorTitle')}</p>
        <p className="text-sm text-slate-500 mb-4">
          {loadError ? t('dashboard.loadErrorHint') : t('dashboard.incompleteData')}
        </p>
        <button
          type="button"
          onClick={loadStats}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}
        >
          <RefreshCw size={16} /> {t('dashboard.retry')}
        </button>
      </div>
    );
  }

  const fineRate = stats.total_fines > 0
    ? Math.round((stats.paid_fines / stats.total_fines) * 100)
    : 0;
  const revenueDisplay = stats.fine_revenue >= 1000
    ? `$${(stats.fine_revenue / 1000).toFixed(1)}K`
    : `$${stats.fine_revenue.toFixed(0)}`;

  const userDistributionChart = stats.user_distribution.map((d) => ({
    ...d,
    role: translateRoleLabel(d.role, t),
  }));

  return (
    <div className="dashboard-home space-y-5">
      {/* Welcome banner */}
      <div className="dashboard-welcome--hero relative overflow-hidden rounded-3xl p-6" style={{ background: 'linear-gradient(135deg, #0F172A, #1E293B)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full -translate-y-20 translate-x-20"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full translate-y-16 -translate-x-10"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)' }} />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <WelcomeProfileAvatar role="admin" variant="welcome" />
            <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}>
                <Shield size={14} className="text-white" />
              </div>
              <span className="dashboard-welcome__eyebrow" style={{ color: 'rgba(139,92,246,0.9)' }}>{t('dashboard.adminEyebrow')}</span>
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
              { label: t('dashboard.systemStatus'), value: t('dashboard.statusOnline'), dot: '#22C55E' },
              { label: t('dashboard.aiModel'), value: t('dashboard.aiModelValue'), dot: '#06B6D4' },
              { label: t('dashboard.uptime'), value: '99.9%', dot: '#8B5CF6' },
            ].map(s => (
              <div key={s.label} className="dashboard-welcome__status-card px-3 py-2 rounded-xl text-center min-w-[7.5rem]">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
                  <span className="dashboard-welcome__status-label">{s.label}</span>
                </div>
                <p className="dashboard-welcome__status-value">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('dashboard.totalUsers')} value={stats.total_users}
          sub={t('dashboard.usersSub', { drivers: stats.total_drivers, officers: stats.total_police })}
          icon={<Users size={19} />} gradient="linear-gradient(135deg, #2563EB, #1D4ED8)"
          trend={stats.trends?.users} />
        <StatCard title={t('dashboard.totalFines')} value={stats.total_fines}
          sub={t('dashboard.collectionRate', { rate: fineRate })}
          icon={<FileText size={19} />} gradient="linear-gradient(135deg, #EF4444, #DC2626)"
          trend={stats.trends?.fines} />
        <StatCard title={t('dashboard.aiDetections')} value={Number(stats.total_detections).toLocaleString()}
          sub={t('dashboard.avgConfidence', { rate: stats.detection_accuracy })}
          icon={<Camera size={19} />} gradient="linear-gradient(135deg, #8B5CF6, #7C3AED)"
          trend={stats.trends?.detections} />
        <StatCard title={t('dashboard.revenue')} value={revenueDisplay}
          sub={t('dashboard.paidFinesSub', { count: stats.paid_fines })}
          icon={<TrendingUp size={19} />} gradient="linear-gradient(135deg, #06B6D4, #0891B2)"
          trend={stats.trends?.revenue} />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SecondaryCard label={t('dashboard.registeredVehicles')} value={stats.total_vehicles} icon={<Car size={17} />} bg="rgba(37,99,235,0.08)" color="#2563EB" />
        <SecondaryCard label={t('dashboard.pendingFines')} value={stats.pending_fines} icon={<Clock size={17} />} bg="rgba(245,158,11,0.1)" color="#D97706" />
        <SecondaryCard label={t('dashboard.paidFines')} value={stats.paid_fines} icon={<CheckCircle size={17} />} bg="rgba(16,185,129,0.1)" color="#059669" />
        <SecondaryCard label={t('dashboard.activeOfficers')} value={stats.total_police} icon={<AlertTriangle size={17} />} bg="rgba(139,92,246,0.1)" color="#7C3AED" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <ChartCard title={t('dashboard.monthlyFinesTitle', { year: chartYear })} subtitle={t('dashboard.monthlyFinesSubtitle')}>
            {stats.monthly_fines.length === 0 ? (
              <ChartEmpty message={t('dashboard.chartNoFines')} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats.monthly_fines}>
                  <defs>
                    <linearGradient id="fineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART.primary} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={CHART.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                  <Area type="monotone" dataKey="count" name="Fines" stroke={CHART.primary} fill="url(#fineGrad)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: CHART.primaryDark }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <ChartCard title={t('dashboard.userDistributionTitle')} subtitle={t('dashboard.userDistributionSubtitle')}>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title={t('dashboard.topViolationsTitle')} subtitle={t('dashboard.topViolationsSubtitle')}>
          {stats.fine_by_reason.length === 0 ? (
            <ChartEmpty message={t('dashboard.chartNoViolations')} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.fine_by_reason} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                <XAxis type="number" tick={chartAxisTick} axisLine={false} tickLine={false} />
                <YAxis dataKey="reason" type="category" tick={chartCategoryTick} axisLine={false} tickLine={false} width={95} />
                <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" name="Count" radius={[0, 6, 6, 0]}>
                  {stats.fine_by_reason.map((_, i) => <Cell key={i} fill={CHART_SERIES[i % CHART_SERIES.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title={t('dashboard.aiDetectionsMonthlyTitle')} subtitle={t('dashboard.aiDetectionsMonthlySubtitle')}>
          {stats.monthly_detections.length === 0 ? (
            <ChartEmpty message={t('dashboard.chartNoDetections')} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.monthly_detections}>
                <defs>
                  <linearGradient id="detGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.primaryLight} stopOpacity={1} />
                    <stop offset="100%" stopColor={CHART.primaryDark} stopOpacity={0.95} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} />
                <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" name="Detections" fill="url(#detGrad)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
