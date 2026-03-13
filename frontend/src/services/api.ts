import type { Route, Stop, ShapePoint } from '../types/mtd';

async function fetchJSON<T>(path: string): Promise<T> {
  const resp = await fetch(path);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  }
  return resp.json() as Promise<T>;
}

export const api = {
  getRoutes: () => fetchJSON<Route[]>('/api/routes'),
  getStops: () => fetchJSON<Stop[]>('/api/stops'),
  getShape: (routeId: string) => fetchJSON<ShapePoint[]>(`/api/routes/${routeId}/shape`),
};
