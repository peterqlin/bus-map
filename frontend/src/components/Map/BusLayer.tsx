import { Source, Layer } from 'react-map-gl';
import type { FeatureCollection, Polygon } from 'geojson';
import type { VehicleLocation, Route } from '../../types/mtd';

interface BusLayerProps {
  buses: VehicleLocation[];
  activeRoutes: Set<string>;
  routes: Route[];
}

// Bus physical dimensions (meters)
const BUS_LENGTH_M = 12;
const BUS_WIDTH_M = 2.5;
const BUS_HEIGHT_M = 3.5;

/** Convert meters to degrees latitude (constant anywhere on earth) */
function mToLat(m: number): number {
  return m / 111_000;
}

/** Convert meters to degrees longitude (varies with latitude) */
function mToLon(m: number, lat: number): number {
  return m / (111_000 * Math.cos((lat * Math.PI) / 180));
}

/**
 * Build a closed GeoJSON polygon ring for a bus rectangle.
 * heading = degrees clockwise from north (0 = north, 90 = east).
 */
function busPolygon(lat: number, lon: number, heading: number): number[][] {
  const halfLen = mToLat(BUS_LENGTH_M / 2);
  const halfWid = mToLon(BUS_WIDTH_M / 2, lat);

  // Clockwise rotation angle (heading 0 = north = +y axis)
  const θ = (heading * Math.PI) / 180;
  const cosθ = Math.cos(θ);
  const sinθ = Math.sin(θ);

  // Rotate (dLon, dLat) offset clockwise by θ
  function rot(dLon: number, dLat: number): [number, number] {
    return [
      dLon * cosθ + dLat * sinθ,   // new longitude offset
      -dLon * sinθ + dLat * cosθ,  // new latitude offset
    ];
  }

  // Four corners of the rectangle aligned north-south before rotation
  const corners: [number, number][] = [
    [-halfWid, -halfLen],
    [ halfWid, -halfLen],
    [ halfWid,  halfLen],
    [-halfWid,  halfLen],
  ];

  const ring = corners.map(([dLon, dLat]) => {
    const [rLon, rLat] = rot(dLon, dLat);
    return [lon + rLon, lat + rLat];
  });
  ring.push(ring[0]); // close ring
  return ring;
}

export default function BusLayer({ buses, activeRoutes, routes }: BusLayerProps) {
  const routeColor = new Map(routes.map((r) => [r.route_id, `#${r.route_color}`]));

  const filtered = buses.filter((b) => activeRoutes.has(b.route_id));

  const geojson: FeatureCollection<Polygon> = {
    type: 'FeatureCollection',
    features: filtered.map((b) => ({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [busPolygon(b.lat, b.lon, b.heading)],
      },
      properties: {
        vehicle_id: b.vehicle_id,
        route_id: b.route_id,
        trip_id: b.trip_id,
        shape_id: b.shape_id,
        next_stop_id: b.next_stop_id,
        last_updated: b.last_updated,
        heading: b.heading,
        lat: b.lat,
        lon: b.lon,
        color: routeColor.get(b.route_id) ?? '#3b82f6',
      },
    })),
  };

  return (
    <Source id="buses" type="geojson" data={geojson}>
      <Layer
        id="bus-layer"
        type="fill-extrusion"
        paint={{
          'fill-extrusion-color': ['get', 'color'],
          'fill-extrusion-height': BUS_HEIGHT_M,
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.95,
        }}
      />
    </Source>
  );
}
