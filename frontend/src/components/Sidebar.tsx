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
      className="w-60 h-full shrink-0 flex flex-col z-10 p-4 overflow-y-auto bg-[rgba(20,20,30,0.85)] backdrop-blur-md text-white"
    >
      <h2 className="text-lg font-semibold mb-3">Routes</h2>
      <div className="flex gap-2 mb-3">
        <button
          onClick={onAllOn}
          className="px-3 py-1 text-xs rounded border border-white/30 bg-white/15 text-white hover:bg-white/25 cursor-pointer"
        >
          All On
        </button>
        <button
          onClick={onAllOff}
          className="px-3 py-1 text-xs rounded border border-white/30 bg-white/15 text-white hover:bg-white/25 cursor-pointer"
        >
          All Off
        </button>
      </div>
      <ul className="list-none p-0 m-0 flex-1">
        {routes.map((route) => (
          <li key={route.route_id} className="mb-2 flex items-center gap-2">
            <input
              type="checkbox"
              id={`route-${route.route_id}`}
              checked={activeRoutes.has(route.route_id)}
              onChange={() => onToggle(route.route_id)}
              className="cursor-pointer"
            />
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: `#${route.route_color}` }}
            />
            <label
              htmlFor={`route-${route.route_id}`}
              className="cursor-pointer text-xs"
            >
              {route.route_short_name} – {route.route_long_name}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
