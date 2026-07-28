import type { OverlayBox } from '@shared/utils/detectionOverlay';
import { cn } from '@shared/components/ui/utils';

interface LiveDetectionOverlayProps {
  items: OverlayBox[];
  showLegend?: boolean;
  legendSign?: string;
  legendVehicle?: string;
  legendPlate?: string;
  legendHelmet?: string;
  legendNoHelmet?: string;
  /** When set (View action), emphasize this box and dim the rest. */
  highlightId?: string;
}

/** Ultralytics-style confidence: "0.77" (0–1), never "77%". */
function formatYoloConfidence(confidence: number): string {
  if (!Number.isFinite(confidence) || confidence <= 0) return '';
  const c01 = confidence > 1.5 ? confidence / 100 : confidence;
  return Math.min(1, Math.max(0, c01)).toFixed(2);
}

export function LiveDetectionOverlay({
  items,
  showLegend = true,
  legendSign = 'Sign',
  legendVehicle = 'Vehicle',
  legendPlate = 'Plate',
  legendHelmet = 'Helmet',
  legendNoHelmet = 'No Helmet',
  highlightId,
}: LiveDetectionOverlayProps) {
  if (items.length === 0) return null;

  const kinds = new Set(items.map((item) => item.kind));
  const focusing = Boolean(highlightId);

  return (
    <div className={cn('ai-live-overlay', focusing && 'ai-live-overlay--focus')}>
      {items.map((item) => {
        const width = Math.max(0, (item.bbox.x2 - item.bbox.x1) * 100);
        const height = Math.max(0, (item.bbox.y2 - item.bbox.y1) * 100);
        const confTxt = formatYoloConfidence(item.confidence);
        const text = confTxt ? `${item.label} ${confTxt}` : item.label;
        // Keep full label visible inside the frame (avoid clipping at top/edges).
        const nearTop = item.bbox.y1 < 0.12;
        const nearRight = item.bbox.x2 > 0.88;
        const narrowBox = (item.bbox.x2 - item.bbox.x1) < 0.12;
        const isFocus = focusing && item.id === highlightId;
        const isDim = focusing && !isFocus;
        return (
          <div
            key={item.id}
            className={cn(
              `ai-live-overlay__box ai-live-overlay__box--${item.kind}`,
              isFocus && 'is-focus',
              isDim && 'is-dim',
            )}
            style={{
              left: `${item.bbox.x1 * 100}%`,
              top: `${item.bbox.y1 * 100}%`,
              width: `${width}%`,
              height: `${height}%`,
              ['--box-color' as string]: item.color,
            }}
          >
            {item.kind === 'sign' ? (
              <>
                <span className="ai-live-overlay__crosshair" aria-hidden>
                  <span className="ai-live-overlay__crosshair-h" />
                  <span className="ai-live-overlay__crosshair-v" />
                </span>
                <span className="ai-live-overlay__center" aria-hidden />
              </>
            ) : null}
            <span
              className={cn(
                'ai-live-overlay__label',
                (nearTop || narrowBox) && 'ai-live-overlay__label--inside',
                nearRight && 'ai-live-overlay__label--right',
              )}
              title={text}
            >
              {text}
            </span>
          </div>
        );
      })}

      {showLegend && (
        <div className="ai-live-overlay__legend">
          {kinds.has('sign') && (
            <span className="ai-live-overlay__legend-item">
              <span className="ai-live-overlay__swatch" style={{ background: '#00FF00' }} />
              {legendSign}
            </span>
          )}
          {kinds.has('vehicle') && (
            <span className="ai-live-overlay__legend-item">
              <span className="ai-live-overlay__swatch" style={{ background: '#00FF00' }} />
              {legendVehicle}
            </span>
          )}
          {kinds.has('plate') && (
            <span className="ai-live-overlay__legend-item">
              <span className="ai-live-overlay__swatch" style={{ background: '#00FF00' }} />
              {legendPlate}
            </span>
          )}
          {kinds.has('helmet') && (
            <span className="ai-live-overlay__legend-item">
              <span className="ai-live-overlay__swatch" style={{ background: '#00FF00' }} />
              {legendHelmet}
            </span>
          )}
          {kinds.has('violation') && (
            <span className="ai-live-overlay__legend-item">
              <span className="ai-live-overlay__swatch" style={{ background: '#FF2D2D' }} />
              {legendNoHelmet}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
