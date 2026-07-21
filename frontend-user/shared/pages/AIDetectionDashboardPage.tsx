import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Brain, Plus, Cctv, History, BarChart3, Activity, Target, Camera as CameraIcon, Zap,
} from 'lucide-react';
import { RecentDetectionsTable } from '@shared/components/ai/center/RecentDetectionsTable';
import { DetectionCenterHistoryPanel } from '@shared/components/ai/center/DetectionCenterHistoryPanel';
import { useLanguage } from '@shared/context/LanguageContext';
import { useLiveData } from '@shared/hooks/useLiveData';
import { aiAPI, camerasAPI } from '@shared/services/api';
import {
  DEFAULT_PAGE_STATS,
  mergePageStatsWithDefaults,
} from '@shared/constants/defaultPageStats';
import type { AIDetectionLog, AIDetectionPageStats } from '@shared/types';
import { USER_PORTAL_ROUTES } from '@shared/constants/userPortalPaths';
import { cn } from '@shared/components/ui/utils';

type ViewTab = 'dashboard' | 'history';

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

export function AIDetectionDashboardPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<ViewTab>(
    searchParams.get('tab') === 'history' ? 'history' : 'dashboard',
  );
  const [pageStats, setPageStats] = useState<AIDetectionPageStats>(DEFAULT_PAGE_STATS);
  const [recentLogs, setRecentLogs] = useState<AIDetectionLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [liveCameraCount, setLiveCameraCount] = useState(0);

  const refreshStats = useCallback(async () => {
    try {
      const data = await aiAPI.getPageStats();
      setPageStats(mergePageStatsWithDefaults(data));
    } catch {
      /* keep defaults */
    }
  }, []);

  const refreshLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const logs = await aiAPI.getLogs();
      setRecentLogs(logs);
    } catch {
      setRecentLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  const refreshCameras = useCallback(async () => {
    try {
      const cameras = await camerasAPI.getAll();
      const active = cameras.filter((c) => c.status === 'active');
      setLiveCameraCount(active.length || cameras.length);
    } catch {
      setLiveCameraCount(0);
    }
  }, []);

  useEffect(() => {
    void refreshStats();
    void refreshLogs();
    void refreshCameras();
  }, [refreshStats, refreshLogs, refreshCameras]);

  useEffect(() => {
    setView(searchParams.get('tab') === 'history' ? 'history' : 'dashboard');
  }, [searchParams]);

  const openView = useCallback((next: ViewTab) => {
    setView(next);
    if (next === 'history') {
      setSearchParams({ tab: 'history' }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [setSearchParams]);

  useLiveData(() => {
    void refreshStats();
    void refreshLogs();
  }, 30_000, true);

  const todayDetections = useMemo(
    () => recentLogs.filter((log) => isToday(log.created_at)).length,
    [recentLogs],
  );

  const kpiCards = [
    { tone: 'emerald', icon: Activity, value: pageStats.stats.total_scans.toLocaleString(), label: t('aiCenter.kpiTotalDetect') },
    { tone: 'blue', icon: Zap, value: String(todayDetections), label: t('aiCenter.kpiTodayDetect') },
    { tone: 'violet', icon: Target, value: `${pageStats.stats.accuracy_avg.toFixed(1)}%`, label: t('aiCenter.kpiAccuracy') },
    { tone: 'cyan', icon: CameraIcon, value: String(liveCameraCount), label: t('aiCenter.kpiLiveCameras') },
  ];

  return (
    <div className="enforcement-page enforcement-page--ai-center dashboard-home dashboard-page--ai-center enterprise-ai-page">
      <div className="enforcement-page__hero enterprise-ai-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner enterprise-ai-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><Brain size={14} /></span>
              {t('aiCenter.heroEyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('aiCenter.heroTitle')}</h1>
            <p className="enforcement-page__subtitle">{t('aiCenter.dashboardSubtitle')}</p>
          </div>
          <div className="enterprise-ai-page__hero-actions">
            <button
              type="button"
              className="enterprise-ai-page__action-btn is-active"
              onClick={() => navigate(USER_PORTAL_ROUTES.aiDetectionNew)}
            >
              <Plus size={15} />
              {t('aiCenter.actionUpload')}
            </button>
            <button
              type="button"
              className="enterprise-ai-page__action-btn"
              onClick={() => navigate(`${USER_PORTAL_ROUTES.aiDetectionNew}?mode=camera`)}
            >
              <Cctv size={15} />
              {t('aiCenter.actionLiveCamera')}
            </button>
            <button
              type="button"
              className={cn('enterprise-ai-page__action-btn', view === 'history' && 'is-active')}
              onClick={() => openView(view === 'history' ? 'dashboard' : 'history')}
            >
              <History size={15} />
              {t('aiCenter.tabHistory')}
            </button>
            <button
              type="button"
              className="enterprise-ai-page__action-btn"
              onClick={() => navigate(USER_PORTAL_ROUTES.aiLogs)}
            >
              <BarChart3 size={15} />
              {t('aiCenter.actionAnalytics')}
            </button>
          </div>
        </div>
      </div>

      {view === 'history' ? (
        <DetectionCenterHistoryPanel />
      ) : (
        <>
          <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four enterprise-ai-kpi-grid">
            {kpiCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className={cn('enforcement-page__stat-card', `enforcement-page__stat-card--${card.tone}`)}>
                  <div className={cn('enforcement-page__stat-icon', `enforcement-page__stat-icon--${card.tone}`)}>
                    <Icon size={18} />
                  </div>
                  <div className="enforcement-page__stat-copy">
                    <p className="enforcement-page__stat-value">{card.value}</p>
                    <p className={cn('enforcement-page__stat-label', `enforcement-page__stat-label--${card.tone}`)}>
                      {card.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <RecentDetectionsTable
            logs={recentLogs}
            loading={loadingLogs}
            onViewAll={() => openView('history')}
            onViewLog={() => openView('history')}
            pageSize={10}
          />
        </>
      )}
    </div>
  );
}
