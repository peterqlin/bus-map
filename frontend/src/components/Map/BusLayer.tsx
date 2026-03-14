import { Source, Layer } from 'react-map-gl';
import type { FeatureCollection, Polygon, Point } from 'geojson';
import type { VehicleLocation, Route } from '../../types/mtd';
import { busPolygon, BUS_HEIGHT_M } from '../../utils/busGeometry';

interface BusLayerProps {
  buses: VehicleLocation[];
  activeRoutes: Set<string>;
  routes: Route[];
}

function busProperties(b: VehicleLocation, color: string) {
  return {
    vehicle_id: b.vehicle_id,
    route_id: b.route_id,
    trip_id: b.trip_id,
    shape_id: b.shape_id,
    next_stop_id: b.next_stop_id,
    last_updated: b.last_updated,
    heading: b.heading,
    lat: b.lat,
    lon: b.lon,
    color,
  };
}

export default function BusLayer({ buses, activeRoutes, routes }: BusLayerProps) {
  const routeColor = new Map(routes.map((r) => [r.route_id, `#${r.route_color}`]));
  const filtered = buses.filter((b) => activeRoutes.has(b.route_id));

  // Polygon source — directional fill-extrusion body
  const polygonGeojson: FeatureCollection<Polygon> = {
    type: 'FeatureCollection',
    features: filtered.map((b) => {
      const color = routeColor.get(b.route_id) ?? '#3b82f6';
      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [busPolygon(b.lat, b.lon, b.heading)],
        },
        properties: busProperties(b, color),
      };
    }),
  };

  // Point source — circle glow layers
  const pointGeojson: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features: filtered.map((b) => {
      const color = routeColor.get(b.route_id) ?? '#3b82f6';
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [b.lon, b.lat] },
        properties: busProperties(b, color),
      };
    }),
  };

  return (
    <>
      {/* Directional body — elongated 3D extrusion showing heading */}
      <Source id="buses" type="geojson" data={polygonGeojson}>
        <Layer
          id="bus-layer"
          type="fill-extrusion"
          paint={{
            'fill-extrusion-color': ['get', 'color'],
            'fill-extrusion-height': BUS_HEIGHT_M,
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.85,
          }}
        />
      </Source>

      {/* Glow system — three circle layers on top of the extrusion */}
      <Source id="buses-points" type="geojson" data={pointGeojson}>
        {/* Outer diffuse halo */}
        <Layer
          id="bus-glow-outer"
          type="circle"
          paint={{
            'circle-radius': 22,
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.18,
            'circle-blur': 1,
          }}
        />
        {/* Inner bloom */}
        <Layer
          id="bus-glow-inner"
          type="circle"
          paint={{
            'circle-radius': 13,
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.38,
            'circle-blur': 0.4,
          }}
        />
        {/* Solid dot with white ring — primary click target */}
        <Layer
          id="bus-dot"
          type="circle"
          paint={{
            'circle-radius': 7,
            'circle-color': ['get', 'color'],
            'circle-opacity': 1,
            'circle-stroke-width': 2,
            'circle-stroke-color': 'white',
            'circle-stroke-opacity': 0.9,
          }}
        />
      </Source>
    </>
  );
}
