import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Cctv, RefreshCw, MapPin, Radio, WifiOff, ImageOff, AlertTriangle, Loader2,
  Pause, Play, Search, Video, Wrench, CircleDot, Scan,
} from 'lucide-react';
import { detectFromImageUrl } from '@shared/hooks/useWebcamDetection';
import { Button } from '@shared/components/ui/button';
import { useLanguage } from '@shared/context/LanguageContext';
import { camerasAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { Camera, CameraStatus, CameraType } from '@shared/types';
import { cn } from '@shared/components/ui/utils';

const POLL_INTERVAL_MS = 5000;

type FeedState = 'idle' | 'loading' | 'ready' | 'no_source' | 'offline' | 'error';

const STATUS_META: Record<CameraStatus, { labelKey: string; color: string; bg: string; border: string }> = {
  active: {
    labelKey: 'active',
    color: '#059669',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.28)',
  },
  inactive: {
    labelKey: 'inactive',
    color: '#64748B',
    bg: 'rgba(100,116,139,0.12)',
    border: 'rgba(100,116,139,0.25)',
  },
  maintenance: {
    labelKey: 'maintenance',
    color: '#D97706',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.28)',
  },
};

const TYPE_ICON: Record<CameraType, typeof Video> = {
  fixed: Video,
  ptz: Cctv,
  speed: CircleDot,
};

