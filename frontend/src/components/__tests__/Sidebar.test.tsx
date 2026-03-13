import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from '../Sidebar';
import type { Route } from '../../types/mtd';

const mockRoutes: Route[] = [
  { route_id: '1', route_short_name: '1', route_long_name: 'Green', route_color: '00FF00', route_text_color: '000000' },
  { route_id: '2', route_short_name: '2', route_long_name: 'Blue', route_color: '0000FF', route_text_color: 'FFFFFF' },
];

describe('Sidebar', () => {
  it('renders route list', () => {
    render(
      <Sidebar
        routes={mockRoutes}
        activeRoutes={new Set(['1', '2'])}
        onToggle={vi.fn()}
        onAllOn={vi.fn()}
        onAllOff={vi.fn()}
      />
    );
    expect(screen.getByText(/Green/)).toBeInTheDocument();
    expect(screen.getByText(/Blue/)).toBeInTheDocument();
  });

  it('calls onToggle when checkbox changes', () => {
    const onToggle = vi.fn();
    render(
      <Sidebar
        routes={mockRoutes}
        activeRoutes={new Set(['1', '2'])}
        onToggle={onToggle}
        onAllOn={vi.fn()}
        onAllOff={vi.fn()}
      />
    );
    const checkbox = screen.getByRole('checkbox', { name: /Green/ });
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith('1');
  });

  it('calls onAllOn and onAllOff', () => {
    const onAllOn = vi.fn();
    const onAllOff = vi.fn();
    render(
      <Sidebar
        routes={mockRoutes}
        activeRoutes={new Set(['1'])}
        onToggle={vi.fn()}
        onAllOn={onAllOn}
        onAllOff={onAllOff}
      />
    );
    fireEvent.click(screen.getByText('All On'));
    expect(onAllOn).toHaveBeenCalled();
    fireEvent.click(screen.getByText('All Off'));
    expect(onAllOff).toHaveBeenCalled();
  });
});
