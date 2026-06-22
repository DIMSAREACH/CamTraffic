import { useState, useEffect, type ReactNode } from 'react';
import {
  Car, FileText, Camera, AlertTriangle, CheckCircle, Clock, ArrowRight,
  BookOpen, Sparkles, RefreshCw, Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppDate, greetingKey, formatAppCurrency } from '@shared/i18n/localeFormat';
import { WelcomeProfileAvatar } from '@shared/components/WelcomeProfileAvatar';
import { dashboardAPI } from '@shared/services/api';
import { getSampleDriverStats } from '@shared/services/sampleDataFallback';
import { DASHBOARD_PALETTE } from '@shared/constants/chartPalette';
import type { Fine, AIDetectionLog } from '@shared/types';

const C = DASHBOARD_PALETTE;

const STATUS_BADGE: Record<string, { bg: string; color: string; accent: string }> = {
  pending: { bg: C[4].soft, color: C[4].dark, accent: C[4].solid },
  paid: { bg: C[3].soft, color: C[3].dark, accent: C[3].solid },
  overdue: { bg: C[5].soft, color: C[5].dark, accent: C[5].solid },
  dismissed: { bg: 'rgba(100,116,139,0.12)', color: '#475569', accent: '#64748B' },
};

function KpiCard({ title, value, note, icon, palette }: {
  title: string; value: string | number; note: string; icon: ReactNode;
  palette: (typeof C)[number];
}) {
  return (
    <div
      className="user-dashboard-kpi relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
      style={{ background: palette.grad, boxShadow: `0 12px 32px ${palette.soft}` }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-8 translate-x-8"
        style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full translate-y-6 -translate-x-4"
        style={{ background: 'rgba(255,255,255,0.05)' }} />
      <div className="relative z-[1] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="dashboard-kpi__label">{title}</p>
          <p className="dashboard-kpi__value mt-2">{value}</p>
          <p className="dashboard-kpi__sub mt-1">{note}</p>
        </div>
        <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm border border-white/20">
          {icon}
        </div>
      </div>
    </div>
  );
}

function PanelCard({ title, accent, icon, action, children }: {
  title: string; accent: string; icon: ReactNode; action?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="user-dashboard-panel">
      <div className="user-dashboard-panel__bar" style={{ background: accent }} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ background: `${accent}18`, color: accent }}>
              {icon}
            </div>
            <h3 className="dashboard-card__title truncate">{title}</h3>
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}

