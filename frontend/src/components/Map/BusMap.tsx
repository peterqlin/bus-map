import { useRef, useCallback } from 'react';
import Map, { type MapRef, NavigationControl, ScaleControl } from 'react-map-gl';
import type { MapLayerMouseEvent } from 'mapbox-gl';
import type { VehicleLocation, Route, Stop, ShapePoint } from '../../types/mtd';
import BusLayer from './BusLayer';
import GhostLayer from './GhostLayer';
import RouteLayer from './RouteLayer';
import StopLayer from './StopLayer';
import BusPopup from '../BusPopup';

const UIUC_CENTER = { lng: -88.2272, lat: 40.1020 };
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

interface BusMapProps {
  buses: VehicleLocation[];
  routes: Route[];
  activeRoutes: Set<string>;
  shapes: Record<string, ShapePoint[]>;
  stops: Stop[];
  selectedBus: VehicleLocation | null;
  onBusClick: (bus: VehicleLocation) => void;
  onPopupClose: () => void;
}

export default function BusMap({
  buses,
  routes,
  activeRoutes,
  shapes,
  stops,
  selectedBus,
  onBusClick,
  onPopupClose,
}: BusMapProps) {
  const mapRef = useRef<MapRef>(null);

  const onMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // 3D buildings
    map.addLayer({
      id: '3d-buildings',
      source: 'composite',
      'source-layer': 'building',
      filter: ['==', 'extrude', 'true'],
      type: 'fill-extrusion',
      minzoom: 15,
      paint: {
        'fill-extrusion-color': '#aaa',
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': ['get', 'min_height'],
        'fill-extrusion-opacity': 0.6,
      },
    });

  }, []);

  const handleBusClick = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature?.properties) return;
    const props = feature.properties;
    if (!props.vehicle_id || !props.lat || !props.lon) return;
    onBusClick(props as VehicleLocation);
  }, [onBusClick]);

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={{
        longitude: UIUC_CENTER.lng,
        latitude: UIUC_CENTER.lat,
        zoom: 14,
        pitch: 45,
        bearing: 0,
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      onLoad={onMapLoad}
      interactiveLayerIds={['bus-layer', 'bus-dot']}
      onClick={handleBusClick}
    >
      <NavigationControl position="top-right" />
      <ScaleControl />
      <RouteLayer routes={routes} activeRoutes={activeRoutes} shapes={shapes} />
      <StopLayer stops={stops} />
      {/* GhostLayer must come before BusLayer so its Mapbox layers sit below real buses */}
      <GhostLayer buses={buses} shapes={shapes} routes={routes} activeRoutes={activeRoutes} />
      <BusLayer buses={buses} activeRoutes={activeRoutes} routes={routes} />
      {selectedBus && (
        <BusPopup bus={selectedBus} routes={routes} onClose={onPopupClose} />
      )}
    </Map>
  );
}
