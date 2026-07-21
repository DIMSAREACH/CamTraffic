import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const DEFAULT_CENTER: [number, number] = [11.5564, 104.9282];
const DEFAULT_ZOOM = 14;

type CoordinatePickerMapProps = {
  lat: number | null;
  lng: number | null;
  kind?: 'cameras' | 'roads';
  onPick: (lat: number, lng: number) => void;
  hint: string;
  ariaLabel: string;
};

function pickerIcon(kind: 'cameras' | 'roads') {
  const fill = kind === 'cameras' ? '#1a73e8' : '#188038';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="${fill}"/>
      <circle cx="14" cy="14" r="5.5" fill="#fff"/>
    </svg>
  `;
  return L.divIcon({
    className: 'cam-loc__gpin',
    html: svg,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
  });
}

function MapSync({
  lat,
  lng,
  onPick,
}: {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 120);
    return () => window.clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (lat == null || lng == null) return;
    const current = map.getCenter();
    if (Math.abs(current.lat - lat) < 0.00001 && Math.abs(current.lng - lng) < 0.00001) return;
    map.setView([lat, lng], Math.max(map.getZoom(), DEFAULT_ZOOM), { animate: false });
  }, [map, lat, lng]);

  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

export function CoordinatePickerMap({
  lat,
  lng,
  kind = 'cameras',
  onPick,
  hint,
  ariaLabel,
}: CoordinatePickerMapProps) {
  const hasPoint = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
  const center: [number, number] = hasPoint ? [lat, lng] : DEFAULT_CENTER;
  const icon = useMemo(() => pickerIcon(kind), [kind]);

  return (
    <div className="cam-loc__picker" aria-label={ariaLabel}>
      <MapContainer
        className="cam-loc__picker-map"
        center={center}
        zoom={hasPoint ? DEFAULT_ZOOM : 12}
        scrollWheelZoom
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap &copy; CARTO"
          maxZoom={20}
        />
        <MapSync lat={hasPoint ? lat : null} lng={hasPoint ? lng : null} onPick={onPick} />
        {hasPoint ? (
          <Marker
            position={[lat, lng]}
            icon={icon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const pos = e.target.getLatLng();
                onPick(pos.lat, pos.lng);
              },
            }}
          />
        ) : null}
      </MapContainer>
      <p className="cam-loc__picker-hint">{hint}</p>
    </div>
  );
}
