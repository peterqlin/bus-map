import { Popup } from 'react-map-gl';
import type { VehicleLocation, Route } from '../types/mtd';

interface BusPopupProps {
  bus: VehicleLocation;
  routes: Route[];
  onClose: () => void;
}

export default function BusPopup({ bus, routes, onClose }: BusPopupProps) {
  const route = routes.find((r) => r.route_id === bus.route_id);
  const formatted = new Date(bus.last_updated).toLocaleTimeString();

  return (
    <Popup
      longitude={bus.lon}
      latitude={bus.lat}
      anchor="bottom"
      onClose={onClose}
      closeOnClick={false}
    >
      <div className="p-2 min-w-40">
        {route && (
          <span
            className="inline-block px-2 py-0.5 rounded-full text-xs font-bold mb-1.5"
            style={{
              backgroundColor: `#${route.route_color}`,
              color: `#${route.route_text_color}`,
            }}
          >
            {route.route_short_name} {route.route_long_name}
          </span>
        )}
        <div className="text-sm space-y-0.5">
          <div><span className="font-semibold">Vehicle:</span> {bus.vehicle_id}</div>
          <div><span className="font-semibold">Next Stop:</span> {bus.next_stop_id}</div>
          <div><span className="font-semibold">Updated:</span> {formatted}</div>
        </div>
      </div>
    </Popup>
  );
}
