/**
 * HealthContext Tests
 * Tests for health sync toggle, permission error handling, and settings persistence.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Mock AsyncStorage
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  setItem: (...args: unknown[]) => mockSetItem(...args),
}));

// Mock healthService
const mockInitHealthService = jest.fn();
jest.mock('../../lib/healthService', () => ({
  initHealthService: (...args: unknown[]) => mockInitHealthService(...args),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

import { HealthProvider, useHealth } from '../../context/HealthContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <HealthProvider>{children}</HealthProvider>
);

describe('HealthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockInitHealthService.mockResolvedValue(true);
  });

  describe('loadSettings on mount', () => {
    it('starts with health sync disabled when no stored value', async () => {
      mockGetItem.mockResolvedValue(null);

      const { result } = renderHook(() => useHealth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isHealthSyncEnabled).toBe(false);
      });
    });

    it('restores health sync enabled when stored value is true and init succeeds', async () => {
      mockGetItem.mockResolvedValue('true');
      mockInitHealthService.mockResolvedValue(true);

      const { result } = renderHook(() => useHealth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isHealthSyncEnabled).toBe(true);
        expect(result.current.isInitialized).toBe(true);
      });
    });

    it('keeps sync disabled when stored true but init fails (permissions revoked)', async () => {
      mockGetItem.mockResolvedValue('true');
      mockInitHealthService.mockResolvedValue(false);

      const { result } = renderHook(() => useHealth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isHealthSyncEnabled).toBe(false);
      });
    });
  });

  describe('toggleHealthSync', () => {
    it('enables health sync when init succeeds', async () => {
      mockInitHealthService.mockResolvedValue(true);

      const { result } = renderHook(() => useHealth(), { wrapper });

      await act(async () => {
        await result.current.toggleHealthSync();
      });

      expect(result.current.isHealthSyncEnabled).toBe(true);
      expect(result.current.isInitialized).toBe(true);
      expect(mockSetItem).toHaveBeenCalledWith('pantry_pal_health_sync_enabled', 'true');
    });

    it('shows Alert when init fails (permission denied)', async () => {
      mockInitHealthService.mockResolvedValue(false);

      const { result } = renderHook(() => useHealth(), { wrapper });

      await act(async () => {
        await result.current.toggleHealthSync();
      });

      expect(result.current.isHealthSyncEnabled).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Health Access Denied',
        expect.stringContaining('permissions'),
        expect.any(Array)
      );
    });

    it('disables health sync and persists when toggled off', async () => {
      mockGetItem.mockResolvedValue('true');
      mockInitHealthService.mockResolvedValue(true);

      const { result } = renderHook(() => useHealth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isHealthSyncEnabled).toBe(true);
      });

      await act(async () => {
        await result.current.toggleHealthSync();
      });

      expect(result.current.isHealthSyncEnabled).toBe(false);
      expect(mockSetItem).toHaveBeenCalledWith('pantry_pal_health_sync_enabled', 'false');
    });
  });
});
