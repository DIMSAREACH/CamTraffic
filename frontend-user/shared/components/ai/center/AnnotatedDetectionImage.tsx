import { useMemo } from 'react';
import { LiveDetectionOverlay } from '@shared/components/ai/LiveDetectionOverlay';
import { DetectionDisplayImage } from '@shared/components/ai/DetectionDisplayImage';
import { useLanguage } from '@shared/context/LanguageContext';
import { buildDetectionOverlay, type OverlayDetectionInput } from '@shared/utils/detectionOverlay';
import { cn } from '@shared/components/ui/utils';

interface AnnotatedDetectionImageProps {
  src: string;
  alt: string;
  result?: OverlayDetectionInput | null;
  className?: string;
  hero?: boolean;
  filterKind?: 'all' | 'sign' | 'vehicle' | 'plate';
}

export function AnnotatedDetectionImage({
  src,
  alt,
  result,
  className,
  hero = false,
  filterKind = 'all',
}: AnnotatedDetectionImageProps) {
  const { locale, t } = useLanguage();
  const overlayItems = useMemo(() => {
    const items = buildDetectionOverlay(result, locale === 'en' ? 'en' : 'km');
    if (filterKind === 'all') return items;
    return items.filter((item) => item.kind === filterKind);
  }, [result, locale, filterKind]);

  return (
    <div
      className={cn(
        'ai-center-annotated-image',
        hero && 'ai-center-annotated-image--hero',
        filterKind !== 'all' && `ai-center-annotated-image--filter-${filterKind}`,
        className,
      )}
    >
      <DetectionDisplayImage src={src} alt={alt} variant="result" className="ai-center-annotated-image__img" />
      {overlayItems.length > 0 && (
        <div className="ai-center-annotated-image__overlay">
          <LiveDetectionOverlay
            items={overlayItems}
            legendSign={t('aiCenter.legendSign')}
            legendVehicle={t('aiCenter.legendVehicle')}
            legendPlate={t('aiCenter.legendPlate')}
          />
        </div>
      )}
    </div>
  );
}
