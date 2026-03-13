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
      <div
        className={`fixed bottom-4 right-4 px-3 py-1 rounded-full text-xs text-white z-20 ${
          connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
        }`}
      >
        {connectionStatus}
      </div>
    </div>
  );
}
