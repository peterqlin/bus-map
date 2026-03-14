import { useState } from 'react';
import type { Route } from '../types/mtd';

interface SidebarProps {
  routes: Route[];
  activeRoutes: Set<string>;
  onToggle: (routeId: string) => void;
  onAllOn: () => void;
  onAllOff: () => void;
}

function hexToRgb(hex: string): string {
  const safe = (hex ?? '').padEnd(6, '0');
  const r = parseInt(safe.slice(0, 2), 16) || 0;
  const g = parseInt(safe.slice(2, 4), 16) || 0;
  const b = parseInt(safe.slice(4, 6), 16) || 0;
  return `${r}, ${g}, ${b}`;
}

export default function Sidebar({ routes, activeRoutes, onToggle, onAllOn, onAllOff }: SidebarProps) {
  const [search, setSearch] = useState('');

  const filtered = routes.filter(
    (r) =>
      r.route_short_name.toLowerCase().includes(search.toLowerCase()) ||
      r.route_long_name.toLowerCase().includes(search.toLowerCase()),
  );

  const activeCount = routes.filter((r) => activeRoutes.has(r.route_id)).length;

  return (
    <div
      data-testid="sidebar"
      className="w-64 h-full shrink-0 flex flex-col z-10 overflow-hidden"
      style={{
        background: 'rgba(8, 8, 16, 0.93)',
        backdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 pt-5 pb-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2.5 mb-1">
          {/* Bus icon */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(232, 74, 39, 0.15)', border: '1px solid rgba(232, 74, 39, 0.25)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="6" width="20" height="13" rx="3" fill="#E84A27" />
              <rect x="4" y="9" width="5" height="4" rx="1" fill="white" fillOpacity="0.9" />
              <rect x="15" y="9" width="5" height="4" rx="1" fill="white" fillOpacity="0.9" />
              <rect x="10" y="9" width="4" height="4" rx="1" fill="white" fillOpacity="0.9" />
              <circle cx="7" cy="19" r="2" fill="#1a1a2e" />
              <circle cx="17" cy="19" r="2" fill="#1a1a2e" />
              <rect x="1" y="11" width="2" height="3" rx="1" fill="#E84A27" />
              <rect x="21" y="11" width="2" height="3" rx="1" fill="#E84A27" />
            </svg>
          </div>
          <div>
            <h1 className="text-white font-bold text-sm tracking-tight leading-none">UIUC Bus Map</h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Live vehicle tracker
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div
        className="px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
            ROUTES
          </span>
          <span
            className="text-xs font-mono px-2 py-0.5 rounded-md"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
          >
            {activeCount} / {routes.length}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onAllOn}
            className="flex-1 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
            style={{
              background: 'rgba(232, 74, 39, 0.15)',
              color: '#E84A27',
              border: '1px solid rgba(232, 74, 39, 0.25)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(232, 74, 39, 0.25)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(232, 74, 39, 0.15)')}
          >
            All On
          </button>
          <button
            onClick={onAllOff}
            className="flex-1 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          >
            All Off
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2.5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search routes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg outline-none"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'white',
            }}
          />
        </div>
      </div>

      {/* Route List */}
      <ul className="list-none p-0 m-0 flex-1 overflow-y-auto sidebar-scroll px-2 py-2">
        {filtered.map((route) => {
          const isActive = activeRoutes.has(route.route_id);
          const rgb = hexToRgb(route.route_color);

          return (
            <li key={route.route_id}>
              <label
                className="relative flex items-center gap-3 px-2 py-2 rounded-xl cursor-pointer mb-0.5 hover:bg-white/[0.04]"
                style={isActive ? { background: `rgba(${rgb}, 0.1)` } : undefined}
              >
                <input
                  type="checkbox"
                  id={`route-${route.route_id}`}
                  checked={isActive}
                  onChange={() => onToggle(route.route_id)}
                  className="sr-only"
                />

                {/* Color bar */}
                <span
                  className="w-1 h-8 rounded-full shrink-0 transition-all"
                  style={{
                    backgroundColor: isActive ? `#${route.route_color}` : 'rgba(255,255,255,0.1)',
                  }}
                />

                {/* Route info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className="text-xs font-bold px-1.5 py-px rounded-md leading-none"
                      style={{
                        background: isActive ? `#${route.route_color}` : 'rgba(255,255,255,0.08)',
                        color: isActive ? `#${route.route_text_color || 'ffffff'}` : 'rgba(255,255,255,0.3)',
                      }}
                    >
                      {route.route_short_name}
                    </span>
                  </div>
                  <p
                    className="text-xs truncate leading-snug transition-colors"
                    style={{ color: isActive ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)' }}
                  >
                    {route.route_long_name}
                  </p>
                </div>

                {/* Toggle pill */}
                <div
                  className="w-9 h-5 rounded-full shrink-0 relative transition-all"
                  style={{
                    background: isActive ? `#${route.route_color}` : 'rgba(255,255,255,0.1)',
                  }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
                    style={{
                      background: 'white',
                      left: isActive ? '20px' : '2px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }}
                  />
                </div>
              </label>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="text-center py-10 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            No routes found
          </li>
        )}
      </ul>

      {/* Footer */}
      <div
        className="px-4 py-3 shrink-0 flex items-center gap-1.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Champaign-Urbana MTD
        </span>
      </div>
    </div>
  );
}
