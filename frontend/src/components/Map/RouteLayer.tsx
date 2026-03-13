import { Source, Layer } from 'react-map-gl';
import type { FeatureCollection, LineString } from 'geojson';
import type { Route, ShapePoint } from '../../types/mtd';

interface RouteLayerProps {
  routes: Route[];
  activeRoutes: Set<string>;
  shapes: Record<string, ShapePoint[]>;
}

export default function RouteLayer({ routes, activeRoutes, shapes }: RouteLayerProps) {
  const activeRouteList = routes.filter((r) => activeRoutes.has(r.route_id));

  return (
    <>
      {activeRouteList.map((route) => {
        const pts = shapes[route.route_id];
        if (!pts?.length) return null;

        const sorted = [...pts].sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence);
        const geojson: FeatureCollection<LineString> = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: sorted.map((p) => [p.shape_pt_lon, p.shape_pt_lat]),
              },
              properties: {},
            },
          ],
        };

        return (
          <Source key={route.route_id} id={`route-${route.route_id}`} type="geojson" data={geojson}>
            <Layer
              id={`route-line-${route.route_id}`}
              type="line"
              paint={{
                'line-color': `#${route.route_color}`,
                'line-width': 3,
                'line-opacity': 0.8,
              }}
            />
          </Source>
        );
      })}
    </>
  );
}
