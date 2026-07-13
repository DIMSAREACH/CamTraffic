import { useState, useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@camtraffic/query';
import { useNavigate } from 'react-router';
import {
  FileText, Clock, Search, Plus, MapPin, Shield, TrendingUp, AlertCircle, Car,
  RefreshCw, ArrowRight, Camera, ScanSearch,
} from 'lucide-react';
import { RielIcon } from '@shared/components/RielIcon';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppDate, formatAppCurrency, khrToUsd } from '@shared/i18n/localeFormat';
import { WelcomeProfileAvatar } from '@shared/components/WelcomeProfileAvatar';
import { finesAPI } from '@shared/services/api';
import { usePoliceDashboardStats } from '@shared/hooks/queries/useDashboardQueries';
import { EMPTY_POLICE_STATS } from '@shared/constants/emptyDashboard';
import { DASHBOARD_PALETTE } from '@shared/constants/chartPalette';
import { USER_PORTAL_ROUTES } from '@shared/constants/portalRoutes';
import { toast } from 'sonner';
import type { Fine, User, Vehicle } from '@shared/types';

const C = DASHBOARD_PALETTE;

const STATUS_BADGE: Record<string, { bg: string; color: string; accent: string }> = {
  pending: { bg: C[4].soft, color: C[4].dark, accent: C[4].solid },
  paid: { bg: C[3].soft, color: C[3].dark, accent: C[3].solid },
  overdue: { bg: C[5].soft, color: C[5].dark, accent: C[5].solid },
  dismissed: { bg: 'rgba(100,116,139,0.12)', color: '#475569', accent: '#64748B' },
};

const VIOLATION_REASONS = [
  { key: 'runningRedLight', value: 'Running Red Light' },
  { key: 'speeding', value: 'Speeding (above limit)' },
  { key: 'noHelmet', value: 'No Helmet (Motorcycle)' },
  { key: 'noSeatbelt', value: 'No Seatbelt' },
  { key: 'illegalParking', value: 'Illegal Parking' },
  { key: 'wrongWay', value: 'Wrong Way on One-Way Street' },
  { key: 'mobilePhone', value: 'Using Mobile Phone While Driving' },
  { key: 'failureToStop', value: 'Failure to Stop at Stop Sign' },
  { key: 'noValidLicense', value: 'No Valid License' },
  { key: 'recklessDriving', value: 'Reckless Driving' },
  { key: 'speedingSchoolZone', value: 'Speeding in School Zone' },
  { key: 'noRegistration', value: 'No Vehicle Registration' },
] as const;

const REASON_VALUE_TO_KEY = Object.fromEntries(
  VIOLATION_REASONS.map((reason) => [reason.value, reason.key]),
) as Record<string, typeof VIOLATION_REASONS[number]['key']>;

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
          <p className="dashboard-kpi__sub mt-1 opacity-80">{note}</p>
        </div>
        <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm border border-white/20">
          {icon}
        </div>
      </div>
    </div>
  );
}

function PanelCard({ title, subtitle, accent, icon, action, children }: {
  title: string; subtitle?: string; accent: string; icon: ReactNode;
  action?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="user-dashboard-panel h-full">
      <div className="user-dashboard-panel__bar" style={{ background: accent }} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ background: `${accent}18`, color: accent }}>
              {icon}
            </div>
            <div className="min-w-0">
              <h3 className="dashboard-section__title leading-tight">{title}</h3>
              {subtitle && <p className="dashboard-section__subtitle">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}

