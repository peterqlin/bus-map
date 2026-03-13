import { Source, Layer } from 'react-map-gl';
import type { FeatureCollection, Point } from 'geojson';
import type { Stop } from '../../types/mtd';

interface StopLayerProps {
  stops: Stop[];
}

export default function StopLayer({ stops }: StopLayerProps) {
  const geojson: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features: stops.map((s) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.stop_lon, s.stop_lat] },
      properties: { stop_name: s.stop_name, stop_id: s.stop_id },
    })),
  };

  return (
    <Source id="stops" type="geojson" data={geojson}>
      <Layer
        id="stop-circles"
        type="circle"
        minzoom={14}
        paint={{
          'circle-radius': 5,
          'circle-color': '#ffffff',
          'circle-stroke-color': '#333333',
          'circle-stroke-width': 1.5,
        }}
      />
      <Layer
        id="stop-labels"
        type="symbol"
        minzoom={15}
        layout={{
          'text-field': ['get', 'stop_name'],
          'text-size': 11,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
        }}
        paint={{
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1,
        }}
      />
    </Source>
  );
}
