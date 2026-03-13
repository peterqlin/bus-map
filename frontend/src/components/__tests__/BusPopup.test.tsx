import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BusPopup from '../BusPopup';
import type { VehicleLocation, Route } from '../../types/mtd';

vi.mock('react-map-gl', () => ({
  Popup: ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
    <div data-testid="popup">
      {children}
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

const mockBus: VehicleLocation = {
  vehicle_id: 'V1',
  lat: 40.102,
  lon: -88.2272,
  route_id: '1',
  trip_id: 'T1',
  shape_id: 'S1_SHAPE',
  next_stop_id: 'S1',
  last_updated: '2024-01-01T12:00:00',
  heading: 90,
};

const mockRoutes: Route[] = [
  { route_id: '1', route_short_name: '1', route_long_name: 'Green', route_color: '00FF00', route_text_color: '000000' },
];

describe('BusPopup', () => {
  it('displays vehicle_id, next_stop_id, last_updated', () => {
    render(<BusPopup bus={mockBus} routes={mockRoutes} onClose={vi.fn()} />);
    expect(screen.getByText(/V1/)).toBeInTheDocument();
    expect(screen.getByText(/S1/)).toBeInTheDocument();
  });

  it('shows route badge', () => {
    render(<BusPopup bus={mockBus} routes={mockRoutes} onClose={vi.fn()} />);
    expect(screen.getByText(/Green/)).toBeInTheDocument();
  });
});
