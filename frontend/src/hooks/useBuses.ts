import { useState, useCallback, useRef } from 'react';
import { useWebSocket, type ConnectionStatus } from './useWebSocket';
import type { VehicleLocation, WebSocketMessage } from '../types/mtd';

export function useBuses() {
  const [buses, setBuses] = useState<VehicleLocation[]>([]);

  // Track the last known receivedAt per vehicle so we don't reset the ghost
  // clock on WS broadcasts that carry unchanged (cached) position data.
  const prevRef = useRef<Map<string, { last_updated: string; lat: number; lon: number; receivedAt: number }>>(new Map());

  const handleMessage = useCallback((raw: string) => {
    try {
      const msg = JSON.parse(raw) as WebSocketMessage;
      if (msg.type === 'vehicles') {
        const now = Date.now();
        const updated = msg.data.map((v) => {
          const prev = prevRef.current.get(v.vehicle_id);
          // Only reset receivedAt when the position actually changed.
          // The backend broadcasts cached data every 30 s but only fetches
          // fresh MTD positions every 60 s — unchanged broadcasts must not
          // restart the ghost from zero.
          const moved =
            !prev ||
            prev.last_updated !== v.last_updated ||
            prev.lat !== v.lat ||
            prev.lon !== v.lon;
          const receivedAt = moved ? now : prev.receivedAt;
          return { ...v, receivedAt };
        });

        prevRef.current = new Map(
          updated.map((v) => [
            v.vehicle_id,
            { last_updated: v.last_updated, lat: v.lat, lon: v.lon, receivedAt: v.receivedAt! },
          ]),
        );

        setBuses(updated);
      }
    } catch {
      // ignore malformed messages
    }
  }, []);

  const connectionStatus: ConnectionStatus = useWebSocket('/ws', handleMessage);

  return { buses, connectionStatus };
}
