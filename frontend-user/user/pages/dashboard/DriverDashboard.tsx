import { useEffect } from 'react';
import {
  Car, FileText, AlertTriangle, CheckCircle, Clock, ArrowRight,
  RefreshCw, Scale, Shield, CreditCard, BookOpen,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppDate, greetingKey, formatAppCurrency } from '@shared/i18n/localeFormat';
import { WelcomeProfileAvatar } from '@shared/components/WelcomeProfileAvatar';
import { Button } from '@shared/components/ui/button';
import { useDriverDashboardStats } from '@shared/hooks/queries/useDashboardQueries';
import { EMPTY_DRIVER_STATS } from '@shared/constants/emptyDashboard';
import { DASHBOARD_PALETTE } from '@shared/constants/chartPalette';
import { USER_PORTAL_ROUTES } from '@shared/constants/portalRoutes';
import type { Fine } from '@shared/types';
import { toast } from 'sonner';

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

export function DriverDashboard() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const now = new Date();
  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useDriverDashboardStats(user?.id);
  const stats = data ?? EMPTY_DRIVER_STATS;

  useEffect(() => {
    if (isError) toast.error(t('dashboard.loadErrorTitle'));
  }, [isError, t]);

  const loading = isLoading && !data;

  const translateReason = (reason: string) => {
    const key = REASON_VALUE_TO_KEY[reason];
    if (key) return t(`fines.reasons.${key}`);
    return reason;
  };

  const statusLabel = (status: string) => t(`fines.status.${status}` as 'fines.status.pending');

  const statCards = [
    { tone: 'teal', icon: Car, value: String(stats?.vehicles ?? 0), label: t('dashboard.statMyVehicles') },
    { tone: 'blue', icon: FileText, value: String(stats?.total_fines ?? 0), label: t('dashboard.statTotalFines') },
    { tone: 'amber', icon: Clock, value: String(stats?.pending ?? 0), label: t('dashboard.statOutstanding') },
    { tone: 'rose', icon: AlertTriangle, value: formatAppCurrency(locale, stats?.owed ?? 0), label: t('dashboard.statAmountOwed') },
  ];

  const quickActions = [
    {
      label: t('dashboard.qaMyFines'),
      desc: t('dashboard.qaMyFinesDesc'),
      icon: FileText,
      tone: C[5],
      badge: stats?.pending ? t('dashboard.pendingBadge', { count: stats.pending }) : null,
      onClick: () => navigate(USER_PORTAL_ROUTES.fines),
    },
    {
      label: t('dashboard.qaMyVehicles'),
      desc: t('dashboard.qaMyVehiclesDesc'),
      icon: Car,
      tone: C[2],
      badge: null as string | null,
      onClick: () => navigate(USER_PORTAL_ROUTES.vehicles),
    },
    {
      label: t('dashboard.qaMyAppeals'),
      desc: t('dashboard.qaMyAppealsDesc'),
      icon: Scale,
      tone: C[1],
      badge: null,
      onClick: () => navigate(USER_PORTAL_ROUTES.appeals),
    },
    {
      label: t('sidebar.modules.trafficRules'),
      desc: t('trafficRules.subtitle'),
      icon: BookOpen,
      tone: C[6],
      badge: null,
      onClick: () => navigate(USER_PORTAL_ROUTES.trafficRules),
    },
  ];

  if (loading) {
    return (
      <div className="enforcement-page enforcement-page--driver-dashboard driver-dashboard-page admin-dashboard-page space-y-4">
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
      <div className="enforcement-page enforcement-page--driver-dashboard driver-dashboard-page admin-dashboard-page">
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
  const hasOutstanding = (stats?.owed ?? 0) > 0;

  return (
    <div className="enforcement-page enforcement-page--driver-dashboard driver-dashboard-page admin-dashboard-page">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner driver-dashboard-hero__inner">
          <div className="flex items-start gap-4 min-w-0">
            <WelcomeProfileAvatar role="driver" variant="welcome" />
            <div className="min-w-0">
              <div className="enforcement-page__eyebrow">
                <span className="enforcement-page__eyebrow-icon">
                  <Car size={14} />
                </span>
                {t('dashboard.driverPortal')}
              </div>
              <h1 className="enforcement-page__title">
                {t(greetingKey(now.getHours()))}, {firstName}
              </h1>
              <p className="enforcement-page__subtitle driver-dashboard-hero__subtitle">
                {t('dashboard.driverWelcome', { name: user?.full_name ?? '' })} · {formatAppDate(locale, now)}
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
            {hasOutstanding ? (
              <button
                type="button"
                onClick={() => navigate(USER_PORTAL_ROUTES.fines)}
                className="enforcement-page__hero-btn"
              >
                {t('dashboard.payNow')} <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate(USER_PORTAL_ROUTES.trafficRules)}
                className="enforcement-page__hero-btn"
              >
                <BookOpen size={14} />
                {t('sidebar.modules.trafficRules')}
              </button>
            )}
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

      <div className="enforcement-page__panel driver-dashboard-quick-panel mb-4">
        <div className="driver-dashboard-quick-panel__head">
          <h2 className="dashboard-section__title">{t('dashboard.quickActions')}</h2>
          <p className="dashboard-section__subtitle">{t('dashboard.quickActionsHint')}</p>
        </div>
        <div className="driver-dashboard-quick-grid">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="driver-dashboard-quick-card"
              >
                <div
                  className="driver-dashboard-quick-card__icon"
                  style={{ background: `${action.tone.solid}14`, color: action.tone.solid, borderColor: `${action.tone.solid}28` }}
                >
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="driver-dashboard-quick-card__title">{action.label}</p>
                    {action.badge && (
                      <span className="driver-dashboard-quick-card__badge">{action.badge}</span>
                    )}
                  </div>
                  <p className="driver-dashboard-quick-card__desc">{action.desc}</p>
                </div>
                <ArrowRight size={16} className="driver-dashboard-quick-card__arrow shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="enforcement-page__panel driver-dashboard-panel">
          <div className="driver-dashboard-panel__head flex items-start justify-between gap-3">
            <div>
              <div className="enforcement-page__eyebrow driver-dashboard-panel__eyebrow">
                <span className="enforcement-page__eyebrow-icon">
                  <FileText size={14} />
                </span>
                {t('dashboard.recentFines')}
              </div>
              <p className="driver-dashboard-panel__subtitle">{t('dashboard.driverRecentFinesSubtitle')}</p>
            </div>
            {(stats?.recent_fines?.length ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => navigate(USER_PORTAL_ROUTES.fines)}
                className="driver-dashboard-panel__link"
              >
                {t('dashboard.viewAll')} <ArrowRight size={12} />
              </button>
            )}
          </div>

          {!stats?.recent_fines?.length ? (
            <div className="driver-dashboard-empty">
              <CheckCircle size={32} className="mx-auto mb-3 opacity-30" style={{ color: C[3].solid }} />
              <p className="text-sm font-medium text-slate-500">{t('dashboard.noRecentFines')}</p>
              <p className="text-xs text-slate-400 mt-1">{t('dashboard.driveSafe')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.recent_fines.map((f: Fine) => {
                const badge = STATUS_BADGE[f.status] || STATUS_BADGE.dismissed;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => navigate(USER_PORTAL_ROUTES.fines)}
                    className="driver-dashboard-fine-row"
                    style={{ borderLeftColor: badge.accent }}
                  >
                    <div
                      className="driver-dashboard-fine-row__icon"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      <FileText size={15} />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="enforcement-page__cell-primary truncate">{translateReason(f.reason)}</p>
                      <p className="enforcement-page__cell-mono mt-0.5">
                        {new Date(f.created_at).toLocaleDateString(locale === 'km' ? 'km-KH' : 'en-US')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="enforcement-page__cell-primary font-bold">
                        {formatAppCurrency(locale, f.amount)}
                      </span>
                      <span
                        className="enforcement-page__code-pill text-[10px]"
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

        <div className="enforcement-page__panel driver-dashboard-panel">
          <div className="driver-dashboard-panel__head flex items-start justify-between gap-3">
            <div>
              <div className="enforcement-page__eyebrow driver-dashboard-panel__eyebrow">
                <span className="enforcement-page__eyebrow-icon">
                  <CreditCard size={14} />
                </span>
                {t('dashboard.driverPaymentSummary')}
              </div>
              <p className="driver-dashboard-panel__subtitle">{t('dashboard.driverPaymentSummarySub')}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate(USER_PORTAL_ROUTES.finesPayments)}
              className="driver-dashboard-panel__link"
            >
              {t('dashboard.viewAll')} <ArrowRight size={12} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="enforcement-page__stat-card enforcement-page__stat-card--emerald !p-4">
              <div className="enforcement-page__stat-copy text-center w-full">
                <p className="enforcement-page__stat-value">{stats?.paid ?? 0}</p>
                <p className="enforcement-page__stat-label enforcement-page__stat-label--emerald">
                  {t('dashboard.paidFines')}
                </p>
              </div>
            </div>
            <div className="enforcement-page__stat-card enforcement-page__stat-card--rose !p-4">
              <div className="enforcement-page__stat-copy text-center w-full">
                <p className="enforcement-page__stat-value">{stats?.pending ?? 0}</p>
                <p className="enforcement-page__stat-label enforcement-page__stat-label--rose">
                  {t('dashboard.statOutstanding')}
                </p>
              </div>
            </div>
          </div>

          {hasOutstanding ? (
            <div className="rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap border border-rose-200/60 bg-rose-50/60 dark:bg-rose-950/20 dark:border-rose-900/40">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('dashboard.outstandingBalance')}</p>
                <p className="text-xl font-bold mt-0.5 text-rose-700 dark:text-rose-300">
                  {formatAppCurrency(locale, stats?.owed ?? 0)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(USER_PORTAL_ROUTES.fines)}
                className="enforcement-page__hero-btn"
              >
                {t('dashboard.payNow')} <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="driver-dashboard-empty">
              <Shield size={32} className="mx-auto mb-3 opacity-30" style={{ color: C[3].solid }} />
              <p className="text-sm font-medium text-slate-500">{t('dashboard.driverComplianceClear')}</p>
              <p className="text-xs text-slate-400 mt-1">{t('dashboard.driveSafe')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
