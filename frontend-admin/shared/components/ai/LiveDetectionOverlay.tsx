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
    <>
      {items.map((item) => {
        const width = (item.bbox.x2 - item.bbox.x1) * 100;
        const height = (item.bbox.y2 - item.bbox.y1) * 100;
        return (
          <div
            key={item.id}
            className="absolute pointer-events-none"
            style={{
              left: `${item.bbox.x1 * 100}%`,
              top: `${item.bbox.y1 * 100}%`,
              width: `${width}%`,
              height: `${height}%`,
            }}
          >
            <div
              className="absolute inset-0 rounded-sm"
              style={{
                border: `2px solid ${item.color}`,
                boxShadow: `0 0 0 1px rgba(0,0,0,0.35), 0 0 12px ${item.color}55`,
                background: `${item.color}12`,
              }}
            />
            <span
              className="absolute left-0 -top-5 max-w-[140%] truncate px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-md"
              style={{ background: item.color }}
            >
              {item.label}
              {item.confidence > 0 ? ` ${item.confidence.toFixed(0)}%` : ''}
            </span>
          </div>
        );
      })}

      {showLegend && (
        <div className="absolute top-2 right-2 flex flex-col gap-1 rounded-lg px-2 py-1.5 text-[9px] font-semibold text-white"
          style={{ background: 'rgba(15,23,42,0.78)', border: '1px solid rgba(255,255,255,0.12)' }}>
          {kinds.has('sign') && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: '#8B5CF6' }} />
              {legendSign}
            </span>
          )}
          {kinds.has('vehicle') && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: '#06B6D4' }} />
              {legendVehicle}
            </span>
          )}
          {kinds.has('plate') && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: '#F59E0B' }} />
              {legendPlate}
            </span>
          )}
        </div>
      )}
    </>
  );
}
