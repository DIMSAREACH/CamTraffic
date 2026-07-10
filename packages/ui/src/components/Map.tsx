import { cn } from '@camtraffic/utils';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  icon?: string;
}

export interface MapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  height?: string;
  className?: string;
  onMarkerClick?: (marker: MapMarker) => void;
}

/**
 * Map component placeholder.
 * This component will integrate with React Leaflet for interactive maps.
 * For now, it renders a placeholder with map details.
 */
export function Map({
  center,
  zoom = 13,
  markers = [],
  height = '400px',
  className,
  onMarkerClick,
}: MapProps) {
  return (
    <div className={cn('ct-map', className)} style={{ height }}>
      <div className="ct-map__placeholder">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor">
          <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
          <path d="M8 2v16M16 6v16" />
        </svg>
        <p className="ct-map__placeholder-text">
          Map View - Center: {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
        </p>
        {markers.length > 0 ? (
          <p className="ct-map__placeholder-info">{markers.length} markers</p>
        ) : null}
        <small className="ct-map__placeholder-note">
          React Leaflet integration pending
        </small>
      </div>
    </div>
  );
}
