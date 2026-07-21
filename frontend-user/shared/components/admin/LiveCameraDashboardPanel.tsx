import { Cctv, MapPin, Radio } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import { resolveCameraFrameUrl } from '@shared/constants/cameraFrameDemo';
import type { Camera, CameraStatus } from '@shared/types';
import { cn } from '@shared/components/ui/utils';

const STATUS_STYLE: Record<CameraStatus, { color: string; bg: string; border: string }> = {
  active: { color: '#059669', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.28)' },
  inactive: { color: '#64748B', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)' },
  maintenance: { color: '#D97706', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.28)' },
};

function frameUrl(base: string, tick: number) {
  if (!base) return '';
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}_t=${tick}`;
}

function LiveCameraCard({
  camera,
  refreshTick,
  selected,
  compact,
  dock,
  onSelect,
}: {
  camera: Camera;
  refreshTick: number;
  selected: boolean;
  compact?: boolean;
  dock?: boolean;
  onSelect: (id: string) => void;
}) {
  const { t } = useLanguage();
  const meta = STATUS_STYLE[camera.status];
  const isActive = camera.status === 'active';
  const src = isActive ? resolveCameraFrameUrl(camera.frame_source_url, camera) : '';
  const bust = src ? frameUrl(src, refreshTick) : '';

  return (
    <button
      type="button"
      onClick={() => onSelect(camera.id)}
      className={cn(
        'cameras-live-card',
        compact && 'cameras-live-card--compact',
        dock && 'cameras-live-card--dock',
        selected && 'cameras-live-card--selected',
        !isActive && 'cameras-live-card--offline',
      )}
    >
      <div className="cameras-live-card__viewport">
        {bust ? (
          <img src={bust} alt="" className="cameras-live-card__img" loading="lazy" />
        ) : (
          <div className={cn('cameras-live-card__placeholder', dock && 'cameras-live-card__placeholder--dock')}>
            <Cctv size={dock ? 26 : compact ? 20 : 28} strokeWidth={1.5} />
            {!dock && (
              <span>{isActive ? t('liveCameraDashboard.noFeed') : t(`pages.cameras.status.${camera.status}`)}</span>
            )}
          </div>
        )}
        {isActive && bust && !compact && (
          <span className="cameras-live-card__live">
            <span className="cameras-live-card__live-dot" />
            {t('pages.cameras.liveBadge')}
          </span>
        )}
        {compact && !dock && (
          <div className="cameras-live-card__dock-label">
            <span className="cameras-live-card__dock-name">{camera.name}</span>
            <span
              className="cameras-live-card__dock-status"
              style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}
            >
              {t(`pages.cameras.status.${camera.status}`)}
            </span>
          </div>
        )}
      </div>
      {dock && (
        <div className="cameras-live-card__dock-footer">
          <span className="cameras-live-card__dock-name">{camera.name}</span>
          <span
            className="cameras-live-card__dock-status"
            style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}
          >
            {t(`pages.cameras.status.${camera.status}`)}
          </span>
        </div>
      )}
      {!compact && (
      <div className="cameras-live-card__meta">
        <p className="cameras-live-card__name">{camera.name}</p>
        <p className="cameras-live-card__road">
          <MapPin size={11} aria-hidden />
          {camera.road_name}
        </p>
        <span
          className="cameras-live-card__status"
          style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}
        >
          {t(`pages.cameras.status.${camera.status}`)}
        </span>
      </div>
      )}
    </button>
  );
}

export function LiveCameraDashboardPanel({
  cameras,
  refreshTick,
  selectedId,
  onSelect,
  compact = false,
  dock = false,
}: {
  cameras: Camera[];
  refreshTick: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  compact?: boolean;
  dock?: boolean;
}) {
  const { t } = useLanguage();
  const sorted = [...cameras].sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    return a.name.localeCompare(b.name);
  });

  if (cameras.length === 0) {
    return (
      <div className={cn('cameras-live-overview', compact && 'cameras-live-overview--compact')}>
        <p className="cameras-live-overview__empty">{t('liveCameraDashboard.empty')}</p>
      </div>
    );
  }

  return (
    <section className={cn('cameras-live-overview', compact && 'cameras-live-overview--compact', dock && 'cameras-live-overview--dock')}>
      {!compact && (
        <header className="cameras-live-overview__header">
          <div className="cameras-live-overview__title-row">
            <Radio size={17} className="cameras-live-overview__icon" />
            <div>
              <h2 className="cameras-live-overview__title">{t('liveCameraDashboard.title')}</h2>
              <p className="cameras-live-overview__subtitle">{t('liveCameraDashboard.subtitle')}</p>
            </div>
          </div>
        </header>
      )}
      <div className={cn('cameras-live-overview__grid', compact && 'cameras-live-overview__grid--strip')}>
        {sorted.map((camera) => (
          <LiveCameraCard
            key={camera.id}
            camera={camera}
            refreshTick={refreshTick}
            selected={camera.id === selectedId}
            compact={compact}
            dock={dock}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
