import type { Route } from '../types/mtd';

interface SidebarProps {
  routes: Route[];
  activeRoutes: Set<string>;
  onToggle: (routeId: string) => void;
  onAllOn: () => void;
  onAllOff: () => void;
}

export default function Sidebar({ routes, activeRoutes, onToggle, onAllOn, onAllOff }: SidebarProps) {
  return (
    <div
      data-testid="sidebar"
      style={{
        width: '240px',
        height: '100%',
        flexShrink: 0,
        backgroundColor: 'rgba(20, 20, 30, 0.85)',
        backdropFilter: 'blur(8px)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
        padding: '16px',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      <h2 style={{ margin: '0 0 12px', fontSize: '18px' }}>Routes</h2>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button onClick={onAllOn} style={btnStyle}>All On</button>
        <button onClick={onAllOff} style={btnStyle}>All Off</button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
        {routes.map((route) => (
          <li key={route.route_id} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id={`route-${route.route_id}`}
              checked={activeRoutes.has(route.route_id)}
              onChange={() => onToggle(route.route_id)}
            />
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: `#${route.route_color}`,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <label htmlFor={`route-${route.route_id}`} style={{ cursor: 'pointer', fontSize: '13px' }}>
              {route.route_short_name} – {route.route_long_name}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: '12px',
  backgroundColor: 'rgba(255,255,255,0.15)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.3)',
  borderRadius: '4px',
  cursor: 'pointer',
};