export function DriverDashboard() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const now = new Date();
  const [stats, setStats] = useState<{
    vehicles: number; total_fines: number; pending: number; paid: number; owed: number;
    recent_detections: AIDetectionLog[]; recent_fines: Fine[];
  }>(() => getSampleDriverStats());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadStats = () => {
    if (!user) return;
    setLoading(true);
    setLoadError(false);
    dashboardAPI
      .getDriverStats(user.id)
      .then((data) => {
        setStats(data);
        setLoadError(false);
      })
      .catch(() => {
        setStats(getSampleDriverStats(user.id));
        setLoadError(false);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();
  }, [user]);

  const quickActions = [
    { label: t('dashboard.qaAiDetection'), desc: t('dashboard.qaAiDetectionDesc'), icon: <Camera size={22} />, path: '/dashboard/ai-detection', palette: C[0], badge: t('dashboard.qaAiBadge') },
    { label: t('dashboard.qaSignsLibrary'), desc: t('dashboard.qaSignsLibraryDesc'), icon: <BookOpen size={22} />, path: '/dashboard/signs', palette: C[1], badge: null },
    { label: t('dashboard.qaMyVehicles'), desc: t('dashboard.qaMyVehiclesDesc'), icon: <Car size={22} />, path: '/dashboard/vehicles', palette: C[2], badge: null },
    { label: t('dashboard.qaMyFines'), desc: t('dashboard.qaMyFinesDesc'), icon: <FileText size={22} />, path: '/dashboard/fines', palette: C[5], badge: stats?.pending ? t('dashboard.pendingBadge', { count: stats.pending }) : null },
  ];

  const statCards = [
    { title: t('dashboard.statMyVehicles'), value: stats?.vehicles ?? 0, icon: <Car size={18} />, note: t('dashboard.noteRegistered'), palette: C[1] },
    { title: t('dashboard.statTotalFines'), value: stats?.total_fines ?? 0, icon: <FileText size={18} />, note: t('dashboard.noteAllTime'), palette: C[6] },
    { title: t('dashboard.statOutstanding'), value: stats?.pending ?? 0, icon: <Clock size={18} />, note: t('dashboard.noteNeedPayment'), palette: C[5] },
    { title: t('dashboard.statAmountOwed'), value: formatAppCurrency(locale, stats?.owed ?? 0), icon: <AlertTriangle size={18} />, note: t('dashboard.noteUsdTotal'), palette: C[4] },
  ];

  if (loading) {
    return (
      <div className="dashboard-home space-y-5">
        <div className="h-1.5 rounded-full animate-pulse" style={{ background: 'rgba(37,99,235,0.12)' }} />
        <div className="h-[120px] rounded-3xl animate-pulse" style={{ background: 'rgba(37,99,235,0.07)' }} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[110px] rounded-2xl animate-pulse" style={{ background: 'rgba(37,99,235,0.07)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (loadError && !stats) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm" style={{ border: '1px solid rgba(37,99,235,0.1)' }}>
        <p className="text-slate-700 font-semibold mb-2">{t('dashboard.loadErrorTitle')}</p>
        <p className="text-sm text-slate-500 mb-4">{t('dashboard.loadErrorHint')}</p>
        <button
          type="button"
          onClick={loadStats}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
          style={{ background: C[1].grad }}
        >
          <RefreshCw size={16} /> {t('dashboard.retry')}
        </button>
      </div>
    );
  }

  const firstName = user?.full_name.split(' ')[0] ?? '';

  return (
    <div className="dashboard-home space-y-5">
      <div
        className="user-dashboard-hero dashboard-welcome--hero relative overflow-hidden rounded-3xl p-6 lg:p-7"
        style={{
          background: 'linear-gradient(135deg, #0B1220 0%, #1E1B4B 42%, #134E4A 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {C.slice(0, 5).map((c, i) => (
          <div
            key={c.name}
            className="user-dashboard-hero__orb"
            style={{
              background: `radial-gradient(circle, ${c.solid}55 0%, transparent 70%)`,
              top: i % 2 === 0 ? '-18%' : 'auto',
              bottom: i % 2 === 1 ? '-22%' : 'auto',
              left: `${6 + i * 14}%`,
              width: `${100 + i * 24}px`,
              height: `${100 + i * 24}px`,
            }}
          />
        ))}
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <WelcomeProfileAvatar role="driver" variant="welcome" />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C[2].grad }}>
                  <Sparkles size={14} className="text-white" />
                </div>
                <span className="dashboard-welcome__eyebrow">{t('dashboard.driverPortal')}</span>
              </div>
              <h1 className="dashboard-welcome__title">
                {t(greetingKey(now.getHours()))}, {firstName}!
              </h1>
              <p className="dashboard-welcome__meta mt-1">
                {formatAppDate(locale, now)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {(stats?.owed ?? 0) > 0 ? (
              <div
                className="user-dashboard-balance flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ borderTop: `3px solid ${C[5].solid}` }}
              >
                <AlertTriangle size={18} style={{ color: '#fda4af' }} />
                <div>
                  <p className="user-dashboard-balance__label text-[11px] uppercase tracking-wide">{t('dashboard.outstandingBalance')}</p>
                  <p className="user-dashboard-balance__amount text-lg">{formatAppCurrency(locale, stats?.owed ?? 0)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/fines')}
                  className="px-3 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1 ml-1"
                  style={{ background: C[5].grad, boxShadow: `0 8px 20px ${C[5].soft}` }}
                >
                  {t('dashboard.payNow')} <ArrowRight size={12} />
                </button>
              </div>
            ) : (
              <div
                className="px-4 py-3 rounded-2xl text-center min-w-[8rem]"
                style={{ borderTop: `3px solid ${C[3].solid}`, background: 'rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: C[3].solid, boxShadow: `0 0 8px ${C[3].solid}` }} />
                  <span className="dashboard-welcome__status-label">{t('dashboard.driveSafe')}</span>
                </div>
                <p className="dashboard-welcome__status-value" style={{ color: C[3].solid }}>{t('users.active')}</p>
              </div>
            )}
            <div
              className="px-4 py-3 rounded-2xl text-center min-w-[7rem] hidden sm:block"
              style={{ borderTop: `3px solid ${C[0].solid}`, background: 'rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Zap size={12} style={{ color: C[0].solid }} />
                <span className="dashboard-welcome__status-label">AI</span>
              </div>
              <p className="dashboard-welcome__status-value">{t('dashboard.qaAiBadge')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <KpiCard key={s.title} {...s} />
        ))}
      </div>

      <div className="user-dashboard-section">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="dashboard-section__title">{t('dashboard.quickActions')}</h2>
          <span className="dashboard-section__subtitle">{t('dashboard.quickActionsHint')}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => navigate(a.path)}
              className="user-dashboard-action text-left rounded-2xl p-5 relative overflow-hidden min-h-[168px] flex flex-col justify-end"
              style={{ background: a.palette.grad, boxShadow: `0 10px 28px ${a.palette.soft}` }}
            >
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8"
                style={{ background: 'rgba(255,255,255,0.12)' }} />
              {a.badge && (
                <span className="user-dashboard-action__badge">{a.badge}</span>
              )}
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center mb-3 relative z-[1] border border-white/25 text-white">
                {a.icon}
              </div>
              <p className="user-dashboard-action__title">{a.label}</p>
              <p className="user-dashboard-action__desc mt-1 line-clamp-2">{a.desc}</p>
              <span className="user-dashboard-action__link">
                {t('dashboard.open')} <ArrowRight size={12} />
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <PanelCard
          title={t('dashboard.recentFines')}
          accent={C[5].solid}
          icon={<FileText size={16} />}
          action={(
            <button
              type="button"
              onClick={() => navigate('/dashboard/fines')}
              className="user-dashboard-panel__link text-[13px] flex items-center gap-1 flex-shrink-0"
            >
              {t('dashboard.viewAll')} <ArrowRight size={12} />
            </button>
          )}
        >
          {!stats?.recent_fines?.length ? (
            <div className="text-center py-10 rounded-xl" style={{ background: C[3].soft, border: `1px dashed ${C[3].solid}44` }}>
              <CheckCircle size={32} className="mx-auto mb-2.5" style={{ color: C[3].solid }} />
              <p className="text-sm font-semibold" style={{ color: '#334155' }}>{t('dashboard.noRecentFines')}</p>
              <p className="text-sm mt-1" style={{ color: '#64748b' }}>{t('dashboard.driveSafe')}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.recent_fines.map((f) => {
                const badge = STATUS_BADGE[f.status] || STATUS_BADGE.dismissed;
                return (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer"
                    style={{ background: '#F8FAFC', borderLeft: `3px solid ${badge.accent}` }}
                    onClick={() => navigate('/dashboard/fines')}
                    onKeyDown={(e) => e.key === 'Enter' && navigate('/dashboard/fines')}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: badge.bg, color: badge.color }}>
                      <FileText size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="user-dashboard-list-item__title truncate">{f.reason}</p>
                      <p className="user-dashboard-list-item__meta mt-0.5">{new Date(f.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <span className="user-dashboard-list-item__amount">{formatAppCurrency(locale, f.amount)}</span>
                      <span className="user-dashboard-status-pill px-2 py-0.5 rounded-full"
                        style={{ background: badge.bg, color: badge.color }}>
                        {t(`fines.status.${f.status}`)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PanelCard>

        <PanelCard
          title={t('dashboard.recentDetections')}
          accent={C[0].solid}
          icon={<Camera size={16} />}
          action={(
            <button
              type="button"
              onClick={() => navigate('/dashboard/ai-detection')}
              className="user-dashboard-panel__link text-[13px] flex items-center gap-1 flex-shrink-0"
              style={{ color: C[0].dark }}
            >
              {t('dashboard.detect')} <ArrowRight size={12} />
            </button>
          )}
        >
          {!stats?.recent_detections?.length ? (
            <div className="text-center py-10 rounded-xl" style={{ background: C[0].soft, border: `1px dashed ${C[0].solid}44` }}>
              <Camera size={32} className="mx-auto mb-2.5" style={{ color: C[0].solid }} />
              <p className="text-sm font-semibold" style={{ color: '#334155' }}>{t('dashboard.noDetectionsYet')}</p>
              <button
                type="button"
                onClick={() => navigate('/dashboard/ai-detection')}
                className="mt-3 px-4 py-2 rounded-xl text-white text-xs font-semibold"
                style={{ background: C[0].grad }}
              >
                {t('dashboard.tryAiDetection')}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.recent_detections.map((d, i) => {
                const tone = C[i % C.length];
                return (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all"
                    style={{ background: tone.soft, border: `1px solid ${tone.solid}22` }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${tone.solid}22`, color: tone.dark }}>
                      <Camera size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="user-dashboard-list-item__title truncate">{d.detected_sign}</p>
                      <p className="user-dashboard-list-item__meta mt-0.5">{new Date(d.created_at).toLocaleDateString()}</p>
                    </div>
                    <span
                      className="user-dashboard-confidence flex-shrink-0"
                      style={{ background: tone.soft, color: tone.dark, borderColor: `${tone.solid}44` }}
                    >
                      {d.confidence.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </PanelCard>
      </div>
    </div>
  );
}
