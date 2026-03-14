import { Popup } from 'react-map-gl';
import type { VehicleLocation, Route } from '../types/mtd';

interface BusPopupProps {
  bus: VehicleLocation;
  routes: Route[];
  onClose: () => void;
}

function headingToCardinal(heading: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(heading / 45) % 8];
}

export default function BusPopup({ bus, routes, onClose }: BusPopupProps) {
  const route = routes.find((r) => r.route_id === bus.route_id);
  const formatted = new Date(bus.last_updated).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <Popup
      longitude={bus.lon}
      latitude={bus.lat}
      anchor="bottom"
      onClose={onClose}
      closeOnClick={false}
      offset={12}
    >
      <div className="min-w-48" style={{ color: 'white' }}>
        {/* Route header */}
        {route && (
          <div
            className="px-4 pt-4 pb-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="px-2 py-0.5 rounded-md text-xs font-bold"
                style={{
                  backgroundColor: `#${route.route_color}`,
                  color: `#${route.route_text_color || 'ffffff'}`,
                }}
              >
                {route.route_short_name}
              </span>
              <span className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {route.route_long_name}
              </span>
            </div>
          </div>
        )}

        {/* Data rows */}
        <div className="px-4 py-3 space-y-2.5">
          <DataRow
            icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="1" y="3" width="15" height="13" rx="2" />
                <path d="M16 8h4l3 3v5h-7V8z" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            }
            label="Vehicle"
            value={bus.vehicle_id}
          />
          <DataRow
            icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
            label="Updated"
            value={formatted}
          />
          <DataRow
            icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
              </svg>
            }
            label="Heading"
            value={`${headingToCardinal(bus.heading)} (${Math.round(bus.heading)}°)`}
          />
          <DataRow
            icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            }
            label="Next Stop"
            value={bus.next_stop_id}
          />
        </div>
      </div>
    </Popup>
  );
}

function DataRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: 'rgba(255,255,255,0.35)' }}>{icon}</span>
      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)', minWidth: '52px' }}>
        {label}
      </span>
      <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
        {value}
      </span>
    </div>
  );
}
