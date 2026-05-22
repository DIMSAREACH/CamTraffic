import { useState, useEffect } from 'react';
import { Car, FileText, Camera, AlertTriangle, CheckCircle, Clock, ArrowRight, BookOpen, Sparkles, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppDate, greetingKey } from '@shared/i18n/localeFormat';
import { WelcomeProfileAvatar } from '@shared/components/WelcomeProfileAvatar';
import { dashboardAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { Fine, AIDetectionLog } from '@shared/types';

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: 'rgba(245,158,11,0.12)', color: '#D97706', label: 'Pending' },
  paid: { bg: 'rgba(16,185,129,0.12)', color: '#059669', label: 'Paid' },
  overdue: { bg: 'rgba(239,68,68,0.12)', color: '#DC2626', label: 'Overdue' },
  dismissed: { bg: 'rgba(100,116,139,0.12)', color: '#475569', label: 'Dismissed' },
};

export function DriverDashboard() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState<{
    vehicles: number; total_fines: number; pending: number; paid: number; owed: number;
    recent_detections: AIDetectionLog[]; recent_fines: Fine[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadStats = () => {
    if (!user) return;
    setLoading(true);
    setLoadError(false);
    dashboardAPI
      .getDriverStats(user.id)
      .then(setStats)
      .catch(() => {
        setStats(null);
        setLoadError(true);
        toast.error('Could not load dashboard stats.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();
  }, [user]);

  const quickActions = [
    {
      label: 'AI Sign Detection',
      desc: 'Upload a traffic sign photo for instant AI identification',
      icon: <Camera size={22} />,
      path: '/dashboard/ai-detection',
      gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
      glow: '0 8px 28px rgba(139,92,246,0.4)',
      badge: 'AI Powered',
    },
    {
      label: 'Traffic Signs Library',
      desc: 'Learn Cambodia traffic rules and sign meanings',
      icon: <BookOpen size={22} />,
      path: '/dashboard/signs',
      gradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
      glow: '0 8px 28px rgba(37,99,235,0.4)',
      badge: null,
    },
    {
      label: 'My Vehicles',
      desc: 'Manage your registered vehicles',
      icon: <Car size={22} />,
      path: '/dashboard/vehicles',
      gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)',
      glow: '0 8px 28px rgba(6,182,212,0.4)',
      badge: null,
    },
    {
      label: 'My Fines',
      desc: 'View and pay outstanding fines',
      icon: <FileText size={22} />,
      path: '/dashboard/fines',
      gradient: 'linear-gradient(135deg, #EF4444, #DC2626)',
      glow: '0 8px 28px rgba(239,68,68,0.4)',
      badge: stats?.pending ? `${stats.pending} pending` : null,
    },
  ];

  const statCards = [
    { title: 'My Vehicles', value: stats?.vehicles ?? 0, icon: <Car size={18} />, gradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)', note: 'registered' },
    { title: 'Total Fines', value: stats?.total_fines ?? 0, icon: <FileText size={18} />, gradient: 'linear-gradient(135deg, #475569, #334155)', note: 'all time' },
    { title: 'Outstanding', value: stats?.pending ?? 0, icon: <Clock size={18} />, gradient: 'linear-gradient(135deg, #EF4444, #DC2626)', note: 'need payment' },
    { title: 'Amount Owed', value: `$${Number(stats?.owed ?? 0).toLocaleString()}`, icon: <AlertTriangle size={18} />, gradient: 'linear-gradient(135deg, #F59E0B, #D97706)', note: 'USD total' },
  ];

  if (loading) {
    return (
      <div className="dashboard-home space-y-5">
        <div className="h-[100px] rounded-2xl animate-pulse" style={{ background: 'rgba(37,99,235,0.07)' }} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[100px] rounded-2xl animate-pulse" style={{ background: 'rgba(37,99,235,0.07)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (loadError && !stats) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm" style={{ border: '1px solid rgba(37,99,235,0.1)' }}>
        <p className="text-slate-700 font-semibold mb-2">Dashboard could not load</p>
        <p className="text-sm text-slate-500 mb-4">Check that the backend is running, then retry.</p>
        <button
          type="button"
          onClick={loadStats}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}
        >
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-home space-y-5">
      {/* Welcome header */}
      <div className="relative overflow-hidden rounded-3xl p-6" style={{ background: 'linear-gradient(135deg, #0A1628, #0D1B3E)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full -translate-y-16 translate-x-16"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)' }} />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <WelcomeProfileAvatar role="driver" variant="welcome" />
            <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} style={{ color: '#06B6D4' }} />
              <span className="dashboard-welcome__eyebrow" style={{ color: 'rgba(6,182,212,0.8)' }}>{t('dashboard.driverPortal')}</span>
            </div>
            <h1 className="dashboard-welcome__title text-white">
              {t('dashboard.driverWelcome', { name: user?.full_name.split(' ')[0] ?? '' })}
            </h1>
            <p className="dashboard-welcome__meta mt-1" style={{ color: 'rgba(148,163,184,0.7)' }}>{formatAppDate(locale, new Date())}</p>
            </div>
          </div>
          {(stats?.owed ?? 0) > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle size={16} style={{ color: '#EF4444' }} />
              <div>
                <p className="text-[11px] font-bold" style={{ color: '#FCA5A5' }}>{t('dashboard.outstandingBalance')}</p>
                <p className="text-white text-[15px] font-black">${stats?.owed} USD</p>
              </div>
              <button
                onClick={() => navigate('/dashboard/fines')}
                className="px-3 py-1.5 rounded-lg text-white text-[12px] font-bold flex items-center gap-1"
                style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
                {t('dashboard.payNow')} <ArrowRight size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.title} className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg" style={{ background: s.gradient }}>
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-6 translate-x-6" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="dashboard-kpi__label text-white/65">{s.title}</p>
                <p className="dashboard-kpi__value text-white mt-2">{s.value}</p>
                <p className="dashboard-kpi__sub text-white/50 mt-1">{s.note}</p>
              </div>
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="dashboard-section__title">Quick Actions</h2>
          <span className="dashboard-section__subtitle">What would you like to do?</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map(a => (
            <button
              key={a.label}
              onClick={() => navigate(a.path)}
              className="text-white rounded-2xl p-5 text-left relative overflow-hidden transition-all"
              style={{ background: a.gradient, boxShadow: a.glow }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = a.glow.replace('0 8px', '0 12px'); }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = a.glow; }}
            >
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8" style={{ background: 'rgba(255,255,255,0.08)' }} />
              {a.badge && (
                <span className="absolute top-3 right-3 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
                  {a.badge}
                </span>
              )}
              <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center mb-3 relative z-10">{a.icon}</div>
              <p className="font-bold text-sm leading-tight relative z-10">{a.label}</p>
              <p className="text-white/60 text-[11px] mt-1 line-clamp-2 relative z-10">{a.desc}</p>
              <div className="flex items-center gap-1 mt-2.5 relative z-10">
                <span className="text-[11px] font-semibold text-white/75">Open</span>
                <ArrowRight size={11} style={{ color: 'rgba(255,255,255,0.75)' }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Fines */}
        <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626' }}>
                <FileText size={15} />
              </div>
              <h3 className="text-slate-800 text-[14px] font-bold">Recent Fines</h3>
            </div>
            <button onClick={() => navigate('/dashboard/fines')}
              className="text-[12px] font-semibold flex items-center gap-1 transition-colors" style={{ color: '#2563EB' }}>
              View all <ArrowRight size={12} />
            </button>
          </div>

          {!stats?.recent_fines?.length ? (
            <div className="text-center py-10 rounded-xl" style={{ background: '#FAFBFF', border: '1px dashed rgba(16,185,129,0.2)' }}>
              <CheckCircle size={30} className="mx-auto mb-2.5" style={{ color: 'rgba(16,185,129,0.4)' }} />
              <p className="text-sm text-slate-400 font-medium">No recent fines</p>
              <p className="text-xs text-slate-300 mt-1">Keep driving safely!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.recent_fines.map(f => {
                const badge = STATUS_BADGE[f.status] || STATUS_BADGE.dismissed;
                return (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl transition-all"
                    style={{ background: '#F8FAFC', border: '1px solid rgba(37,99,235,0.05)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(37,99,235,0.1)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(37,99,235,0.05)'; }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: badge.bg, color: badge.color }}>
                      <FileText size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">{f.reason}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{new Date(f.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <span className="font-black text-slate-900 text-sm">${f.amount}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                        style={{ background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent AI Detections */}
        <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.08)', color: '#7C3AED' }}>
                <Camera size={15} />
              </div>
              <h3 className="text-slate-800 text-[14px] font-bold">Recent AI Detections</h3>
            </div>
            <button onClick={() => navigate('/dashboard/ai-detection')}
              className="text-[12px] font-semibold flex items-center gap-1" style={{ color: '#8B5CF6' }}>
              Detect <ArrowRight size={12} />
            </button>
          </div>

          {!stats?.recent_detections?.length ? (
            <div className="text-center py-10 rounded-xl" style={{ background: '#FAFBFF', border: '1px dashed rgba(139,92,246,0.15)' }}>
              <Camera size={30} className="mx-auto mb-2.5" style={{ color: 'rgba(139,92,246,0.3)' }} />
              <p className="text-sm text-slate-400 font-medium">No detections yet</p>
              <button onClick={() => navigate('/dashboard/ai-detection')}
                className="mt-3 px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}>
                Try AI Detection
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.recent_detections.map(d => (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl transition-all"
                  style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.08)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.18)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.08)'; }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(139,92,246,0.1)', color: '#7C3AED' }}>
                    <Camera size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{d.detected_sign}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(d.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: 'rgba(139,92,246,0.1)', color: '#7C3AED' }}>
                    {d.confidence.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
