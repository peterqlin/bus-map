import { useState, useCallback } from 'react';
import { useWebSocket, type ConnectionStatus } from './useWebSocket';
import type { VehicleLocation, WebSocketMessage } from '../types/mtd';

export function useBuses() {
  const [buses, setBuses] = useState<VehicleLocation[]>([]);

  const handleMessage = useCallback((raw: string) => {
    try {
      const msg = JSON.parse(raw) as WebSocketMessage;
      if (msg.type === 'vehicles') {
        setBuses(msg.data);
      }
    } catch {
      // ignore malformed messages
    }
  }, []);

  const connectionStatus: ConnectionStatus = useWebSocket('/ws', handleMessage);

  return { buses, connectionStatus };
}
