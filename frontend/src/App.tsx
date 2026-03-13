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

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex' }}>
      <Sidebar
        routes={routes}
        activeRoutes={activeRoutes}
        onToggle={toggleRoute}
        onAllOn={() => setAllRoutes(true)}
        onAllOff={() => setAllRoutes(false)}
      />
      <div style={{ flex: 1, height: '100%' }}>
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
      <div
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '12px',
          backgroundColor: connectionStatus === 'connected' ? '#22c55e' : '#ef4444',
          color: '#fff',
          zIndex: 20,
        }}
      >
        {connectionStatus}
      </div>
    </div>
  );
}
