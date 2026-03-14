import { useState, useEffect } from 'react';
import { useBuses } from './hooks/useBuses';
import { useRoutes } from './hooks/useRoutes';
import { api } from './services/api';
import type { VehicleLocation, Stop } from './types/mtd';
import BusMap from './components/Map/BusMap';
import Sidebar from './components/Sidebar';

export default function App() {
  const { buses, connectionStatus } = useBuses();
  const { routes, activeRoutes, shapes, toggleRoute, setAllRoutes } = useRoutes();
  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedBus, setSelectedBus] = useState<VehicleLocation | null>(null);

  useEffect(() => {
    api.getStops().then(setStops).catch(console.error);
  }, []);

  const isConnected = connectionStatus === 'connected';

  return (
    <div className="relative w-full h-full flex">
      <Sidebar
        routes={routes}
        activeRoutes={activeRoutes}
        onToggle={toggleRoute}
        onAllOn={() => setAllRoutes(true)}
        onAllOff={() => setAllRoutes(false)}
      />
      <div className="flex-1 h-full">
        <BusMap
          buses={buses}
          routes={routes}
          activeRoutes={activeRoutes}
          shapes={shapes}
          stops={stops}
          selectedBus={selectedBus}
          onBusClick={setSelectedBus}
          onPopupClose={() => setSelectedBus(null)}
        />
      </div>

      {/* Status indicator */}
      <div
        className="fixed bottom-5 right-5 z-20 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium"
        style={{
          background: 'rgba(8, 8, 16, 0.9)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(16px)',
          color: 'rgba(255,255,255,0.8)',
        }}
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? 'animate-live-pulse' : ''}`}
          style={{ background: isConnected ? '#4ade80' : '#f87171' }}
        />
        {isConnected
          ? `${buses.length} bus${buses.length !== 1 ? 'es' : ''} live`
          : connectionStatus === 'connecting'
            ? 'Connecting…'
            : 'Disconnected'}
      </div>
    </div>
  );
}
