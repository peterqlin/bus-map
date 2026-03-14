import { useEffect, useRef } from 'react';
import { useMap } from 'react-map-gl';
import type { GeoJSONSource } from 'mapbox-gl';
import type { Feature, FeatureCollection, Polygon } from 'geojson';
import type { VehicleLocation, ShapePoint, Route } from '../../types/mtd';
import { busPolygon, BUS_HEIGHT_M } from '../../utils/busGeometry';

// Approximate campus bus speed used for dead-reckoning.
const BUS_SPEED_MPS   = 10;   // m/s ≈ 36 km/h
const MAX_PREDICT_SEC = 60;   // cap ghost travel — avoids runaway when a bus is idle

// Trail dash geometry — rendered as fill-extrusion rectangles floating above ground.
const DASH_LEN_M   = 8;    // length of each dash (metres)
const DASH_GAP_M   = 8;    // gap between dashes (metres)
const DASH_WIDTH_M = 3;    // width of each dash (metres)
const TRAIL_BASE_M = 7;    // extrusion base — clears route lines on the ground
const TRAIL_TOP_M  = 9;    // extrusion top (2 m tall ribbon)

// Metric conversion constants at UIUC latitude (~40.1 °N).
const LAT_SCALE         = 111_000;
const LON_SCALE_AT_UIUC = 111_000 * Math.cos((40.1 * Math.PI) / 180);

// ─── polyline math ──────────────────────────────────────────────────────────

interface PolylinePos { segIdx: number; t: number; lat: number; lon: number; }

/** Closest projected point on a polyline to (lat, lon). */
function nearestOnPolyline(shape: ShapePoint[], lat: number, lon: number): PolylinePos {
  let bestDsq = Infinity;
  let best: PolylinePos = {
    segIdx: 0, t: 0,
    lat: shape[0].shape_pt_lat,
    lon: shape[0].shape_pt_lon,
  };

  for (let i = 0; i < shape.length - 1; i++) {
    const a = shape[i], b = shape[i + 1];
    const dx = (b.shape_pt_lon - a.shape_pt_lon) * LON_SCALE_AT_UIUC;
    const dy = (b.shape_pt_lat - a.shape_pt_lat) * LAT_SCALE;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0
      ? Math.max(0, Math.min(1,
          ((lon - a.shape_pt_lon) * LON_SCALE_AT_UIUC * dx +
           (lat - a.shape_pt_lat) * LAT_SCALE         * dy) / len2))
      : 0;
    const projLat = a.shape_pt_lat + t * (b.shape_pt_lat - a.shape_pt_lat);
    const projLon = a.shape_pt_lon + t * (b.shape_pt_lon - a.shape_pt_lon);
    const dsq =
      ((lat - projLat) * LAT_SCALE)         ** 2 +
      ((lon - projLon) * LON_SCALE_AT_UIUC) ** 2;
    if (dsq < bestDsq) {
      bestDsq = dsq;
      best = { segIdx: i, t, lat: projLat, lon: projLon };
    }
  }
  return best;
}

/** Walk `distM` metres forward along the polyline from `pos`. */
function walkForward(shape: ShapePoint[], pos: PolylinePos, distM: number): PolylinePos {
  let rem = distM;
  let { segIdx, t, lat, lon } = pos;

  while (rem > 0 && segIdx < shape.length - 1) {
    const a = shape[segIdx], b = shape[segIdx + 1];
    const dx = (b.shape_pt_lon - a.shape_pt_lon) * LON_SCALE_AT_UIUC;
    const dy = (b.shape_pt_lat - a.shape_pt_lat) * LAT_SCALE;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    if (segLen === 0) { segIdx++; continue; }

    const toEnd = segLen * (1 - t);
    if (rem <= toEnd) {
      t  += rem / segLen;
      lat = a.shape_pt_lat + t * (b.shape_pt_lat - a.shape_pt_lat);
      lon = a.shape_pt_lon + t * (b.shape_pt_lon - a.shape_pt_lon);
      rem = 0;
    } else {
      rem -= toEnd;
      segIdx++;
      t   = 0;
      lat = shape[segIdx].shape_pt_lat;
      lon = shape[segIdx].shape_pt_lon;
    }
  }
  return { segIdx, t, lat, lon };
}

