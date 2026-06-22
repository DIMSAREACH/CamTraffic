import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Cctv, RefreshCw, MapPin, Radio, WifiOff, ImageOff, AlertTriangle, Loader2,
  Pause, Play, Search, Video, Wrench, CircleDot, Scan, Plus, Pencil, Trash2,
} from 'lucide-react';
import { SignNameLabels } from '@shared/components/signs/SignNameLabels';
import { detectFromImageUrl } from '@shared/hooks/useWebcamDetection';
import { signDisplayNames } from '@shared/utils/signDisplayNames';
import { Button } from '@shared/components/ui/button';
import { Label } from '@shared/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@shared/components/ui/dialog';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { camerasAPI, roadsAPI } from '@shared/services/api';
import { demoCameraFramePath, resolveCameraFrameUrl } from '@shared/constants/cameraFrameDemo';
import { toast } from 'sonner';
import type { Camera, CameraStatus, CameraType, Road } from '@shared/types';
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

type CameraFormState = {
  road: string;
  name: string;
  code: string;
  model: string;
  camera_type: CameraType;
  status: CameraStatus;
  frame_source_url: string;
  installed_date: string;
  latitude: string;
  longitude: string;
};

const EMPTY_CAMERA_FORM: CameraFormState = {
  road: '',
  name: '',
  code: '',
  model: '',
  camera_type: 'fixed',
  status: 'active',
  frame_source_url: '',
  installed_date: '',
  latitude: '',
  longitude: '',
};

function cameraToForm(camera: Camera): CameraFormState {
  return {
    road: String(camera.road_id),
    name: camera.name,
    code: camera.code || '',
    model: camera.model || '',
    camera_type: camera.camera_type,
    status: camera.status,
    frame_source_url: camera.frame_source_url || '',
    installed_date: camera.installed_date?.slice(0, 10) || '',
    latitude: camera.latitude != null ? String(camera.latitude) : '',
    longitude: camera.longitude != null ? String(camera.longitude) : '',
  };
}

function buildCameraPayload(form: CameraFormState) {
  return {
    road: Number(form.road),
    name: form.name.trim(),
    code: form.code.trim(),
    model: form.model.trim(),
    camera_type: form.camera_type,
    status: form.status,
    frame_source_url: form.frame_source_url.trim(),
    installed_date: form.installed_date || null,
    latitude: form.latitude.trim() ? Number(form.latitude) : null,
    longitude: form.longitude.trim() ? Number(form.longitude) : null,
  };
}

