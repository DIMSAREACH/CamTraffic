import { useState, useEffect } from 'react';
import { BarChart3, Download, TrendingUp, FileText, Users, Camera } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { useLanguage } from '@shared/context/LanguageContext';
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

export function ReportsPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState<'overview' | 'fines' | 'detections' | 'users'>('overview');
  const reportYear = new Date().getFullYear();

  const loadStats = () => {
    setLoading(true);
    setLoadError(false);
    dashboardAPI
      .getAdminStats()
      .then(s => setStats(s))
      .catch(() => {
        setStats(null);
        setLoadError(true);
        toast.error('Could not load reports data.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleExport = () => {
    toast.success('Report exported as PDF (demo)');
  };

  if (loading) return (
    <div className="space-y-5">
      <div className="h-28 rounded-2xl animate-pulse" style={{ background: 'rgba(15,23,42,0.08)' }} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'rgba(37,99,235,0.07)' }} />)}
      </div>
    </div>
  );

  if (!stats) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm" style={{ border: '1px solid rgba(37,99,235,0.1)' }}>
        <p className="text-slate-700 font-semibold mb-2">Reports could not load</p>
        <p className="text-sm text-slate-500 mb-4">
          {loadError ? 'Check that the backend is running, then retry.' : 'No data available.'}
        </p>
        <Button onClick={loadStats}>Retry</Button>
      </div>
    );
  }

  const totalRevenue = stats.fine_revenue;
  const collectionRate = stats.total_fines > 0
    ? Math.round((stats.paid_fines / stats.total_fines) * 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #0F172A, #162035)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full -translate-y-16 translate-x-16"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/3 w-40 h-40 rounded-full translate-y-14"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)' }} />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.2)' }}>
                <BarChart3 size={14} style={{ color: '#FCD34D' }} />
              </div>
              <span className="dashboard-welcome__eyebrow" style={{ color: 'rgba(252,211,77,0.9)' }}>{t('pages.reports.eyebrow')}</span>
            </div>
            <h1 className="dashboard-welcome__title text-white">{t('pages.reports.title')}</h1>
            <p className="dashboard-welcome__meta mt-1" style={{ color: 'rgba(148,163,184,0.7)' }}>
              {t('pages.reports.heroSubtitle', { year: reportYear })}
            </p>
          </div>
          <button onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
          >
            <Download size={14} /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Annual Revenue', value: `$${(totalRevenue / 1000).toFixed(1)}K`, sub: 'Fine collections', icon: <TrendingUp size={18} />, gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)' },
          { title: 'Total Fines', value: stats.total_fines.toLocaleString(), sub: `${collectionRate}% collected`, icon: <FileText size={18} />, gradient: 'linear-gradient(135deg, #EF4444, #DC2626)' },
          { title: 'Registered Users', value: stats.total_users.toLocaleString(), sub: `${stats.total_drivers} drivers`, icon: <Users size={18} />, gradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)' },
          { title: 'AI Detections', value: stats.total_detections.toLocaleString(), sub: `${stats.detection_accuracy}% accuracy`, icon: <Camera size={18} />, gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' },
        ].map(s => (
          <div key={s.title} className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg" style={{ background: s.gradient }}>
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-6 translate-x-6" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-white/65 text-[11px] font-semibold uppercase tracking-widest">{s.title}</p>
                <p className="text-3xl font-black mt-1.5 leading-none" style={{ letterSpacing: '-0.02em' }}>{s.value}</p>
                <p className="text-white/55 text-xs mt-1">{s.sub}</p>
              </div>
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-white shadow-sm" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
        {(['overview', 'fines', 'detections', 'users'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 px-3 py-2 rounded-lg text-[12px] font-bold capitalize transition-all"
            style={tab === t
              ? { background: 'linear-gradient(135deg, #0F172A, #1E293B)', color: '#fff', boxShadow: '0 2px 8px rgba(15,23,42,0.25)' }
              : { color: '#94A3B8' }
            }>{t}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white rounded-2xl shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
              <CardHeader className="pb-2"><CardTitle className="text-slate-800">Monthly Revenue {reportYear}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={stats.monthly_fines}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART.secondary} stopOpacity={0.22} />
                        <stop offset="95%" stopColor={CHART.secondary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                    <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip cursor={false} formatter={(v) => [`$${v}`, 'Revenue']} contentStyle={chartTooltipStyle} />
                    <Area type="monotone" dataKey="revenue" stroke={CHART.secondary} fill="url(#revGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white rounded-2xl shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
              <CardHeader className="pb-2"><CardTitle className="text-slate-800">Violations Breakdown</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={stats.fine_by_reason} dataKey="count" nameKey="reason" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3}>
                      {stats.fine_by_reason.map((_, i) => <Cell key={i} fill={CHART_SERIES[i % CHART_SERIES.length]} />)}
                    </Pie>
                    <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === 'fines' && (
        <div className="space-y-6">
          <Card className="bg-white rounded-2xl shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
            <CardHeader className="pb-2"><CardTitle className="text-slate-800">Monthly Fine Volume vs Revenue</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.monthly_fines}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={chartAxisTick} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="count" name="Fines Count" fill={CHART.primary} radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="revenue" name="Revenue ($)" fill={CHART.secondary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Fine status breakdown */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Fines', value: stats.total_fines, color: 'border-l-gray-400' },
              { label: 'Paid', value: stats.paid_fines, color: 'border-l-emerald-500' },
              { label: 'Pending', value: stats.pending_fines, color: 'border-l-amber-500' },
              { label: 'Overdue', value: stats.total_fines - stats.paid_fines - stats.pending_fines, color: 'border-l-red-500' },
            ].map(s => (
              <Card key={s.label} className={`border border-gray-100 border-l-4 shadow-sm ${s.color}`}>
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-gray-900">{s.value.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'detections' && (
        <div className="space-y-6">
          <Card className="bg-white rounded-2xl shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
            <CardHeader className="pb-2"><CardTitle className="text-slate-800">Monthly AI Detections {reportYear}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={stats.monthly_detections}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" name="Detections" stroke={CHART.primary} strokeWidth={2} dot={{ fill: CHART.primary, r: 3 }} activeDot={{ r: 5, fill: CHART.primaryDark }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-white rounded-2xl shadow-sm"  style={{ border: '1px solid rgba(37,99,235,0.07)' }}><CardContent className="p-4"><p className="text-2xl font-bold text-gray-900">{stats.total_detections.toLocaleString()}</p><p className="text-xs text-gray-500">Total Detections</p></CardContent></Card>
            <Card className="bg-white rounded-2xl shadow-sm"  style={{ border: '1px solid rgba(37,99,235,0.07)' }}><CardContent className="p-4"><p className="text-2xl font-bold text-gray-900">{stats.detection_accuracy}%</p><p className="text-xs text-gray-500">Model Accuracy</p></CardContent></Card>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Total Users', value: stats.total_users, color: 'border-l-slate-500' },
              { label: 'Drivers', value: stats.total_drivers, color: 'border-l-emerald-500' },
              { label: 'Police Officers', value: stats.total_police, color: 'border-l-blue-500' },
            ].map(s => (
              <Card key={s.label} className={`border border-gray-100 border-l-4 shadow-sm ${s.color}`}>
                <CardContent className="p-5">
                  <p className="text-3xl font-bold text-gray-900">{s.value.toLocaleString()}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="bg-white rounded-2xl shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
            <CardHeader className="pb-2"><CardTitle className="text-slate-800">User Role Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={stats.user_distribution} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={100} innerRadius={60} paddingAngle={3}>
                    {stats.user_distribution.map((_, i) => <Cell key={i} fill={CHART_ROLE_COLORS[i % CHART_ROLE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
