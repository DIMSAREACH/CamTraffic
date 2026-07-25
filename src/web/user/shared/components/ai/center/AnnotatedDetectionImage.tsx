import { useMemo, useRef } from 'react';
import { LiveDetectionOverlay } from '@shared/components/ai/LiveDetectionOverlay';
import { useLanguage } from '@shared/context/LanguageContext';
import { useContainFitRect } from '@shared/hooks/useContainFitRect';
import { buildDetectionOverlay, type OverlayDetectionInput } from '@shared/utils/detectionOverlay';
import { cn } from '@shared/components/ui/utils';

interface AnnotatedDetectionImageProps {
  src: string;
  alt: string;
  result?: OverlayDetectionInput | null;
  className?: string;
  hero?: boolean;
  filterKind?: 'all' | 'sign' | 'vehicle' | 'plate';
  /** When false, show the image only (e.g. already baked OpenCV annotations). */
  showOverlay?: boolean;
}

export function AnnotatedDetectionImage({
  src,
  alt,
  result,
  className,
  hero = false,
  filterKind = 'all',
  showOverlay = true,
}: AnnotatedDetectionImageProps) {
  const { locale, t } = useLanguage();
  const imgRef = useRef<HTMLImageElement>(null);
  const overlayItems = useMemo(() => {
    if (!showOverlay) return [];
    const items = buildDetectionOverlay(result, locale === 'en' ? 'en' : 'km');
    if (filterKind === 'all') return items;
    return items.filter((item) => item.kind === filterKind);
  }, [result, locale, filterKind, showOverlay]);

  const fit = useContainFitRect(imgRef, overlayItems.length > 0);

  return (
    <div
      className={cn(
        'ai-center-annotated-image',
        hero && 'ai-center-annotated-image--hero',
        filterKind !== 'all' && `ai-center-annotated-image--filter-${filterKind}`,
        className,
      )}
    >
      <div className="ai-center-annotated-image__frame">
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          decoding="sync"
          draggable={false}
          className="ai-center-annotated-image__img"
        />
        {overlayItems.length > 0 && fit && fit.width > 0 && fit.height > 0 ? (
          <div
            className="ai-center-annotated-image__overlay"
            style={{
              left: fit.left,
              top: fit.top,
              width: fit.width,
              height: fit.height,
            }}
          >
            <LiveDetectionOverlay
              items={overlayItems}
              legendSign={t('aiCenter.legendSign')}
              legendVehicle={t('aiCenter.legendVehicle')}
              legendPlate={t('aiCenter.legendPlate')}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
