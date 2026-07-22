import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Layers, Check } from 'lucide-react';

export type LocationsMapPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: 'cameras' | 'roads';
};

type MapBaseLayer = 'default' | 'satellite' | 'terrain';

const DEFAULT_CENTER: [number, number] = [11.5564, 104.9282];
const DEFAULT_ZOOM = 13;

const BASE_LAYERS: Record<MapBaseLayer, {
  url: string;
  attribution: string;
  maxZoom: number;
  labelsUrl?: string;
}> = {
  default: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 20,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19,
    labelsUrl: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap, SRTM | OpenTopoMap',
    maxZoom: 17,
  },
};

function MapController({ points }: { points: LocationsMapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    map.invalidateSize();
    if (!points.length) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.14), { maxZoom: 15, animate: false });
  }, [map, points]);

  return null;
}

function pinIcon(kind: 'cameras' | 'roads', dim: boolean) {
  const fill = kind === 'cameras' ? '#1a73e8' : '#188038';
  const opacity = dim ? '0.35' : '1';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40" style="opacity:${opacity}">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="${fill}"/>
      <circle cx="14" cy="14" r="5.5" fill="#fff"/>
    </svg>
  `;
  return L.divIcon({
    className: 'cam-loc__gpin',
    html: svg,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -36],
  });
}

type LocationsMapProps = {
  points: LocationsMapPoint[];
  activeKind?: 'cameras' | 'roads';
  emptyTitle: string;
  emptyHint: string;
  regionLabel: string;
  camerasLabel: string;
  roadsLabel: string;
  ariaLabel: string;
  layersLabel: string;
  mapTypeLabel: string;
  defaultMapLabel: string;
  satelliteLabel: string;
  terrainLabel: string;
  mapDetailsLabel: string;
};

export function LocationsMap({
  points,
  activeKind,
  emptyTitle,
  emptyHint,
  regionLabel,
  camerasLabel,
  roadsLabel,
  ariaLabel,
  layersLabel,
  mapTypeLabel,
  defaultMapLabel,
  satelliteLabel,
  terrainLabel,
  mapDetailsLabel,
}: LocationsMapProps) {
  const [baseLayer, setBaseLayer] = useState<MapBaseLayer>('default');
  const [layersOpen, setLayersOpen] = useState(false);
  const [showCameras, setShowCameras] = useState(true);
  const [showRoads, setShowRoads] = useState(true);

  const markerPoints = useMemo(
    () => points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)),
    [points],
  );

  const visiblePoints = useMemo(
    () => markerPoints.filter((p) => (p.kind === 'cameras' ? showCameras : showRoads)),
    [markerPoints, showCameras, showRoads],
  );

  const icons = useMemo(() => ({
    cameras: {
      active: pinIcon('cameras', false),
      dim: pinIcon('cameras', true),
    },
    roads: {
      active: pinIcon('roads', false),
      dim: pinIcon('roads', true),
    },
  }), []);

  const layer = BASE_LAYERS[baseLayer];

  const baseOptions: { id: MapBaseLayer; label: string; preview: string }[] = [
    { id: 'default', label: defaultMapLabel, preview: 'cam-loc__layer-preview--default' },
    { id: 'satellite', label: satelliteLabel, preview: 'cam-loc__layer-preview--satellite' },
    { id: 'terrain', label: terrainLabel, preview: 'cam-loc__layer-preview--terrain' },
  ];

  return (
    <div className="cam-loc__map-canvas cam-loc__map-canvas--live cam-loc__map-canvas--gmaps" aria-label={ariaLabel}>
      <MapContainer
        className="cam-loc__leaflet cam-loc__leaflet--gmaps"
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          key={baseLayer}
          url={layer.url}
          attribution={layer.attribution}
          maxZoom={layer.maxZoom}
        />
        {layer.labelsUrl ? (
          <TileLayer
            key={`${baseLayer}-labels`}
            url={layer.labelsUrl}
            pane="overlayPane"
            zIndex={450}
          />
        ) : null}
        <ZoomControl position="bottomright" />
        <MapController points={markerPoints} />
        {visiblePoints.map((p) => {
          const isCamera = p.kind === 'cameras';
          const dim = activeKind != null && p.kind !== activeKind;
          return (
            <Marker
              key={`${p.kind}-${p.id}`}
              position={[p.lat, p.lng]}
              icon={icons[p.kind][dim ? 'dim' : 'active']}
              opacity={1}
              zIndexOffset={dim ? 0 : 200}
            >
              <Popup className="cam-loc__gpopup" closeButton>
                <div className="cam-loc__map-popup cam-loc__map-popup--gmaps">
                  <strong>{p.name}</strong>
                  <span className={isCamera ? 'cam-loc__map-popup-tag--cam' : 'cam-loc__map-popup-tag--road'}>
                    {isCamera ? camerasLabel : roadsLabel}
                  </span>
                  <code>{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</code>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="cam-loc__map-overlay" aria-hidden>
        <span className="cam-loc__map-chip cam-loc__map-chip--gmaps">{regionLabel}</span>
      </div>

      {markerPoints.length === 0 ? (
        <div className="cam-loc__map-empty cam-loc__map-empty--overlay">
          <p className="cam-loc__map-empty-title">{emptyTitle}</p>
          <p className="cam-loc__map-empty-hint">{emptyHint}</p>
        </div>
      ) : null}

      <div className="cam-loc__map-legend cam-loc__map-legend--gmaps" aria-hidden>
        {showCameras ? (
          <span className="cam-loc__legend-chip cam-loc__legend-chip--camera">
            <span className="cam-loc__legend-pin" aria-hidden>
              <svg width="12" height="16" viewBox="0 0 28 40" fill="none">
                <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="currentColor"/>
                <circle cx="14" cy="14" r="5.5" fill="#fff"/>
              </svg>
            </span>
            {camerasLabel}
          </span>
        ) : null}
        {showRoads ? (
          <span className="cam-loc__legend-chip cam-loc__legend-chip--road">
            <span className="cam-loc__legend-pin" aria-hidden>
              <svg width="12" height="16" viewBox="0 0 28 40" fill="none">
                <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="currentColor"/>
                <circle cx="14" cy="14" r="5.5" fill="#fff"/>
              </svg>
            </span>
            {roadsLabel}
          </span>
        ) : null}
      </div>

      <div className={`cam-loc__layers ${layersOpen ? 'cam-loc__layers--open' : ''}`}>
        {layersOpen ? (
          <div className="cam-loc__layers-panel" role="dialog" aria-label={layersLabel}>
            <div className="cam-loc__layers-section">
              <p className="cam-loc__layers-heading">{mapTypeLabel}</p>
              <div className="cam-loc__layers-types">
                {baseOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`cam-loc__layer-card ${baseLayer === opt.id ? 'is-active' : ''}`}
                    onClick={() => setBaseLayer(opt.id)}
                  >
                    <span className={`cam-loc__layer-preview ${opt.preview}`}>
                      {baseLayer === opt.id ? (
                        <span className="cam-loc__layer-check"><Check size={12} strokeWidth={3} /></span>
                      ) : null}
                    </span>
                    <span className="cam-loc__layer-label">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="cam-loc__layers-section">
              <p className="cam-loc__layers-heading">{mapDetailsLabel}</p>
              <label className="cam-loc__layers-toggle">
                <input
                  type="checkbox"
                  checked={showCameras}
                  onChange={(e) => setShowCameras(e.target.checked)}
                />
                <span className="cam-loc__layers-toggle-pin cam-loc__layers-toggle-pin--cam" />
                {camerasLabel}
              </label>
              <label className="cam-loc__layers-toggle">
                <input
                  type="checkbox"
                  checked={showRoads}
                  onChange={(e) => setShowRoads(e.target.checked)}
                />
                <span className="cam-loc__layers-toggle-pin cam-loc__layers-toggle-pin--road" />
                {roadsLabel}
              </label>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          className="cam-loc__layers-btn"
          aria-expanded={layersOpen}
          aria-label={layersLabel}
          onClick={() => setLayersOpen((open) => !open)}
        >
          <span className="cam-loc__layers-btn-icon" aria-hidden>
            <Layers size={18} />
          </span>
          <span className="cam-loc__layers-btn-text">{layersLabel}</span>
        </button>
      </div>
    </div>
  );
}
