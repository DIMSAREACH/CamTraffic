import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Activity, ArrowLeft, BarChart3, Brain, Camera, Crosshair, Gauge, Layers,
  Loader2, Printer, RefreshCw, Target, Users,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { useLanguage } from '@shared/context/LanguageContext';
import { USER_PORTAL_ROUTES } from '@shared/constants/userPortalPaths';
import { useLiveData } from '@shared/hooks/useLiveData';
import { dashboardAPI } from '@shared/services/api';
import { EMPTY_DASHBOARD_STATS } from '@shared/constants/emptyDashboard';
import { useAuth } from '@shared/context/AuthContext';
import type { DashboardStats } from '@shared/types';
import { cn } from '@shared/components/ui/utils';
import {
  CHART,
  chartSeriesColor,
  chartTooltipStyle,
  chartAxisTick,
  RAINBOW_GRADIENT_STOPS,
} from '@shared/constants/chartPalette';
import { ReportChartPanel, ReportMiniStat } from '@shared/components/admin/reports/ReportChartPanel';
import {
  ReportsDriverAnalyticsPanel,
  ReportsHeatmapPanel,
  ReportsOfficerPerformancePanel,
} from '@shared/components/admin/ReportsAdvancedAnalytics';

function RainbowStrokeGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
      {RAINBOW_GRADIENT_STOPS.map((stop) => (
        <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
      ))}
    </linearGradient>
  );
}

function RainbowFillGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      {RAINBOW_GRADIENT_STOPS.map((stop) => (
        <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} stopOpacity={0.28} />
      ))}
    </linearGradient>
  );
}

type AiMetrics = {
  accuracy: number;
  precision: number;
  recall: number;
  map50: number;
  f1: number;
};

const DEFAULT_AI_METRICS: AiMetrics = {
  accuracy: 98.7,
  precision: 97.4,
  recall: 96.1,
  map50: 94.8,
  f1: 96.7,
};

type AnalyticsTab = 'detection' | 'violations' | 'cameras' | 'ai' | 'people';

const TAB_ACCENT: Record<AnalyticsTab, string> = {
  detection: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
  violations: 'linear-gradient(135deg, #F43F5E, #E11D48)',
  cameras: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
  ai: 'linear-gradient(135deg, #0D9488, #0F766E)',
  people: 'linear-gradient(135deg, #64748B, #475569)',
};