/** Walk `distM` metres backward along the polyline from `pos`. */
function walkBackward(shape: ShapePoint[], pos: PolylinePos, distM: number): PolylinePos {
  let rem = distM;
  let { segIdx, t, lat, lon } = pos;

  while (rem > 0) {
    const a = shape[segIdx], b = shape[segIdx + 1];
    const dx = (b.shape_pt_lon - a.shape_pt_lon) * LON_SCALE_AT_UIUC;
    const dy = (b.shape_pt_lat - a.shape_pt_lat) * LAT_SCALE;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    if (segLen === 0) {
      if (segIdx === 0) break;
      segIdx--; t = 1;
      lat = shape[segIdx + 1].shape_pt_lat;
      lon = shape[segIdx + 1].shape_pt_lon;
      continue;
    }

    const toStart = segLen * t;
    if (rem <= toStart) {
      t   -= rem / segLen;
      lat  = a.shape_pt_lat + t * (b.shape_pt_lat - a.shape_pt_lat);
      lon  = a.shape_pt_lon + t * (b.shape_pt_lon - a.shape_pt_lon);
      rem  = 0;
    } else {
      rem -= toStart;
      if (segIdx === 0) {
        t = 0; lat = shape[0].shape_pt_lat; lon = shape[0].shape_pt_lon;
        break;
      }
      segIdx--; t = 1;
      lat = shape[segIdx + 1].shape_pt_lat;
      lon = shape[segIdx + 1].shape_pt_lon;
    }
  }
  return { segIdx, t, lat, lon };
}


/** Compass heading (degrees, 0=N clockwise) of segment `segIdx`. */
function segmentHeading(shape: ShapePoint[], segIdx: number): number {
  const i  = Math.min(segIdx, shape.length - 2);
  const dy = (shape[i + 1].shape_pt_lat - shape[i].shape_pt_lat) * LAT_SCALE;
  const dx = (shape[i + 1].shape_pt_lon - shape[i].shape_pt_lon) * LON_SCALE_AT_UIUC;
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
}

/** Smallest angle between two compass headings (0–180). */
function angularDiff(a: number, b: number): number {
  return Math.abs(((a - b + 180 + 360) % 360) - 180);
}

/**
 * Axis-aligned rectangle (in metres) rotated to `heading`, returned as a
 * closed GeoJSON ring.  Used for individual trail dash polygons.
 */
function dashPolygon(lat: number, lon: number, heading: number): number[][] {
  const halfLen = DASH_LEN_M  / 2;
  const halfWid = DASH_WIDTH_M / 2;
  const θ    = (heading * Math.PI) / 180;
  const cosθ = Math.cos(θ);
  const sinθ = Math.sin(θ);
  const toLatDeg = (m: number) => m / 111_000;
  const toLonDeg = (m: number) => m / (111_000 * Math.cos((lat * Math.PI) / 180));

  function rot(dRight: number, dFwd: number): [number, number] {
    return [
      toLonDeg( dRight * cosθ + dFwd * sinθ),
      toLatDeg(-dRight * sinθ + dFwd * cosθ),
    ];
  }

  const corners: [number, number][] = [
    [-halfWid, -halfLen],
    [ halfWid, -halfLen],
    [ halfWid,  halfLen],
    [-halfWid,  halfLen],
  ];
  const ring = corners.map(([dr, df]) => { const [rl, rb] = rot(dr, df); return [lon + rl, lat + rb]; });
  ring.push(ring[0]);
  return ring;
}

// ─── component ──────────────────────────────────────────────────────────────

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };

interface GhostLayerProps {
  buses: VehicleLocation[];
  shapes: Record<string, ShapePoint[]>;
  routes: Route[];
  activeRoutes: Set<string>;
}

/**
 * Renders a ghost bus and a route-hugging trail for each active vehicle.
 *
 * The ghost starts at the last confirmed GPS position and advances along the
 * route shape at BUS_SPEED_MPS using requestAnimationFrame so the animation
 * runs at display refresh rate without triggering React re-renders.  When a
 * new position update arrives (receivedAt changes), the ghost automatically
 * resets because `buses` ref is updated before the next frame.
 *
 * Layers are added directly via the Mapbox GL JS API (below bus-layer) so
 * they don't participate in React's render cycle during animation.
 */