function CameraFormDialog({
  open,
  editing,
  form,
  roads,
  saving,
  onChange,
  onClose,
  onSave,
  t,
}: {
  open: boolean;
  editing: Camera | null;
  form: CameraFormState;
  roads: Road[];
  saving: boolean;
  onChange: (next: CameraFormState) => void;
  onClose: () => void;
  onSave: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const inputClass = 'cameras-search-input w-full mt-1';

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? t('pages.cameras.editTitle') : t('pages.cameras.addTitle')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t('pages.cameras.formRoad')} *</Label>
            <select
              value={form.road}
              onChange={(e) => onChange({ ...form, road: e.target.value })}
              className={inputClass}
            >
              <option value="">{t('pages.cameras.formSelectRoad')}</option>
              {roads.map((road) => (
                <option key={road.id} value={road.id}>{road.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>{t('pages.cameras.formName')} *</Label>
            <input
              value={form.name}
              onChange={(e) => onChange({ ...form, name: e.target.value })}
              className={inputClass}
              placeholder={t('pages.cameras.formNamePlaceholder')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('pages.cameras.formCode')}</Label>
              <input
                value={form.code}
                onChange={(e) => onChange({ ...form, code: e.target.value })}
                className={inputClass}
                placeholder="CAM-001"
              />
            </div>
            <div>
              <Label>{t('pages.cameras.formModel')}</Label>
              <input
                value={form.model}
                onChange={(e) => onChange({ ...form, model: e.target.value })}
                className={inputClass}
                placeholder="Hikvision DS-2CD"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('pages.cameras.formType')}</Label>
              <select
                value={form.camera_type}
                onChange={(e) => onChange({ ...form, camera_type: e.target.value as CameraType })}
                className={inputClass}
              >
                {(['fixed', 'ptz', 'speed'] as const).map((type) => (
                  <option key={type} value={type}>{t(`pages.cameras.type.${type}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t('pages.cameras.formStatus')}</Label>
              <select
                value={form.status}
                onChange={(e) => onChange({ ...form, status: e.target.value as CameraStatus })}
                className={inputClass}
              >
                {(['active', 'inactive', 'maintenance'] as const).map((status) => (
                  <option key={status} value={status}>{t(`pages.cameras.status.${status}`)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label>{t('pages.cameras.formFrameUrl')}</Label>
            <input
              value={form.frame_source_url}
              onChange={(e) => onChange({ ...form, frame_source_url: e.target.value })}
              className={inputClass}
              placeholder="https://example.com/snapshot.jpg"
            />
          </div>
          <div>
            <Label>{t('pages.cameras.formInstalled')}</Label>
            <input
              type="date"
              value={form.installed_date}
              onChange={(e) => onChange({ ...form, installed_date: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('pages.cameras.formLatitude')}</Label>
              <input
                value={form.latitude}
                onChange={(e) => onChange({ ...form, latitude: e.target.value })}
                className={inputClass}
                placeholder="11.5564"
              />
            </div>
            <div>
              <Label>{t('pages.cameras.formLongitude')}</Label>
              <input
                value={form.longitude}
                onChange={(e) => onChange({ ...form, longitude: e.target.value })}
                className={inputClass}
                placeholder="104.9282"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? t('common.saving') : (editing ? t('pages.cameras.saveChanges') : t('pages.cameras.addCamera'))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  onEdit,
  onDelete,
  canManage,
  t,
}: {
  camera: Camera | null;
  refreshTick: number;
  autoRefresh: boolean;
  onManualRefresh: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canManage?: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [feedState, setFeedState] = useState<FeedState>('idle');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [aiDetecting, setAiDetecting] = useState(false);
  const [aiResult, setAiResult] = useState<{
    sign_name: string;
    sign_name_km?: string;
    sign_name_en?: string;
    confidence: number;
    sign_code?: string;
  } | null>(null);

  const [fallbackSrc, setFallbackSrc] = useState<string | null>(null);

  const src = useMemo(() => {
    if (!camera) return '';
    if (camera.status === 'inactive') return '';
    const base = fallbackSrc || resolveCameraFrameUrl(camera.frame_source_url, camera);
    if (!base) return '';
    return frameUrl(base, refreshTick);
  }, [camera, refreshTick, fallbackSrc]);

  useEffect(() => {
    setFallbackSrc(null);
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
    if (!resolveCameraFrameUrl(camera.frame_source_url, camera)) {
      setFeedState('no_source');
      return;
    }
    setFeedState('loading');
  }, [camera, refreshTick]);

  const handleLoad = () => {
    setFeedState('ready');
    setLastUpdated(new Date());
  };

  const handleError = () => {
    if (!camera) {
      setFeedState('error');
      return;
    }
    const demo = demoCameraFramePath(camera);
    if (demo && !fallbackSrc) {
      const demoUrl = resolveCameraFrameUrl(demo, camera);
      const current = resolveCameraFrameUrl(camera.frame_source_url, camera);
      if (demoUrl && demoUrl !== current) {
        setFallbackSrc(demoUrl);
        setFeedState('loading');
        return;
      }
    }
    setFeedState('error');
  };

  const handleAiDetect = async () => {
    if (!src || feedState !== 'ready') {
      toast.error(t('pages.cameras.detectNeedFrame'));
      return;
    }
    setAiDetecting(true);
    try {
      const res = await detectFromImageUrl(src);
      setAiResult({
        sign_name: res.sign_name,
        sign_name_km: res.sign_name_km,
        sign_name_en: res.sign_name_en,
        confidence: res.confidence,
        sign_code: res.sign_code,
      });
      const { km, en } = signDisplayNames(res);
      const label = km || en || res.sign_name;
      toast.success(
        t('pages.cameras.detectSuccess')
          .replace('{name}', label)
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
          {canManage && camera && (
            <>
              <Button variant="outline" size="sm" onClick={onEdit} className="cameras-action-btn gap-1.5">
                <Pencil size={15} />
                {t('pages.cameras.editCamera')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="cameras-action-btn gap-1.5 text-red-600 hover:text-red-700"
              >
                <Trash2 size={15} />
                {t('pages.cameras.deleteCamera')}
              </Button>
            </>
          )}
        </div>
      </div>

      {aiResult && (
        <div className="cameras-ai-result">
          <p className="cameras-ai-result__label">{t('pages.cameras.aiResultLabel')}</p>
          <SignNameLabels sign={aiResult} size="sm" />
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
  const { user } = useAuth();
  const canManage = user?.role === 'admin';
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [roads, setRoads] = useState<Road[]>([]);
  const [filtered, setFiltered] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [form, setForm] = useState<CameraFormState>(EMPTY_CAMERA_FORM);
  const [saving, setSaving] = useState(false);

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
    if (!canManage) return;
    roadsAPI.getAll()
      .then(setRoads)
      .catch(() => { /* roads load optional until form opens */ });
  }, [canManage]);

  const openCreateForm = () => {
    if (roads.length === 0) {
      roadsAPI.getAll().then(setRoads).catch(() => toast.error(t('pages.cameras.loadFailed')));
    }
    setEditingCamera(null);
    setForm({ ...EMPTY_CAMERA_FORM, road: roads[0] ? String(roads[0].id) : '' });
    setFormOpen(true);
  };

  const openEditForm = (camera: Camera) => {
    setEditingCamera(camera);
    setForm(cameraToForm(camera));
    setFormOpen(true);
  };

  const handleSaveCamera = async () => {
    if (!form.road || !form.name.trim()) {
      toast.error(t('pages.cameras.formRequired'));
      return;
    }
    setSaving(true);
    try {
      const payload = buildCameraPayload(form);
      if (editingCamera) {
        const updated = await camerasAPI.update(editingCamera.id, payload);
        setCameras((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toast.success(t('pages.cameras.toastUpdated'));
      } else {
        const created = await camerasAPI.create(payload);
        setCameras((prev) => [...prev, created]);
        setSelectedId(created.id);
        toast.success(t('pages.cameras.toastCreated'));
      }
      setFormOpen(false);
      setEditingCamera(null);
      setForm(EMPTY_CAMERA_FORM);
    } catch {
      toast.error(editingCamera ? t('pages.cameras.toastUpdateFail') : t('pages.cameras.toastCreateFail'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCamera = async (camera: Camera) => {
    if (!window.confirm(t('pages.cameras.confirmDelete', { name: camera.name }))) return;
    try {
      await camerasAPI.delete(camera.id);
      setCameras((prev) => prev.filter((c) => c.id !== camera.id));
      setSelectedId((prev) => (prev === camera.id ? null : prev));
      toast.success(t('pages.cameras.toastDeleted'));
    } catch {
      toast.error(t('pages.cameras.toastDeleteFail'));
    }
  };

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
    if (!autoRefresh || !selected || selected.status === 'inactive') return;
    if (!resolveCameraFrameUrl(selected.frame_source_url, selected)) return;
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
            {canManage && (
              <button
                type="button"
                className="cameras-tool-btn cameras-tool-btn--primary"
                onClick={openCreateForm}
              >
                <span className="cameras-tool-btn__icon">
                  <Plus size={20} />
                </span>
                <span className="cameras-tool-btn__copy">
                  <span className="cameras-tool-btn__label">{t('pages.cameras.addCamera')}</span>
                  <span className="cameras-tool-btn__hint">{t('pages.cameras.addCameraHint')}</span>
                </span>
              </button>
            )}
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
              canManage={canManage}
              onEdit={() => selected && openEditForm(selected)}
              onDelete={() => selected && void handleDeleteCamera(selected)}
              t={t}
            />
          </div>
        </main>
      </div>

      <CameraFormDialog
        open={formOpen}
        editing={editingCamera}
        form={form}
        roads={roads}
        saving={saving}
        onChange={setForm}
        onClose={() => { setFormOpen(false); setEditingCamera(null); }}
        onSave={() => void handleSaveCamera()}
        t={t}
      />
    </div>
  );
}