export function PoliceDashboard() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = usePoliceDashboardStats(user?.id);
  const stats = data ?? EMPTY_POLICE_STATS;
  const [searchLicense, setSearchLicense] = useState('');
  const [searchResult, setSearchResult] = useState<{ driver: User | null; fines: Fine[]; vehicles: Vehicle[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [issueFineOpen, setIssueFineOpen] = useState(false);
  const [fineForm, setFineForm] = useState({ driver_id: '' as string, vehicle_plate: '', reason: '', amount: '', location: '' });
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    if (isError) toast.error(t('dashboard.loadErrorTitle'));
  }, [isError, t]);

  const loading = isLoading && !data;

  const translateReason = (reason: string) => {
    const key = REASON_VALUE_TO_KEY[reason];
    if (key) return t(`fines.reasons.${key}`);
    return reason;
  };

  const handleSearch = async () => {
    if (!searchLicense.trim()) return;
    setSearching(true);
    try {
      const result = await finesAPI.searchByLicense(searchLicense.trim());
      setSearchResult(result);
      if (!result.driver) toast.error(t('fines.toastDriverNotFound'));
    } catch {
      toast.error(t('dashboard.toastSearchFailed'));
    } finally {
      setSearching(false);
    }
  };

  const handleIssueFine = async () => {
    if (!user || !fineForm.driver_id || !fineForm.reason || !fineForm.amount) {
      toast.error(t('fines.toastFillRequired')); return;
    }
    setIssuing(true);
    try {
      await finesAPI.create({ ...fineForm, amount: khrToUsd(parseFloat(fineForm.amount)), police_id: user.id });
      toast.success(t('fines.toastIssued'));
      setIssueFineOpen(false);
      setFineForm({ driver_id: '', vehicle_plate: '', reason: '', amount: '', location: '' });
      setSearchResult(null);
      if (user) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.police(user.id) });
      }
    } catch {
      toast.error(t('fines.toastIssueFail'));
    } finally {
      setIssuing(false);
    }
  };

  const statusLabel = (status: string) => t(`fines.status.${status}` as 'fines.status.pending');

  const openIssueFine = (driver: User) => {
    setFineForm(f => ({ ...f, driver_id: driver.id }));
    setIssueFineOpen(true);
  };

  const kpiCards = [
    { title: t('dashboard.policeTotalIssued'), value: stats?.total_issued ?? 0, note: t('dashboard.policeNoteTotalIssued'), icon: <FileText size={18} />, palette: C[1] },
    { title: t('dashboard.policeTodayFines'), value: stats?.today_issued ?? 0, note: t('dashboard.policeNoteToday'), icon: <TrendingUp size={18} />, palette: C[5] },
    { title: t('dashboard.policePending'), value: stats?.pending ?? 0, note: t('dashboard.policeNotePending'), icon: <Clock size={18} />, palette: C[4] },
    { title: t('dashboard.revenue'), value: formatAppCurrency(locale, stats?.revenue ?? 0), note: t('dashboard.policeNoteRevenue'), icon: <RielIcon size={18} />, palette: C[2] },
  ];

  const quickActions = [
    {
      label: t('dashboard.qaPoliceIssueFine'),
      desc: t('dashboard.qaPoliceIssueFineDesc'),
      icon: <Plus size={22} />,
      palette: C[0],
      badge: null as string | null,
      onClick: () => setIssueFineOpen(true),
    },
    {
      label: t('dashboard.qaPoliceFines'),
      desc: t('dashboard.qaPoliceFinesDesc'),
      icon: <FileText size={22} />,
      palette: C[1],
      badge: stats?.pending ? t('dashboard.pendingBadge', { count: stats.pending }) : null,
      onClick: () => navigate(USER_PORTAL_ROUTES.fines),
    },
    {
      label: t('sidebar.nav.aiDetection'),
      desc: t('aiDetection.heroTitle'),
      icon: <Camera size={22} />,
      palette: C[3],
      badge: null,
      onClick: () => navigate(USER_PORTAL_ROUTES.aiDetection),
    },
    {
      label: t('dashboard.qaPoliceAiLogs'),
      desc: t('dashboard.qaPoliceAiLogsDesc'),
      icon: <Camera size={22} />,
      palette: C[6],
      badge: null,
      onClick: () => navigate(USER_PORTAL_ROUTES.aiLogs),
    },
    {
      label: t('dashboard.qaPoliceUnknown'),
      desc: t('dashboard.qaPoliceUnknownDesc'),
      icon: <ScanSearch size={22} />,
      palette: C[8],
      badge: null,
      onClick: () => navigate(USER_PORTAL_ROUTES.unknownVehicles),
    },
  ];

  if (loading) {
    return (
      <div className="dashboard-home space-y-5">
        <div className="h-1.5 rounded-full animate-pulse" style={{ background: 'rgba(239,68,68,0.12)' }} />
        <div className="h-[120px] rounded-3xl animate-pulse" style={{ background: 'rgba(239,68,68,0.07)' }} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[110px] rounded-2xl animate-pulse" style={{ background: 'rgba(239,68,68,0.07)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm" style={{ border: '1px solid rgba(239,68,68,0.12)' }}>
        <p className="text-slate-700 font-semibold mb-2">{t('dashboard.loadErrorTitle')}</p>
        <p className="text-sm text-slate-500 mb-4">{t('dashboard.loadErrorHint')}</p>
        <button
          type="button"
          onClick={() => { void refetch(); }}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
          style={{ background: C[0].grad }}
        >
          <RefreshCw size={16} /> {t('dashboard.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-home space-y-5">
      <div
        className="user-dashboard-hero dashboard-welcome--hero relative overflow-hidden rounded-3xl p-6 lg:p-7"
        style={{
          background: 'linear-gradient(135deg, #0B1220 0%, #1E1B4B 42%, #134E4A 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {C.slice(0, 4).map((c, i) => (
          <div
            key={c.name}
            className="user-dashboard-hero__orb"
            style={{
              background: `radial-gradient(circle, ${c.solid}60 0%, transparent 72%)`,
              top: `${6 + i * 20}%`,
              left: `${-4 + i * 3}%`,
              width: `${100 + i * 28}px`,
              height: `${100 + i * 28}px`,
            }}
          />
        ))}
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <WelcomeProfileAvatar role="police" variant="welcome" />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C[0].grad }}>
                  <Shield size={14} className="text-white" />
                </div>
                <span className="dashboard-welcome__eyebrow" style={{ color: C[0].solid }}>{t('dashboard.policePortal')}</span>
              </div>
              <h1 className="dashboard-welcome__title text-white">
                {t('dashboard.policeTitle')}
              </h1>
              <p className="dashboard-welcome__meta mt-1">
                {t('dashboard.policeWelcome', { name: user?.full_name ?? '' })} — {formatAppDate(locale, new Date())}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div
              className="px-4 py-3 rounded-2xl text-center min-w-[7rem]"
              style={{ borderTop: `3px solid ${C[1].solid}`, background: 'rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <TrendingUp size={12} style={{ color: C[1].solid }} />
                <span className="dashboard-welcome__status-label">{t('dashboard.policeTodayFines')}</span>
              </div>
              <p className="dashboard-welcome__status-value" style={{ color: C[1].solid }}>{stats?.today_issued ?? 0}</p>
            </div>
            <div
              className="px-4 py-3 rounded-2xl text-center min-w-[7rem]"
              style={{ borderTop: `3px solid ${C[4].solid}`, background: 'rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Clock size={12} style={{ color: C[4].solid }} />
                <span className="dashboard-welcome__status-label">{t('dashboard.policePending')}</span>
              </div>
              <p className="dashboard-welcome__status-value" style={{ color: C[4].solid }}>{stats?.pending ?? 0}</p>
            </div>
            <div
              className="px-4 py-3 rounded-2xl text-center min-w-[7rem] hidden sm:block"
              style={{ borderTop: `3px solid ${C[3].solid}`, background: 'rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: C[3].solid, boxShadow: `0 0 8px ${C[3].solid}` }} />
                <span className="dashboard-welcome__status-label">{t('dashboard.policeOnDuty')}</span>
              </div>
              <p className="dashboard-welcome__status-value" style={{ color: C[3].solid }}>{t('dashboard.policeActiveShift')}</p>
            </div>
            <button
              type="button"
              onClick={() => setIssueFineOpen(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl text-white text-sm font-semibold transition-all active:scale-[0.98] self-center"
              style={{ background: C[1].grad, boxShadow: `0 8px 24px ${C[1].soft}` }}
            >
              <Plus size={16} /> {t('dashboard.issueFine')}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((k) => (
          <KpiCard key={k.title} {...k} />
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
              onClick={a.onClick}
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
          title={t('dashboard.licenseLookupTitle')}
          subtitle={t('dashboard.licenseLookupSubtitle')}
          accent={C[1].solid}
          icon={<Search size={16} />}
        >
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <input
                value={searchLicense}
                onChange={e => setSearchLicense(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={t('fines.licensePlaceholder')}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 text-sm text-slate-700 outline-none transition-all"
                style={{ border: `1.5px solid ${C[1].solid}22` }}
                onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = C[1].solid; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 3px ${C[1].soft}`; }}
                onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = `${C[1].solid}22`; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-60"
              style={{ background: C[1].grad, boxShadow: `0 4px 12px ${C[1].soft}`, minWidth: 100 }}
            >
              {searching
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <><Search size={14} /><span>{t('common.search')}</span></>
              }
            </button>
          </div>

          {searchResult?.driver && (
            <div className="rounded-xl p-4" style={{ background: C[2].soft, border: `1.5px solid ${C[2].solid}33` }}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-md flex-shrink-0"
                    style={{ background: C[1].grad }}>
                    {searchResult.driver.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-[15px]">{searchResult.driver.full_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">{searchResult.driver.license_no} · {searchResult.driver.phone}</p>
                    <div className="flex gap-3 text-[12px] mt-2">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold" style={{ background: C[1].soft, color: C[1].dark }}>
                        <Car size={11} /> {t('dashboard.vehicleCount', { count: searchResult.vehicles.length })}
                      </span>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold" style={{ background: C[5].soft, color: C[5].dark }}>
                        <AlertCircle size={11} /> {t('dashboard.outstandingCount', { count: searchResult.fines.filter(f => f.status !== 'paid' && f.status !== 'dismissed').length })}
                      </span>
                    </div>
                    {searchResult.vehicles.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {searchResult.vehicles.map(v => (
                          <span key={v.id} className="text-[11px] px-2.5 py-1 rounded-lg text-slate-700 font-mono font-semibold"
                            style={{ background: '#fff', border: `1px solid ${C[1].solid}22`, boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
                            {v.plate_number} — {v.model}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openIssueFine(searchResult.driver!)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-sm font-semibold"
                  style={{ background: C[5].grad, boxShadow: `0 4px 12px ${C[5].soft}` }}
                >
                  <Plus size={15} /> {t('dashboard.issueFine')}
                </button>
              </div>
            </div>
          )}

          {searchResult && !searchResult.driver && (
            <div className="text-center py-6 rounded-xl" style={{ background: '#FAFBFF', border: `1px dashed ${C[1].solid}33` }}>
              <Search size={28} className="mx-auto mb-2" style={{ color: `${C[1].solid}44` }} />
              <p className="text-slate-400 text-sm">{t('dashboard.noDriverForLicense', { license: searchLicense })}</p>
            </div>
          )}
        </PanelCard>

        <PanelCard
          title={t('dashboard.recentFinesIssued')}
          subtitle={t('dashboard.recentFinesSubtitle')}
          accent={C[6].solid}
          icon={<FileText size={16} />}
          action={stats?.recent && stats.recent.length > 0 ? (
            <button
              type="button"
              onClick={() => navigate(USER_PORTAL_ROUTES.fines)}
              className="user-dashboard-panel__link flex items-center gap-1 flex-shrink-0"
            >
              {t('dashboard.viewAll')} <ArrowRight size={12} />
            </button>
          ) : undefined}
        >
          {!stats?.recent?.length ? (
            <div className="text-center py-12 rounded-xl" style={{ background: '#FAFBFF', border: '1px dashed rgba(37,99,235,0.1)' }}>
              <Shield size={36} className="mx-auto mb-3" style={{ color: 'rgba(37,99,235,0.2)' }} />
              <p className="text-slate-400 text-sm font-medium">{t('dashboard.noFinesIssuedYet')}</p>
              <p className="text-slate-300 text-xs mt-1">{t('dashboard.noFinesIssuedHint')}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.recent.map(f => {
                const badge = STATUS_BADGE[f.status] || STATUS_BADGE.dismissed;
                return (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 p-3.5 rounded-xl transition-all cursor-pointer"
                    style={{ background: '#F8FAFC', borderLeft: `3px solid ${badge.accent}` }}
                    onClick={() => navigate(USER_PORTAL_ROUTES.fines)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(USER_PORTAL_ROUTES.fines)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: badge.bg, color: badge.color }}>
                      <FileText size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="user-dashboard-list-item__title">{f.driver_name}</p>
                      <p className="user-dashboard-list-item__meta truncate">{translateReason(f.reason)}</p>
                      <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                        <MapPin size={10} />{f.location}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 ml-2 flex-shrink-0">
                      <span className="user-dashboard-list-item__amount">{formatAppCurrency(locale, f.amount)}</span>
                      <span className="user-dashboard-status-pill px-2 py-0.5 rounded-full"
                        style={{ background: badge.bg, color: badge.color }}>
                        {statusLabel(f.status)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PanelCard>
      </div>

      <Dialog open={issueFineOpen} onOpenChange={setIssueFineOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C[1].grad }}>
                <FileText size={15} className="text-white" />
              </div>
              {t('fines.issueNewFine')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{t('fines.driverLicense')} *</Label>
              <div className="flex gap-2 mt-1">
                <Input placeholder={t('fines.licensePlaceholder')} value={searchLicense} onChange={e => setSearchLicense(e.target.value)} className="flex-1" />
                <Button size="sm" variant="outline" onClick={async () => {
                  if (!searchLicense.trim()) return;
                  const r = await finesAPI.searchByLicense(searchLicense.trim());
                  if (r.driver) {
                    setFineForm(f => ({ ...f, driver_id: r.driver!.id }));
                    setSearchResult(r);
                    toast.success(`${t('fines.lookup')}: ${r.driver.full_name}`);
                  } else toast.error(t('fines.toastDriverNotFound'));
                }}>{t('fines.lookup')}</Button>
              </div>
              {searchResult?.driver && <p className="text-xs mt-1 font-semibold" style={{ color: '#059669' }}>✓ {searchResult.driver.full_name}</p>}
            </div>
            <div>
              <Label>{t('fines.vehiclePlateLabel')}</Label>
              <Input className="mt-1" placeholder={t('fines.platePlaceholder')} value={fineForm.vehicle_plate} onChange={e => setFineForm(f => ({ ...f, vehicle_plate: e.target.value }))} />
            </div>
            <div>
              <Label>{t('fines.violationLabel')} *</Label>
              <Select onValueChange={v => setFineForm(f => ({ ...f, reason: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={t('fines.selectViolation')} /></SelectTrigger>
                <SelectContent>
                  {VIOLATION_REASONS.map(r => (
                    <SelectItem key={r.key} value={r.value}>{t(`fines.reasons.${r.key}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('fines.amountLabel')} *</Label>
              <Input className="mt-1" type="number" min="0" step="100" placeholder={t('fines.amountPlaceholder')} value={fineForm.amount} onChange={e => setFineForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <Label>{t('fines.locationLabel')} *</Label>
              <Input className="mt-1" placeholder={t('fines.locationPlaceholder')} value={fineForm.location} onChange={e => setFineForm(f => ({ ...f, location: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueFineOpen(false)}>{t('fines.cancel')}</Button>
            <button
              onClick={handleIssueFine} disabled={issuing}
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-60"
              style={{ background: C[1].grad, boxShadow: `0 4px 12px ${C[1].soft}` }}
            >
              {issuing ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />{t('fines.issuing')}</> : <><Plus size={14} />{t('fines.issueFine')}</>}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
