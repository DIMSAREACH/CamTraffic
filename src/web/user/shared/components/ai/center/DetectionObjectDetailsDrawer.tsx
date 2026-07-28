import { useEffect, useMemo, useState } from 'react';
import {
  Box, Camera, Car, Clock, Crosshair, Download, Eye, Hash, ScanSearch, Tag,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { useLanguage } from '@shared/context/LanguageContext';
import type { DetectionObjectRow } from '@shared/utils/enterpriseDetectionObjects';
import { bboxToPixels } from '@shared/utils/enterpriseDetectionObjects';
import type { NormalizedBbox } from '@shared/utils/detectionOverlay';
import { getProfileImageUrl } from '@shared/utils/profileImage';
import { cn } from '@shared/components/ui/utils';

interface DetectionObjectDetailsDrawerProps {
  object: DetectionObjectRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc?: string | null;
  cameraLabel?: string;
  capturedAt?: Date;
  plateNumber?: string | null;
  vehicleType?: string | null;
}

type AccentTone = 'violet' | 'blue' | 'amber' | 'rose' | 'teal';

const ACCENT: Record<AccentTone, string> = {
  violet: '#7C3AED',
  blue: '#2563EB',
  amber: '#D97706',
  rose: '#E11D48',
  teal: '#0891B2',
};

function accentForObject(object: DetectionObjectRow): AccentTone {
  if (object.kind === 'vehicle') return 'blue';
  if (object.kind === 'plate') return 'amber';
  const cat = object.category.toLowerCase();
  if (cat.includes('warning')) return 'amber';
  if (cat.includes('prohibit')) return 'rose';
  if (cat.includes('mandat') || cat.includes('regulat')) return 'teal';
  return 'violet';
}

function confTone(c: number): 'high' | 'mid' | 'low' {
  if (c >= 85) return 'high';
  if (c >= 60) return 'mid';
  return 'low';
}

function KindIcon({ kind }: { kind: DetectionObjectRow['kind'] }) {
  if (kind === 'vehicle') return <Car size={16} />;
  if (kind === 'plate') return <Hash size={16} />;
  return <ScanSearch size={16} />;
}

function resolveSrc(raw?: string | null): string {
  if (!raw) return '';
  return getProfileImageUrl(raw) || raw;
}

/** Pad normalized bbox slightly so the crop includes context around the detection. */
function padBbox(bbox: NormalizedBbox, pad = 0.04): NormalizedBbox {
  const w = Math.max(0, bbox.x2 - bbox.x1);
  const h = Math.max(0, bbox.y2 - bbox.y1);
  const px = Math.max(pad, w * 0.08);
  const py = Math.max(pad, h * 0.08);
  return {
    x1: Math.max(0, bbox.x1 - px),
    y1: Math.max(0, bbox.y1 - py),
    x2: Math.min(1, bbox.x2 + px),
    y2: Math.min(1, bbox.y2 + py),
  };
}

/**
 * Crop the detection frame to this object's bbox so View follows Detect.
 * Falls back to null when the image cannot be drawn (CORS / missing).
 */
function useDetectionCrop(
  imageSrc: string | null | undefined,
  snapshot: string | null | undefined,
  bbox: NormalizedBbox | undefined,
  label: string,
  accent: string,
): { preview: string; fromCrop: boolean } {
  const [cropUrl, setCropUrl] = useState<string>('');

  const resolvedSnapshot = useMemo(() => resolveSrc(snapshot), [snapshot]);
  const resolvedFrame = useMemo(() => resolveSrc(imageSrc), [imageSrc]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setCropUrl('');

    // Prefer server crop when present.
    if (resolvedSnapshot) {
      setCropUrl(resolvedSnapshot);
      return () => {
        cancelled = true;
      };
    }

    if (!resolvedFrame || !bbox) {
      if (resolvedFrame) setCropUrl(resolvedFrame);
      return () => {
        cancelled = true;
      };
    }

    const img = new Image();
    if (
      !resolvedFrame.startsWith('blob:')
      && !resolvedFrame.startsWith('data:')
      && !/^https?:\/\//i.test(resolvedFrame)
    ) {
      img.crossOrigin = 'anonymous';
    } else if (!/^https?:\/\//i.test(resolvedFrame) || resolvedFrame.startsWith(window.location.origin)) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      if (cancelled) return;
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) {
        setCropUrl(resolvedFrame);
        return;
      }

      const region = padBbox(bbox);
      const sx = Math.round(region.x1 * w);
      const sy = Math.round(region.y1 * h);
      const sw = Math.max(1, Math.round((region.x2 - region.x1) * w));
      const sh = Math.max(1, Math.round((region.y2 - region.y1) * h));

      const canvas = document.createElement('canvas');
      const maxEdge = 720;
      const scale = Math.min(1, maxEdge / Math.max(sw, sh));
      canvas.width = Math.max(1, Math.round(sw * scale));
      canvas.height = Math.max(1, Math.round(sh * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setCropUrl(resolvedFrame);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      // Draw the detection box relative to the padded crop (matches Detect overlay).
      const boxX = ((bbox.x1 - region.x1) / (region.x2 - region.x1)) * canvas.width;
      const boxY = ((bbox.y1 - region.y1) / (region.y2 - region.y1)) * canvas.height;
      const boxW = ((bbox.x2 - bbox.x1) / (region.x2 - region.x1)) * canvas.width;
      const boxH = ((bbox.y2 - bbox.y1) / (region.y2 - region.y1)) * canvas.height;
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(2, Math.round(Math.min(canvas.width, canvas.height) * 0.008));
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      const tag = (label || '').trim().slice(0, 28);
      if (tag) {
        const fontSize = Math.max(12, Math.round(canvas.width * 0.035));
        ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
        const padX = 8;
        const padY = 5;
        const tw = ctx.measureText(tag).width;
        const tagH = fontSize + padY * 2;
        const tagY = Math.max(0, boxY - tagH - 2);
        ctx.fillStyle = accent;
        ctx.fillRect(boxX, tagY, tw + padX * 2, tagH);
        ctx.fillStyle = '#fff';
        ctx.fillText(tag, boxX + padX, tagY + tagH - padY - 1);
      }

      try {
        objectUrl = canvas.toDataURL('image/jpeg', 0.92);
        setCropUrl(objectUrl);
      } catch {
        setCropUrl(resolvedFrame);
      }
    };

    img.onerror = () => {
      if (!cancelled) setCropUrl(resolvedFrame);
    };

    img.src = resolvedFrame;

    return () => {
      cancelled = true;
      if (objectUrl?.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
    };
  }, [resolvedSnapshot, resolvedFrame, bbox, label, accent]);

  const preview = cropUrl || resolvedSnapshot || resolvedFrame;
  const fromCrop = Boolean(cropUrl && !resolvedSnapshot && bbox);
  return { preview, fromCrop };
}

export function DetectionObjectDetailsDrawer({
  object,
  open,
  onOpenChange,
  imageSrc,
  cameraLabel,
  capturedAt = new Date(),
  plateNumber,
  vehicleType,
}: DetectionObjectDetailsDrawerProps) {
  const { t } = useLanguage();

  const tone = object ? accentForObject(object) : 'violet';
  const accent = ACCENT[tone];
  const { preview, fromCrop } = useDetectionCrop(
    imageSrc,
    object?.snapshot,
    object?.bbox,
    object?.name || '',
    accent,
  );

  if (!object) return null;

  const bbox = bboxToPixels(object.bbox);
  const bboxStr = bbox
    ? `x=${bbox.x} y=${bbox.y} w=${bbox.width} h=${bbox.height}`
    : null;
  const dateStr = capturedAt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = capturedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const conf = object.confidence;
  const cTone = confTone(conf);

  const downloadCrop = () => {
    if (!preview) return;
    const a = document.createElement('a');
    a.href = preview;
    a.download = `detection-${object.kind}-${object.id}.jpg`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'enterprise-detection-popup p-0 gap-0 overflow-hidden sm:max-w-xl',
          `enterprise-detection-popup--${tone}`,
        )}
      >
        <div className="enterprise-detection-popup__accent" style={{ background: accent }} aria-hidden />

        <DialogHeader className="enterprise-detection-popup__head">
          <div className="enterprise-detection-popup__head-row">
            <span
              className="enterprise-detection-popup__dot"
              style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
              aria-hidden
            />
            <div className="enterprise-detection-popup__head-copy min-w-0">
              <DialogTitle className="enterprise-detection-popup__title">
                {t('aiCenter.detectionDetails')}
              </DialogTitle>
              <DialogDescription className="enterprise-detection-popup__subtitle">
                {object.name}
              </DialogDescription>
            </div>
          </div>

          <div className="enterprise-detection-popup__chips">
            <span className={cn('enterprise-detection-popup__chip', `is-${object.kind}`, `is-tone-${tone}`)}>
              <KindIcon kind={object.kind} />
              {object.category}
            </span>
            <span className={cn('enterprise-detection-popup__chip is-conf', `is-${cTone}`)}>
              <Crosshair size={12} />
              {conf > 0 ? `${conf.toFixed(1)}%` : '—'}
            </span>
            {fromCrop ? (
              <span className="enterprise-detection-popup__chip is-tone-teal">
                <Eye size={12} />
                {t('aiCenter.fromDetect') !== 'aiCenter.fromDetect' ? t('aiCenter.fromDetect') : 'From detect'}
              </span>
            ) : null}
          </div>
        </DialogHeader>

        <div className="enterprise-detection-popup__body">
          <div className={cn('enterprise-detection-popup__crop', `is-${object.kind}`)}>
            {preview ? (
              <img
                src={preview}
                alt={object.name}
                className="enterprise-detection-popup__crop-img"
              />
            ) : (
              <div className="enterprise-detection-popup__crop-empty">
                <Eye size={22} />
                <span>{t('aiCenter.noCropAvailable')}</span>
              </div>
            )}
          </div>

          <dl className="enterprise-detection-popup__fields">
            <div className="enterprise-detection-popup__field is-name">
              <dt><ScanSearch size={12} />{t('aiCenter.objectName')}</dt>
              <dd>{object.name}</dd>
            </div>
            <div className="enterprise-detection-popup__field is-cat">
              <dt><Tag size={12} />{t('aiCenter.objectCategory')}</dt>
              <dd>{object.category}</dd>
            </div>
            <div className={cn('enterprise-detection-popup__field is-conf', `is-${cTone}`)}>
              <dt><Crosshair size={12} />{t('aiCenter.confidence')}</dt>
              <dd>{conf > 0 ? `${conf.toFixed(1)}%` : '—'}</dd>
            </div>
            {bboxStr ? (
              <div className="enterprise-detection-popup__field is-bbox">
                <dt><Box size={12} />{t('aiCenter.boundingBox')}</dt>
                <dd className="enterprise-detection-popup__mono">{bboxStr}</dd>
              </div>
            ) : null}
            {plateNumber ? (
              <div className="enterprise-detection-popup__field is-plate">
                <dt><Hash size={12} />{t('aiCenter.plateNumber')}</dt>
                <dd className="enterprise-detection-popup__mono">{plateNumber}</dd>
              </div>
            ) : null}
            {vehicleType ? (
              <div className="enterprise-detection-popup__field is-vehicle">
                <dt><Car size={12} />{t('aiCenter.vehicleType')}</dt>
                <dd>{vehicleType}</dd>
              </div>
            ) : null}
            {cameraLabel ? (
              <div className="enterprise-detection-popup__field is-camera">
                <dt><Camera size={12} />{t('aiCenter.cameraLabel')}</dt>
                <dd>{cameraLabel}</dd>
              </div>
            ) : null}
            <div className="enterprise-detection-popup__field is-time">
              <dt><Clock size={12} />{t('aiCenter.detectionTime')}</dt>
              <dd>{dateStr} {timeStr}</dd>
            </div>
          </dl>
        </div>

        <DialogFooter className="enterprise-detection-popup__footer">
          <button
            type="button"
            className="enterprise-detection-popup__download"
            style={{ background: accent, boxShadow: `0 8px 20px ${accent}55` }}
            onClick={downloadCrop}
            disabled={!preview}
          >
            <Download size={15} />
            {t('aiCenter.downloadCrop')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