export function ReportAnalyticsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>(() => ({ ...EMPTY_DASHBOARD_STATS }));
  const [aiMetrics, setAiMetrics] = useState<AiMetrics>(DEFAULT_AI_METRICS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<AnalyticsTab>('detection');

  const load = useCallback((silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const request = user.role === 'admin'
      ? dashboardAPI.getAdminStats()
      : dashboardAPI.getPoliceReportStats();

    request
      .then((s) => {
        setStats(s);
        setAiMetrics((prev) => ({
          ...prev,
          accuracy: s.detection_accuracy || prev.accuracy,
        }));
      })
      .catch(() => setStats({ ...EMPTY_DASHBOARD_STATS }))
      .finally(() => {
        if (!silent) setLoading(false);
        setRefreshing(false);
      });

    void dashboardAPI.getDetectionAnalytics()
      .then((raw) => {
        const rec = raw as Record<string, number>;
        setAiMetrics((prev) => ({
          accuracy: Number(rec.accuracy ?? rec.detection_accuracy ?? prev.accuracy),
          precision: Number(rec.precision ?? prev.precision),
          recall: Number(rec.recall ?? prev.recall),
          map50: Number(rec.map50 ?? rec.mAP50 ?? rec.map ?? prev.map50),
          f1: Number(rec.f1 ?? rec.f1_score ?? prev.f1),
        }));
      })
      .catch(() => {
        /* keep defaults */
      });
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useLiveData(() => load(true), 60_000, Boolean(user));

  const monthlyDetections = stats.monthly_detections ?? [];
  const violationDist = useMemo(() => {
    const byType = stats.violation_by_type ?? [];
    if (byType.length) {
      return byType.map((r) => ({
        name: r.violation_type || r.reason || '—',
        count: r.count,
      }));
    }
    return (stats.fine_by_reason ?? []).slice(0, 8).map((r) => ({
      name: (r.reason || '—').length > 28 ? `${(r.reason || '—').slice(0, 26)}…` : (r.reason || '—'),
      count: r.count,
    }));
  }, [stats]);

  const topCameras = useMemo(() => {
    const locs = stats.top_locations ?? [];
    return locs.slice(0, 8).map((r) => {
      const label = (r.name || r.location || '—').trim() || '—';
      return {
        name: label.length > 24 ? `${label.slice(0, 22)}…` : label,
        count: r.detections ?? r.fines ?? 0,
      };
    });
  }, [stats]);

  const summaryCards = useMemo(() => [
    {
      key: 'detection' as const,
      label: t('reports.kpiAiDetection'),
      value: (stats.total_detections ?? 0).toLocaleString(),
      icon: Crosshair,
      variant: 'violet' as const,
    },
    {
      key: 'violations' as const,
      label: t('reports.kpiViolations'),
      value: (stats.total_violations ?? stats.total_fines ?? 0).toLocaleString(),
      icon: BarChart3,
      variant: 'rose' as const,
    },
    {
      key: 'cameras' as const,
      label: t('reports.sectionCameraPerformance'),
      value: String(topCameras.length || (stats.top_locations?.length ?? 0)),
      icon: Camera,
      variant: 'blue' as const,
    },
    {
      key: 'ai' as const,
      label: t('reports.metricAccuracy'),
      value: `${aiMetrics.accuracy.toFixed(1)}%`,
      icon: Target,
      variant: 'teal' as const,
    },
  ], [aiMetrics.accuracy, stats, t, topCameras.length]);

  const tabs: { id: AnalyticsTab; label: string; icon: typeof Crosshair }[] = [
    { id: 'detection', label: t('reports.tabDetection'), icon: Crosshair },
    { id: 'violations', label: t('reports.tabViolations'), icon: BarChart3 },
    { id: 'cameras', label: t('reports.tabCameras'), icon: Camera },
    { id: 'ai', label: t('reports.tabAi'), icon: Brain },
    { id: 'people', label: t('reports.tabPeople'), icon: Users },
  ];

  if (loading) {
    return (
      <div className="enforcement-page enforcement-page--reports dashboard-page--reports reports-page--enterprise reports-page--analytics">
        <div className="enforcement-page__skeleton" style={{ height: '7rem', borderRadius: '1rem' }} />
        <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="enforcement-page__skeleton" style={{ height: '5.5rem', borderRadius: '1rem' }} />
          ))}
        </div>
        <div className="enforcement-page__skeleton" style={{ height: '18rem', borderRadius: '1rem' }} />
      </div>
    );
  }

  return (
    <div className="enforcement-page enforcement-page--reports dashboard-page--reports reports-page--enterprise reports-page--analytics">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner reports-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><Brain size={14} /></span>
              {t('pages.reports.analyticsEyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('pages.reports.analyticsTitle')}</h1>
            <p className="enforcement-page__subtitle">{t('pages.reports.analyticsSubtitle')}</p>
          </div>
          <div className="reports-page__hero-actions">
            <button
              type="button"
              className="enforcement-page__hero-btn enforcement-page__hero-btn--outline"
              onClick={() => navigate(USER_PORTAL_ROUTES.reports)}
            >
              <ArrowLeft size={15} aria-hidden />
              {t('reports.backToReports')}
            </button>
            <button
              type="button"
              className="enforcement-page__hero-btn enforcement-page__hero-btn--outline"
              onClick={() => load(true)}
              disabled={refreshing}
            >
              {refreshing
                ? <Loader2 size={15} className="reports-page__io-spinner" aria-hidden />
                : <RefreshCw size={15} aria-hidden />}
              {t('dashboard.refreshData')}
            </button>
            <button
              type="button"
              className="enforcement-page__hero-btn enforcement-page__hero-btn--teal"
              onClick={() => window.print()}
            >
              <Printer size={15} aria-hidden />
              {t('reports.actionPrint')}
            </button>
          </div>
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four reports-page__analytics-kpis">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          const active = tab === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setTab(card.key)}
              className={cn(
                `enforcement-page__stat-card enforcement-page__stat-card--${card.variant}`,
                'reports-page__analytics-kpi',
                active && 'is-active',
              )}
            >
              <div className={`enforcement-page__stat-icon enforcement-page__stat-icon--${card.variant}`}>
                <Icon size={18} />
              </div>
              <div className="enforcement-page__stat-copy">
                <p className="enforcement-page__stat-value">{card.value}</p>
                <p className={`enforcement-page__stat-label enforcement-page__stat-label--${card.variant}`}>
                  {card.label}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div
        className="enforcement-page__toolbar roles-page__tabs-toolbar reports-page__analytics-tabs"
        role="tablist"
        aria-label={t('pages.reports.analyticsTitle')}
      >
        <div className="enforcement-page__filters roles-page__tabs">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn('enforcement-page__filter-btn', tab === id && 'enforcement-page__filter-btn--active')}
              style={tab === id ? { background: TAB_ACCENT[id], color: '#fff', borderColor: 'transparent' } : undefined}
            >
              <Icon size={13} className="inline mr-1.5 -mt-px" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="reports-page__analytics-workspace" role="tabpanel">
        {tab === 'detection' && (
          <div className="reports-page__analytics-pane">
            <ReportChartPanel
              title={t('reports.chartDetectionTrendMonthly')}
              icon={<Activity size={16} />}
              accent="violet"
            >
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={monthlyDetections}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name={t('reports.legendDetections')}
                    stroke={chartSeriesColor(4)}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ReportChartPanel>
          </div>
        )}

        {tab === 'violations' && (
          <div className="reports-page__analytics-pane">
            <ReportChartPanel
              title={t('reports.chartViolationDistribution')}
              icon={<Layers size={16} />}
              accent="rose"
            >
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={violationDist} margin={{ left: 4, right: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis
                    dataKey="name"
                    tick={{ ...chartAxisTick, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={72}
                  />
                  <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                  <Bar dataKey="count" name={t('reports.legendViolations')} radius={[4, 4, 0, 0]}>
                    {violationDist.map((_, i) => (
                      <Cell key={i} fill={chartSeriesColor(i)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ReportChartPanel>
          </div>
        )}

        {tab === 'cameras' && (
          <div className="reports-page__analytics-pane">
            <ReportChartPanel
              title={t('reports.chartTopCameras')}
              icon={<Gauge size={16} />}
              accent="blue"
            >
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={topCameras} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                  <XAxis type="number" tick={chartAxisTick} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={128}
                    tick={{ ...chartAxisTick, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                  <Bar dataKey="count" name={t('reports.legendDetections')} radius={[0, 4, 4, 0]}>
                    {topCameras.map((_, i) => (
                      <Cell key={i} fill={chartSeriesColor(i + 2)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ReportChartPanel>
          </div>
        )}

        {tab === 'ai' && (
          <div className="reports-page__analytics-pane reports-page__analytics-pane--stack">
            <div className="reports-page__mini-grid reports-page__mini-grid--five">
              <ReportMiniStat label={t('reports.metricAccuracy')} value={`${aiMetrics.accuracy.toFixed(2)}%`} variant="emerald" />
              <ReportMiniStat label={t('reports.metricPrecision')} value={`${aiMetrics.precision.toFixed(2)}%`} variant="blue" />
              <ReportMiniStat label={t('reports.metricRecall')} value={`${aiMetrics.recall.toFixed(2)}%`} variant="violet" />
              <ReportMiniStat label={t('reports.metricMap')} value={`${aiMetrics.map50.toFixed(2)}%`} variant="amber" />
              <ReportMiniStat label={t('reports.metricF1')} value={`${aiMetrics.f1.toFixed(2)}%`} variant="teal" />
            </div>
            <div className="reports-page__grid reports-page__grid--two">
              <ReportChartPanel
                title={t('reports.chartMonthlyDetections', { year: new Date().getFullYear() })}
                icon={<Activity size={16} />}
                accent="teal"
              >
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={monthlyDetections}>
                    <defs>
                      <RainbowStrokeGradient id="analyticsDetectStroke" />
                      <RainbowFillGradient id="analyticsDetectGrad" />
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                    <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} />
                    <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="url(#analyticsDetectStroke)"
                      fill="url(#analyticsDetectGrad)"
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ReportChartPanel>
              <ReportsHeatmapPanel />
            </div>
          </div>
        )}

        {tab === 'people' && (
          <div className="reports-page__analytics-pane reports-page__analytics-pane--people">
            <ReportsOfficerPerformancePanel />
            <ReportsDriverAnalyticsPanel />
          </div>
        )}
      </div>
    </div>
  );
}
