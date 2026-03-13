import { http, HttpResponse } from 'msw';
import type { Route, Stop, ShapePoint } from '../../types/mtd';

export const mockRoutes: Route[] = [
  {
    route_id: '1',
    route_short_name: '1',
    route_long_name: 'Green',
    route_color: '00FF00',
    route_text_color: '000000',
  },
];

export const mockStops: Stop[] = [
  {
    stop_id: 'S1',
    stop_name: 'Main St',
    stop_lat: 40.102,
    stop_lon: -88.2272,
  },
];

export const mockShapes: ShapePoint[] = [
  { shape_pt_lat: 40.102, shape_pt_lon: -88.2272, shape_pt_sequence: 1 },
];

export const handlers = [
  http.get('/api/routes', () => HttpResponse.json(mockRoutes)),
  http.get('/api/stops', () => HttpResponse.json(mockStops)),
  http.get('/api/routes/:routeId/shape', () => HttpResponse.json(mockShapes)),
];
