import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@camtraffic/query';
import { useNavigate } from 'react-router';
import {
  FileText, Clock, Search, Plus, MapPin, Shield, TrendingUp, AlertCircle, Car,
  RefreshCw, ArrowRight, ScanSearch, Brain, Cctv,
} from 'lucide-react';
import { RielIcon } from '@shared/components/RielIcon';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppDate, formatAppCurrency, greetingKey, khrToUsd } from '@shared/i18n/localeFormat';
import { WelcomeProfileAvatar } from '@shared/components/WelcomeProfileAvatar';
import { finesAPI } from '@shared/services/api';
import { usePoliceDashboardStats, useCameraLiveStatus } from '@shared/hooks/queries/useDashboardQueries';
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

export function PoliceDashboard() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const now = new Date();
  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = usePoliceDashboardStats(user?.id);
  const { data: cameraLive } = useCameraLiveStatus();
  const stats = data ?? EMPTY_POLICE_STATS;
  const cameraSummary = cameraLive?.summary ?? { active: 0, offline: 0, total: 0 };

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
    setFineForm((f) => ({ ...f, driver_id: driver.id }));
    setIssueFineOpen(true);
  };

  const statCards = [
    { tone: 'blue', icon: FileText, value: String(stats.total_issued), label: t('dashboard.policeTotalIssued') },
    { tone: 'amber', icon: TrendingUp, value: String(stats.today_issued), label: t('dashboard.policeTodayFines') },
    { tone: 'rose', icon: Clock, value: String(stats.pending), label: t('dashboard.policePending') },
    { tone: 'teal', icon: RielIcon, value: formatAppCurrency(locale, stats.revenue), label: t('dashboard.revenue') },
  ];

  const quickActions = [
    {
      label: t('dashboard.qaPoliceIssueFine'),
      desc: t('dashboard.qaPoliceIssueFineDesc'),
      icon: Plus,
      tone: C[1],
      badge: null as string | null,
      onClick: () => setIssueFineOpen(true),
    },
    {
      label: t('dashboard.qaPoliceFines'),
      desc: t('dashboard.qaPoliceFinesDesc'),
      icon: FileText,
      tone: C[5],
      badge: stats.pending ? t('dashboard.pendingBadge', { count: stats.pending }) : null,
      onClick: () => navigate(USER_PORTAL_ROUTES.fines),
    },
    {
      label: t('sidebar.nav.aiDetection'),
      desc: t('aiCenter.heroTitle'),
      icon: Brain,
      tone: C[0],
      badge: null,
      onClick: () => navigate(USER_PORTAL_ROUTES.aiDetectionNew),
    },
    {
      label: t('dashboard.liveCameras'),
      desc: cameraSummary.total > 0
        ? t('dashboard.liveCamerasSub', { offline: cameraSummary.offline })
        : t('dashboard.liveCamerasEmpty'),
      icon: Cctv,
      tone: C[2],
      badge: cameraSummary.total > 0 ? `${cameraSummary.active}/${cameraSummary.total}` : null,
      onClick: () => navigate(USER_PORTAL_ROUTES.cameras),
    },
  ];

  if (loading) {
    return (
      <div className="enforcement-page enforcement-page--police-dashboard police-dashboard-page admin-dashboard-page space-y-4">
        <div className="h-[120px] rounded-2xl animate-pulse" style={{ background: 'rgba(37,99,235,0.07)' }} />
        <div className="enforcement-page__stat-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[88px] rounded-2xl animate-pulse bg-white/60 dark:bg-slate-800/40" />
          ))}
        </div>
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div className="enforcement-page enforcement-page--police-dashboard police-dashboard-page admin-dashboard-page">
        <div className="enforcement-page__panel p-8 text-center space-y-4">
          <p className="font-semibold text-slate-800 dark:text-slate-100">{t('dashboard.loadErrorTitle')}</p>
          <p className="text-sm text-slate-500">{t('dashboard.loadErrorHint')}</p>
          <Button type="button" onClick={() => { void refetch(); }} disabled={isFetching} className="gap-2">
            <RefreshCw size={16} /> {t('dashboard.retry')}
          </Button>
        </div>
      </div>
    );
  }

  const firstName = user?.full_name.split(' ')[0] ?? '';

  return (
    <div className="enforcement-page enforcement-page--police-dashboard police-dashboard-page admin-dashboard-page">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner police-dashboard-hero__inner">
          <div className="flex items-start gap-4 min-w-0">
            <WelcomeProfileAvatar role="police" variant="welcome" />
            <div className="min-w-0">
              <div className="enforcement-page__eyebrow">
                <span className="enforcement-page__eyebrow-icon">
                  <Shield size={14} />
                </span>
                {t('dashboard.policePortal')}
              </div>
              <h1 className="enforcement-page__title">
                {t(greetingKey(now.getHours()))}, {firstName}
              </h1>
              <p className="enforcement-page__subtitle police-dashboard-hero__subtitle">
                {t('dashboard.policeWelcome', { name: user?.full_name ?? '' })} · {formatAppDate(locale, now)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => { void refetch(); }}
              disabled={isFetching}
              className="enforcement-page__hero-btn enforcement-page__hero-btn--outline"
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
              {t('dashboard.refreshData')}
            </button>
            <button
              type="button"
              onClick={() => setIssueFineOpen(true)}
              className="enforcement-page__hero-btn"
            >
              <Plus size={15} /> {t('dashboard.issueFine')}
            </button>
          </div>
        </div>
      </div>

      <div className="enforcement-page__stat-grid mb-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`enforcement-page__stat-card enforcement-page__stat-card--${card.tone}`}>
              <div className={`enforcement-page__stat-icon enforcement-page__stat-icon--${card.tone}`}>
                <Icon size={18} />
              </div>
              <div className="enforcement-page__stat-copy">
                <p className="enforcement-page__stat-value">{card.value}</p>
                <p className={`enforcement-page__stat-label enforcement-page__stat-label--${card.tone}`}>
                  {card.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="enforcement-page__panel police-dashboard-quick-panel mb-4">
        <div className="police-dashboard-quick-panel__head">
          <h2 className="dashboard-section__title">{t('dashboard.quickActions')}</h2>
          <p className="dashboard-section__subtitle">{t('dashboard.quickActionsHint')}</p>
        </div>
        <div className="police-dashboard-quick-grid">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="police-dashboard-quick-card"
              >
                <div
                  className="police-dashboard-quick-card__icon"
                  style={{ background: `${action.tone.solid}14`, color: action.tone.solid, borderColor: `${action.tone.solid}28` }}
                >
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="police-dashboard-quick-card__title">{action.label}</p>
                    {action.badge && (
                      <span className="police-dashboard-quick-card__badge">{action.badge}</span>
                    )}
                  </div>
                  <p className="police-dashboard-quick-card__desc">{action.desc}</p>
                </div>
                <ArrowRight size={16} className="police-dashboard-quick-card__arrow shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="enforcement-page__panel police-dashboard-panel">
          <div className="police-dashboard-panel__head">
            <div className="enforcement-page__eyebrow police-dashboard-panel__eyebrow">
              <span className="enforcement-page__eyebrow-icon">
                <Search size={14} />
              </span>
              {t('dashboard.licenseLookupTitle')}
            </div>
            <p className="police-dashboard-panel__subtitle">{t('dashboard.licenseLookupSubtitle')}</p>
          </div>

          <div className="enforcement-page__toolbar police-dashboard-toolbar">
            <div className="enforcement-page__search-wrap flex-1">
              <Search size={14} className="enforcement-page__search-icon" />
              <input
                value={searchLicense}
                onChange={(e) => setSearchLicense(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={t('fines.licensePlaceholder')}
                className="enforcement-page__search"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="enforcement-page__hero-btn shrink-0"
            >
              {searching
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <><Search size={14} />{t('common.search')}</>
              }
            </button>
          </div>

          {searchResult?.driver && (
            <div className="police-dashboard-lookup-result">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-md flex-shrink-0"
                    style={{ background: C[1].grad }}
                  >
                    {searchResult.driver.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="enforcement-page__cell-primary">{searchResult.driver.full_name}</p>
                    <p className="enforcement-page__cell-mono mt-0.5">
                      {searchResult.driver.license_no} · {searchResult.driver.phone}
                    </p>
                    <div className="flex gap-2 flex-wrap mt-2">
                      <span className="enforcement-page__code-pill">
                        <Car size={11} className="inline mr-1" />
                        {t('dashboard.vehicleCount', { count: searchResult.vehicles.length })}
                      </span>
                      <span className="enforcement-page__code-pill enforcement-page__code-pill--action">
                        <AlertCircle size={11} className="inline mr-1" />
                        {t('dashboard.outstandingCount', {
                          count: searchResult.fines.filter((f) => f.status !== 'paid' && f.status !== 'dismissed').length,
                        })}
                      </span>
                    </div>
                    {searchResult.vehicles.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {searchResult.vehicles.map((v) => (
                          <span key={v.id} className="enforcement-page__code-pill">
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
                  className="enforcement-page__hero-btn"
                >
                  <Plus size={15} /> {t('dashboard.issueFine')}
                </button>
              </div>
            </div>
          )}

          {searchResult && !searchResult.driver && (
            <div className="police-dashboard-empty">
              <Search size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm text-slate-500">{t('dashboard.noDriverForLicense', { license: searchLicense })}</p>
            </div>
          )}

          {!searchResult && (
            <div className="police-dashboard-empty">
              <ScanSearch size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm text-slate-500">{t('dashboard.licenseLookupSubtitle')}</p>
            </div>
          )}
        </div>

        <div className="enforcement-page__panel police-dashboard-panel">
          <div className="police-dashboard-panel__head flex items-start justify-between gap-3">
            <div>
              <div className="enforcement-page__eyebrow police-dashboard-panel__eyebrow">
                <span className="enforcement-page__eyebrow-icon">
                  <FileText size={14} />
                </span>
                {t('dashboard.recentFinesIssued')}
              </div>
              <p className="police-dashboard-panel__subtitle">{t('dashboard.recentFinesSubtitle')}</p>
            </div>
            {stats.recent.length > 0 && (
              <button
                type="button"
                onClick={() => navigate(USER_PORTAL_ROUTES.fines)}
                className="police-dashboard-panel__link"
              >
                {t('dashboard.viewAll')} <ArrowRight size={12} />
              </button>
            )}
          </div>

          {!stats.recent.length ? (
            <div className="police-dashboard-empty">
              <Shield size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium text-slate-500">{t('dashboard.noFinesIssuedYet')}</p>
              <p className="text-xs text-slate-400 mt-1">{t('dashboard.noFinesIssuedHint')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.recent.map((f) => {
                const badge = STATUS_BADGE[f.status] || STATUS_BADGE.dismissed;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => navigate(USER_PORTAL_ROUTES.fines)}
                    className="police-dashboard-fine-row w-full text-left"
                    style={{ borderLeftColor: badge.accent }}
                  >
                    <div
                      className="police-dashboard-fine-row__icon"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      <FileText size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="enforcement-page__cell-primary">{f.driver_name}</p>
                      <p className="enforcement-page__cell-secondary truncate">{translateReason(f.reason)}</p>
                      <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                        <MapPin size={10} />{f.location}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="enforcement-page__amount">{formatAppCurrency(locale, f.amount)}</span>
                      <span
                        className="enforcement-page__badge text-[11px]"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        {statusLabel(f.status)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={issueFineOpen} onOpenChange={setIssueFineOpen}>
        <DialogContent className="max-w-md" accent="rose">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="enforcement-page__dialog-icon enforcement-page__dialog-icon--rose">
                <FileText size={15} />
              </div>
              <span className="enforcement-page__dialog-title">{t('fines.issueNewFine')}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="enforcement-page__form-label">{t('fines.driverLicense')} *</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder={t('fines.licensePlaceholder')}
                  value={searchLicense}
                  onChange={(e) => setSearchLicense(e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!searchLicense.trim()) return;
                    const r = await finesAPI.searchByLicense(searchLicense.trim());
                    if (r.driver) {
                      setFineForm((f) => ({ ...f, driver_id: r.driver!.id }));
                      setSearchResult(r);
                      toast.success(`${t('fines.lookup')}: ${r.driver.full_name}`);
                    } else toast.error(t('fines.toastDriverNotFound'));
                  }}
                >
                  {t('fines.lookup')}
                </Button>
              </div>
              {searchResult?.driver && (
                <p className="text-xs mt-1 font-semibold text-emerald-600">✓ {searchResult.driver.full_name}</p>
              )}
            </div>
            <div>
              <Label className="enforcement-page__form-label">{t('fines.vehiclePlateLabel')}</Label>
              <Input
                className="mt-1"
                placeholder={t('fines.platePlaceholder')}
                value={fineForm.vehicle_plate}
                onChange={(e) => setFineForm((f) => ({ ...f, vehicle_plate: e.target.value }))}
              />
            </div>
            <div>
              <Label className="enforcement-page__form-label">{t('fines.violationLabel')} *</Label>
              <Select onValueChange={(v) => setFineForm((f) => ({ ...f, reason: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={t('fines.selectViolation')} /></SelectTrigger>
                <SelectContent>
                  {VIOLATION_REASONS.map((r) => (
                    <SelectItem key={r.key} value={r.value}>{t(`fines.reasons.${r.key}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="enforcement-page__form-label">{t('fines.amountLabel')} *</Label>
              <Input
                className="mt-1"
                type="number"
                min="0"
                step="100"
                placeholder={t('fines.amountPlaceholder')}
                value={fineForm.amount}
                onChange={(e) => setFineForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <Label className="enforcement-page__form-label">{t('fines.locationLabel')} *</Label>
              <Input
                className="mt-1"
                placeholder={t('fines.locationPlaceholder')}
                value={fineForm.location}
                onChange={(e) => setFineForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueFineOpen(false)}>{t('fines.cancel')}</Button>
            <button
              type="button"
              onClick={handleIssueFine}
              disabled={issuing}
              className="enforcement-page__hero-btn disabled:opacity-60"
            >
              {issuing
                ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />{t('fines.issuing')}</>
                : <><Plus size={14} />{t('fines.issueFine')}</>
              }
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
