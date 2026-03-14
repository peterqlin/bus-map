import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { Route, ShapePoint } from '../types/mtd';

export function useRoutes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [activeRoutes, setActiveRoutes] = useState<Set<string>>(new Set());
  const [shapes, setShapes] = useState<Record<string, ShapePoint[]>>({});

  useEffect(() => {
    api.getRoutes().then((data) => {
      setRoutes(data);
      setActiveRoutes(new Set(data.map((r) => r.route_id)));
      // Pre-load shapes for all routes so they render immediately on first paint
      data.forEach((r) => {
        api.getShape(r.route_id).then((pts) => {
          setShapes((s) => ({ ...s, [r.route_id]: pts }));
        });
      });
    });
  }, []);

  const toggleRoute = useCallback(async (routeId: string) => {
    setActiveRoutes((prev) => {
      const next = new Set(prev);
      if (next.has(routeId)) {
        next.delete(routeId);
      } else {
        next.add(routeId);
        // Lazy-load shape when route becomes active
        if (!shapes[routeId]) {
          api.getShape(routeId).then((pts) => {
            setShapes((s) => ({ ...s, [routeId]: pts }));
          });
        }
      }
      return next;
    });
  }, [shapes]);

  const setAllRoutes = useCallback((active: boolean) => {
    if (active) {
      setActiveRoutes(new Set(routes.map((r) => r.route_id)));
      // Load shapes for all routes
      routes.forEach((r) => {
        if (!shapes[r.route_id]) {
          api.getShape(r.route_id).then((pts) => {
            setShapes((s) => ({ ...s, [r.route_id]: pts }));
          });
        }
      });
    } else {
      setActiveRoutes(new Set());
    }
  }, [routes, shapes]);

  return { routes, activeRoutes, shapes, toggleRoute, setAllRoutes };
}