function frameUrl(base: string, tick: number) {
  if (!base) return '';
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}_t=${tick}`;
}

function StatusPill({
  status,
  t,
  size = 'sm',
}: {
  status: CameraStatus;
  t: (key: string, vars?: Record<string, string | number>) => string;
  size?: 'sm' | 'md';
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn('cameras-status-pill', size === 'md' && 'cameras-status-pill--md')}
      style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}
    >
      <span className="cameras-status-pill__dot" style={{ background: meta.color }} />
      {t(`pages.cameras.status.${meta.labelKey}`)}
    </span>
  );
}

function CameraFeedPreview({
  camera,
  refreshTick,
  autoRefresh,
  onManualRefresh,
  t,
}: {
  camera: Camera | null;
  refreshTick: number;
  autoRefresh: boolean;
  onManualRefresh: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [feedState, setFeedState] = useState<FeedState>('idle');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [aiDetecting, setAiDetecting] = useState(false);
  const [aiResult, setAiResult] = useState<{ sign_name: string; confidence: number; sign_code?: string } | null>(null);

  const src = useMemo(() => {
    if (!camera) return '';
    if (camera.status === 'inactive') return '';
    if (!camera.frame_source_url?.trim()) return '';
    return frameUrl(camera.frame_source_url.trim(), refreshTick);
  }, [camera, refreshTick]);

  useEffect(() => {
    setAiResult(null);
    if (!camera) {
      setFeedState('idle');
      setLastUpdated(null);
      return;
    }
    if (camera.status === 'inactive') {
      setFeedState('offline');
      return;
    }
    if (!camera.frame_source_url?.trim()) {
      setFeedState('no_source');
      return;
    }
    setFeedState('loading');
  }, [camera, refreshTick]);

  const handleLoad = () => {
    setFeedState('ready');
    setLastUpdated(new Date());
  };

  const handleError = () => setFeedState('error');

  const handleAiDetect = async () => {
    if (!src || feedState !== 'ready') {
      toast.error(t('pages.cameras.detectNeedFrame'));
      return;
    }
    setAiDetecting(true);
    try {
      const res = await detectFromImageUrl(src);
      setAiResult({ sign_name: res.sign_name, confidence: res.confidence, sign_code: res.sign_code });
      toast.success(
        t('pages.cameras.detectSuccess')
          .replace('{name}', res.sign_name)
          .replace('{confidence}', res.confidence.toFixed(1)),
      );
    } catch {
      toast.error(t('pages.cameras.detectFailed'));
    } finally {
      setAiDetecting(false);
    }
  };

  if (!camera) {
    return (
      <div className="cameras-preview-empty cameras-preview-empty--fill">
        <div className="cameras-preview-empty__icon">
          <Cctv size={40} strokeWidth={1.5} />
        </div>
        <p className="cameras-preview-empty__title">{t('pages.cameras.selectCamera')}</p>
        <p className="cameras-preview-empty__hint">{t('pages.cameras.selectCameraHint')}</p>
      </div>
    );
  }

  const TypeIcon = TYPE_ICON[camera.camera_type] ?? Video;
  const isLive = feedState === 'ready' && camera.status === 'active' && autoRefresh;

  return (
    <div className="cameras-preview-body cameras-preview-body--fill">
      <div className="cameras-preview-meta cameras-preview-meta--compact">
        <div className="cameras-preview-meta__main">
          <h2 className="cameras-preview-meta__name">{camera.name}</h2>
          <p className="cameras-preview-meta__road">
            <MapPin size={14} aria-hidden />
            <span>{camera.road_name}</span>
          </p>
          <div className="cameras-preview-meta__tags">
            {camera.code && (
              <span className="cameras-tag cameras-tag--code">
                <span className="cameras-tag__label">{t('pages.cameras.codeLabel')}</span>
                {camera.code}
              </span>
            )}
            <span className="cameras-tag cameras-tag--type">
              <TypeIcon size={12} aria-hidden />
              {t(`pages.cameras.type.${camera.camera_type}`)}
            </span>
          </div>
        </div>
        <div className="cameras-preview-meta__actions">
          {isLive && (
            <span className="cameras-live-badge">
              <span className="cameras-live-badge__pulse" />
              {t('pages.cameras.liveBadge')}
            </span>
          )}
          <StatusPill status={camera.status} t={t} size="md" />
          <Button variant="outline" size="sm" onClick={onManualRefresh} className="cameras-action-btn gap-1.5">
            <RefreshCw size={15} />
            {t('pages.cameras.refresh')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleAiDetect()}
            disabled={aiDetecting || feedState !== 'ready'}
            className="cameras-action-btn gap-1.5"
          >
            {aiDetecting ? <Loader2 size={15} className="animate-spin" /> : <Scan size={15} />}
            {aiDetecting ? t('pages.cameras.detectingSign') : t('pages.cameras.detectSign')}
          </Button>
        </div>
      </div>

      {aiResult && (
        <div className="cameras-ai-result">
          <p className="cameras-ai-result__label">{t('pages.cameras.aiResultLabel')}</p>
          <p className="cameras-ai-result__name">{aiResult.sign_name}</p>
          <p className="cameras-ai-result__meta">
            {aiResult.confidence.toFixed(1)}% · {aiResult.sign_code || '—'}
          </p>
        </div>
      )}

      <div className="cameras-feed-viewport">
        {feedState === 'offline' && (
          <FeedOverlay
            icon={<WifiOff size={40} strokeWidth={1.5} />}
            title={t('pages.cameras.feedOffline')}
            hint={t('pages.cameras.feedOfflineHint')}
          />
        )}
        {feedState === 'no_source' && (
          <FeedOverlay
            icon={<ImageOff size={40} strokeWidth={1.5} />}
            title={t('pages.cameras.feedNoSource')}
            hint={t('pages.cameras.feedNoSourceHint')}
          />
        )}
        {feedState === 'error' && (
          <FeedOverlay
            icon={<AlertTriangle size={40} strokeWidth={1.5} />}
            title={t('pages.cameras.feedError')}
            hint={t('pages.cameras.feedErrorHint')}
            action={
              <Button variant="secondary" size="sm" onClick={onManualRefresh} className="cameras-action-btn mt-4 gap-1.5">
                <RefreshCw size={14} />
                {t('pages.cameras.retry')}
              </Button>
            }
          />
        )}
        {(feedState === 'loading' || feedState === 'ready') && src && (
          <>
            {feedState === 'loading' && (
              <div className="cameras-feed-loading">
                <Loader2 size={34} className="animate-spin" />
                <p>{t('pages.cameras.feedLoading')}</p>
              </div>
            )}
            <img
              key={src}
              src={src}
              alt={camera.name}
              className="cameras-feed-image"
              onLoad={handleLoad}
              onError={handleError}
            />
          </>
        )}
        <div className="cameras-feed-corner" aria-hidden />
      </div>

      <div className="cameras-feed-footer">
        <span className="cameras-feed-footer__item">
          <Radio size={13} className={autoRefresh ? 'cameras-feed-footer__live' : ''} />
          {autoRefresh
            ? t('pages.cameras.autoRefreshOn', { seconds: POLL_INTERVAL_MS / 1000 })
            : t('pages.cameras.autoRefreshOff')}
        </span>
        {lastUpdated && feedState === 'ready' && (
          <span className="cameras-feed-footer__item cameras-feed-footer__time">
            {t('pages.cameras.lastUpdated', { time: lastUpdated.toLocaleTimeString() })}
          </span>
        )}
      </div>
    </div>
  );
}

function FeedOverlay({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="cameras-feed-overlay">
      <div className="cameras-feed-overlay__icon">{icon}</div>
      <p className="cameras-feed-overlay__title">{title}</p>
      <p className="cameras-feed-overlay__hint">{hint}</p>
      {action}
    </div>
  );
}

export function CamerasPage() {
  const { t } = useLanguage();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [filtered, setFiltered] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const selected = useMemo(
    () => cameras.find((c) => c.id === selectedId) ?? null,
    [cameras, selectedId],
  );

  const loadCameras = useCallback(async () => {
    setLoading(true);
    try {
      const data = await camerasAPI.getAll();
      setCameras(data);
      setSelectedId((prev) => {
        if (prev && data.some((c) => c.id === prev)) return prev;
        return data[0]?.id ?? null;
      });
    } catch {
      toast.error(t('pages.cameras.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadCameras(); }, [loadCameras]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(cameras);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(cameras.filter((c) =>
      c.name.toLowerCase().includes(q)
      || c.road_name.toLowerCase().includes(q)
      || c.code.toLowerCase().includes(q),
    ));
  }, [search, cameras]);

  useEffect(() => {
    if (!autoRefresh || !selected?.frame_source_url || selected.status === 'inactive') return;
    const id = window.setInterval(() => setRefreshTick((n) => n + 1), POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [autoRefresh, selected]);

  const handleManualRefresh = () => setRefreshTick((n) => n + 1);

  const activeCount = cameras.filter((c) => c.status === 'active').length;
  const attentionCount = cameras.filter((c) => c.status !== 'active').length;

  const stats = [
    {
      label: t('pages.cameras.statTotal'),
      value: loading ? '—' : String(cameras.length),
      icon: <Cctv size={22} />,
      gradient: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 55%, #3B82F6 100%)',
      accent: '#2563eb',
    },
    {
      label: t('pages.cameras.statActive'),
      value: loading ? '—' : String(activeCount),
      icon: <Video size={22} />,
      gradient: 'linear-gradient(135deg, #047857 0%, #059669 55%, #10B981 100%)',
      accent: '#059669',
    },
    {
      label: t('pages.cameras.statAttention'),
      value: loading ? '—' : String(attentionCount),
      icon: <Wrench size={22} />,
      gradient: 'linear-gradient(135deg, #B45309 0%, #D97706 55%, #F59E0B 100%)',
      accent: '#d97706',
    },
  ];

  return (
    <div className="dashboard-home dashboard-page--cameras">
      <header className="cameras-command-bar">
        <div className="cameras-command-bar__top">
          <div className="cameras-command-bar__brand">
            <div className="cameras-command-bar__logo">
              <Cctv size={26} strokeWidth={1.75} />
            </div>
            <div className="cameras-command-bar__titles">
              <p className="cameras-command-bar__eyebrow">{t('pages.cameras.eyebrow')}</p>
              <h1 className="cameras-command-bar__title">{t('pages.cameras.title')}</h1>
              <p className="cameras-command-bar__subtitle">
                {loading
                  ? t('pages.cameras.loading')
                  : t('pages.cameras.heroSubtitle', { total: cameras.length, active: activeCount })}
              </p>
            </div>
          </div>

          <div className="cameras-command-bar__tools">
            <button
              type="button"
              className={cn('cameras-tool-btn', autoRefresh && 'cameras-tool-btn--active')}
              onClick={() => setAutoRefresh((v) => !v)}
            >
              <span className="cameras-tool-btn__icon">
                {autoRefresh ? <Pause size={20} /> : <Play size={20} />}
              </span>
              <span className="cameras-tool-btn__copy">
                <span className="cameras-tool-btn__label">
                  {autoRefresh ? t('pages.cameras.pauseRefresh') : t('pages.cameras.resumeRefresh')}
                </span>
                <span className="cameras-tool-btn__hint">
                  {autoRefresh
                    ? t('pages.cameras.autoRefreshOn', { seconds: POLL_INTERVAL_MS / 1000 })
                    : t('pages.cameras.autoRefreshOff')}
                </span>
              </span>
            </button>
            <button
              type="button"
              className="cameras-tool-btn cameras-tool-btn--primary"
              onClick={loadCameras}
              disabled={loading}
            >
              <span className="cameras-tool-btn__icon">
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </span>
              <span className="cameras-tool-btn__copy">
                <span className="cameras-tool-btn__label">{t('pages.cameras.reloadList')}</span>
                <span className="cameras-tool-btn__hint">{t('pages.cameras.reloadHint')}</span>
              </span>
            </button>
          </div>
        </div>

        <div className="cameras-command-bar__metrics">
          {stats.map((s) => (
            <div key={s.label} className="cameras-metric-tile" style={{ '--metric-accent': s.accent } as CSSProperties}>
              <div className="cameras-metric-tile__icon" style={{ background: s.gradient }}>
                {s.icon}
              </div>
              <div className="cameras-metric-tile__body">
                <p className="cameras-metric-tile__label">{s.label}</p>
                <p className="cameras-metric-tile__value">{s.value}</p>
              </div>
            </div>
          ))}
          <div className={cn('cameras-metric-tile cameras-metric-tile--stream', autoRefresh && 'cameras-metric-tile--live')}>
            <div className="cameras-metric-tile__icon cameras-metric-tile__icon--stream">
              <Radio size={20} />
            </div>
            <div className="cameras-metric-tile__body">
              <p className="cameras-metric-tile__label">{t('pages.cameras.streamStatus')}</p>
              <p className="cameras-metric-tile__value cameras-metric-tile__value--text">
                {autoRefresh ? t('pages.cameras.streamLive') : t('pages.cameras.streamPaused')}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="cameras-workspace">
        <aside className="cameras-panel cameras-panel--list">
          <header className="cameras-panel__header">
            <div>
              <h2 className="dashboard-section__title">{t('pages.cameras.listTitle')}</h2>
              <p className="dashboard-section__subtitle">{t('pages.cameras.listSubtitle')}</p>
            </div>
            <span className="cameras-panel__count">
              {filtered.length}
            </span>
          </header>

          <div className="cameras-search-wrap">
            <Search size={15} className="cameras-search-wrap__icon" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('pages.cameras.searchPlaceholder')}
              className="cameras-search-input"
            />
          </div>

          <div className="cameras-list">
            {loading && (
              <div className="cameras-list__loading">
                <Loader2 size={20} className="animate-spin" />
                <span>{t('pages.cameras.loading')}</span>
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <p className="cameras-list__empty">{search ? t('pages.cameras.noSearchResults') : t('pages.cameras.empty')}</p>
            )}
            {!loading && filtered.map((cam) => {
              const isSelected = cam.id === selectedId;
              const meta = STATUS_META[cam.status];
              const TypeIcon = TYPE_ICON[cam.camera_type] ?? Video;
              return (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => setSelectedId(cam.id)}
                  className={cn('cameras-list-item', isSelected && 'cameras-list-item--active')}
                >
                  <div
                    className="cameras-list-item__icon"
                    style={{ background: meta.bg, borderColor: meta.border, color: meta.color }}
                  >
                    <TypeIcon size={18} strokeWidth={1.75} />
                  </div>
                  <div className="cameras-list-item__body">
                    <p className="cameras-list-item__name">{cam.name}</p>
                    <p className="cameras-list-item__road">{cam.road_name}</p>
                    <div className="cameras-list-item__tags">
                      {cam.code && <span className="cameras-list-item__code">{cam.code}</span>}
                      <StatusPill status={cam.status} t={t} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="cameras-panel cameras-panel--preview">
          <div className="cameras-panel__content cameras-panel__content--fill">
            <CameraFeedPreview
              camera={selected}
              refreshTick={refreshTick}
              autoRefresh={autoRefresh}
              onManualRefresh={handleManualRefresh}
              t={t}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
