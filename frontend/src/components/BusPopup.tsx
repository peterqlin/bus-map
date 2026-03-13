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
      <div style={{ padding: '8px', minWidth: '160px' }}>
        {route && (
          <span
            style={{
              backgroundColor: `#${route.route_color}`,
              color: `#${route.route_text_color}`,
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold',
              display: 'inline-block',
              marginBottom: '6px',
            }}
          >
            {route.route_short_name} {route.route_long_name}
          </span>
        )}
        <div style={{ fontSize: '13px' }}>
          <div><strong>Vehicle:</strong> {bus.vehicle_id}</div>
          <div><strong>Next Stop:</strong> {bus.next_stop_id}</div>
          <div><strong>Updated:</strong> {formatted}</div>
        </div>
      </div>
    </Popup>
  );
}
