import type { OverlayBox } from '@shared/utils/detectionOverlay';

interface LiveDetectionOverlayProps {
  items: OverlayBox[];
  showLegend?: boolean;
  legendSign?: string;
  legendVehicle?: string;
  legendPlate?: string;
}

export function LiveDetectionOverlay({
  items,
  showLegend = true,
  legendSign = 'Sign',
  legendVehicle = 'Vehicle',
  legendPlate = 'Plate',
}: LiveDetectionOverlayProps) {
  if (items.length === 0) return null;

  const kinds = new Set(items.map((item) => item.kind));

  return (
    <div className="ai-live-overlay">
      {items.map((item) => {
        const width = Math.max(0, (item.bbox.x2 - item.bbox.x1) * 100);
        const height = Math.max(0, (item.bbox.y2 - item.bbox.y1) * 100);
        return (
          <div
            key={item.id}
            className="ai-live-overlay__box"
            style={{
              left: `${item.bbox.x1 * 100}%`,
              top: `${item.bbox.y1 * 100}%`,
              width: `${width}%`,
              height: `${height}%`,
              ['--box-color' as string]: item.color,
            }}
          >
            <span className="ai-live-overlay__label">
              {item.label}
              {item.confidence > 0 ? ` ${Math.round(item.confidence)}%` : ''}
            </span>
          </div>
        );
      })}

      {showLegend && (
        <div className="ai-live-overlay__legend">
          {kinds.has('sign') && (
            <span className="ai-live-overlay__legend-item">
              <span className="ai-live-overlay__swatch" style={{ background: '#8B5CF6' }} />
              {legendSign}
            </span>
          )}
          {kinds.has('vehicle') && (
            <span className="ai-live-overlay__legend-item">
              <span className="ai-live-overlay__swatch" style={{ background: '#22D3EE' }} />
              {legendVehicle}
            </span>
          )}
          {kinds.has('plate') && (
            <span className="ai-live-overlay__legend-item">
              <span className="ai-live-overlay__swatch" style={{ background: '#F59E0B' }} />
              {legendPlate}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
