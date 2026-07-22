import {
  Box, Camera, Car, Clock, Crosshair, Download, Eye, Hash, MapPin, ScanSearch, Tag,
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
  gpsLocation?: string | null;
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

export function DetectionObjectDetailsDrawer({
  object,
  open,
  onOpenChange,
  imageSrc,
  cameraLabel,
  capturedAt = new Date(),
  plateNumber,
  vehicleType,
  gpsLocation,
}: DetectionObjectDetailsDrawerProps) {
  const { t } = useLanguage();

  if (!object) return null;

  const tone = accentForObject(object);
  const accent = ACCENT[tone];
  const bbox = bboxToPixels(object.bbox);
  const bboxStr = bbox
    ? `x=${bbox.x} y=${bbox.y} w=${bbox.width} h=${bbox.height}`
    : null;
  const dateStr = capturedAt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = capturedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const conf = object.confidence;
  const cTone = confTone(conf);
  const preview = object.snapshot || imageSrc || '';

  const downloadCrop = () => {
    if (!preview) return;
    const a = document.createElement('a');
    a.href = preview;
    a.download = `detection-${object.id}.jpg`;
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
            {gpsLocation ? (
              <div className="enterprise-detection-popup__field is-gps">
                <dt><MapPin size={12} />{t('aiCenter.gpsLocation')}</dt>
                <dd>{gpsLocation}</dd>
              </div>
            ) : null}
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
