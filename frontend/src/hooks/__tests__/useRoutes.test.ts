import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useRoutes } from '../useRoutes';

describe('useRoutes', () => {
  it('fetches routes and initializes all as active', async () => {
    const { result } = renderHook(() => useRoutes());
    await waitFor(() => {
      expect(result.current.routes.length).toBeGreaterThan(0);
    });
    expect(result.current.activeRoutes.has('1')).toBe(true);
  });
});