export default function GhostLayer({ buses, shapes, routes, activeRoutes }: GhostLayerProps) {
  const { current: mapRef } = useMap();

  // Refs let the RAF loop always read the latest data without restarting.
  const busesRef    = useRef(buses);
  const shapesRef   = useRef(shapes);
  const routesRef   = useRef(routes);
  const activeRef   = useRef(activeRoutes);
  const rafIdRef    = useRef(0);

  useEffect(() => { busesRef.current  = buses;        }, [buses]);
  useEffect(() => { shapesRef.current = shapes;       }, [shapes]);
  useEffect(() => { routesRef.current = routes;       }, [routes]);
  useEffect(() => { activeRef.current = activeRoutes; }, [activeRoutes]);

  // One-time setup: add sources + layers, start the RAF loop.
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    function setup() {
      if (map.getSource('ghost-trails')) return; // already initialised

      map.addSource('ghost-trails', { type: 'geojson', data: EMPTY });
      map.addSource('ghost-buses',  { type: 'geojson', data: EMPTY });

      // Trail — fill-extrusion dashes floating at 7–9 m above ground.
      // fill-extrusion is the only layer type that guarantees 3D altitude on
      // dark-v11; line layers with line-z-offset require the Standard style.
      // beforeId 'bus-layer' keeps ghost layers below real buses in the stack.
      map.addLayer({
        id: 'ghost-trail-extrusion',
        type: 'fill-extrusion',
        source: 'ghost-trails',
        paint: {
          'fill-extrusion-color':   ['get', 'color'],
          'fill-extrusion-height':   TRAIL_TOP_M,
          'fill-extrusion-base':     TRAIL_BASE_M,
          'fill-extrusion-opacity':  0.75,
        },
      }, 'bus-layer');

      // Ghost bus extrusion — same shape as the real bus, more translucent.
      map.addLayer({
        id: 'ghost-bus-layer',
        type: 'fill-extrusion',
        source: 'ghost-buses',
        paint: {
          'fill-extrusion-color':   ['get', 'color'],
          'fill-extrusion-height':   BUS_HEIGHT_M,
          'fill-extrusion-base':     0,
          'fill-extrusion-opacity':  0.28,
        },
      }, 'bus-layer');

      function tick() {
        const now    = Date.now();
        const colors = new Map(routesRef.current.map((r) => [r.route_id, `#${r.route_color}`]));

        const trailFeatures: Feature<Polygon>[] = [];
        const ghostFeatures: Feature<Polygon>[] = [];

        for (const bus of busesRef.current) {
          if (!activeRef.current.has(bus.route_id) || !bus.receivedAt) continue;
          const shape = shapesRef.current[bus.route_id];
          if (!shape || shape.length < 2) continue;

          const elapsed = Math.min((now - bus.receivedAt) / 1000, MAX_PREDICT_SEC);
          const distM   = elapsed * BUS_SPEED_MPS;
          if (distM < 5) continue; // ghost too close to confirmed position to bother

          const nearest = nearestOnPolyline(shape, bus.lat, bus.lon);

          // Determine if the bus is traveling with or against the shape's winding
          // by comparing bus.heading to the forward bearing of the nearest segment.
          const fwdBearing = segmentHeading(shape, nearest.segIdx);
          const goingFwd   = angularDiff(bus.heading, fwdBearing) <= 90;

          const ghost     = goingFwd
            ? walkForward(shape, nearest, distM)
            : walkBackward(shape, nearest, distM);
          const ghostSegHead = segmentHeading(shape, ghost.segIdx);
          const ghostHead    = goingFwd ? ghostSegHead : (ghostSegHead + 180) % 360;
          const color        = colors.get(bus.route_id) ?? '#3b82f6';

          // Trail — fill-extrusion dashes placed at regular intervals from the
          // real bus position to the ghost, following the route curve.
          const dashStep = DASH_LEN_M + DASH_GAP_M;
          for (let d = DASH_LEN_M / 2; d <= distM; d += dashStep) {
            const dp = goingFwd
              ? walkForward(shape, nearest, d)
              : walkBackward(shape, nearest, d);
            const dh = goingFwd
              ? segmentHeading(shape, dp.segIdx)
              : (segmentHeading(shape, dp.segIdx) + 180) % 360;
            trailFeatures.push({
              type: 'Feature',
              geometry: { type: 'Polygon', coordinates: [dashPolygon(dp.lat, dp.lon, dh)] },
              properties: { color },
            });
          }

          ghostFeatures.push({
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [busPolygon(ghost.lat, ghost.lon, ghostHead)],
            },
            properties: { color },
          });
        }

        (map.getSource('ghost-trails') as GeoJSONSource)
          ?.setData({ type: 'FeatureCollection', features: trailFeatures });
        (map.getSource('ghost-buses') as GeoJSONSource)
          ?.setData({ type: 'FeatureCollection', features: ghostFeatures });

        rafIdRef.current = requestAnimationFrame(tick);
      }

      rafIdRef.current = requestAnimationFrame(tick);
    }

    if (map.isStyleLoaded()) {
      setup();
    } else {
      map.once('load', setup);
    }

    return () => {
      cancelAnimationFrame(rafIdRef.current);
      map.off('load', setup);
      if (map.getLayer('ghost-trail-extrusion')) map.removeLayer('ghost-trail-extrusion');
      if (map.getLayer('ghost-bus-layer'))       map.removeLayer('ghost-bus-layer');
      if (map.getSource('ghost-trails'))    map.removeSource('ghost-trails');
      if (map.getSource('ghost-buses'))     map.removeSource('ghost-buses');
    };
  }, [mapRef]); // only re-runs if the map instance itself changes

  return null;
}
