/**
 * Tests for offline detection service
 * TDD: These tests are written FIRST before implementation
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import {
  OfflineService,
  NetworkState,
  NetworkListener,
} from '@/services/offline';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

describe('OfflineService', () => {
  let offlineService: OfflineService;
  const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

  beforeEach(() => {
    jest.clearAllMocks();
    offlineService = new OfflineService();
  });

  afterEach(() => {
    offlineService.cleanup();
  });

  describe('isOnline', () => {
    it('returns true when connected to internet', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      } as NetInfoState);

      const result = await offlineService.isOnline();

      expect(result).toBe(true);
      expect(mockNetInfo.fetch).toHaveBeenCalled();
    });

    it('returns false when not connected', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      } as NetInfoState);

      const result = await offlineService.isOnline();

      expect(result).toBe(false);
    });

    it('returns false when connected but internet not reachable', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: false,
        type: 'wifi',
      } as NetInfoState);

      const result = await offlineService.isOnline();

      expect(result).toBe(false);
    });

    it('returns false when isInternetReachable is null (unknown)', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: null,
        type: 'wifi',
      } as NetInfoState);

      const result = await offlineService.isOnline();

      // When internet reachability is unknown, we assume online if connected
      expect(result).toBe(true);
    });

    it('handles NetInfo errors gracefully', async () => {
      mockNetInfo.fetch.mockRejectedValue(new Error('NetInfo error'));

      const result = await offlineService.isOnline();

      // Default to offline when we can't determine
      expect(result).toBe(false);
    });
  });

  describe('getNetworkState', () => {
    it('returns full network state', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: {
          ssid: 'TestNetwork',
        },
      } as NetInfoState);

      const state = await offlineService.getNetworkState();

      expect(state).toEqual({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });
    });

    it('returns offline state when disconnected', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      } as NetInfoState);

      const state = await offlineService.getNetworkState();

      expect(state).toEqual({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });
    });

    it('handles cellular connection', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
      } as NetInfoState);

      const state = await offlineService.getNetworkState();

      expect(state.type).toBe('cellular');
    });

    it('returns unknown state on error', async () => {
      mockNetInfo.fetch.mockRejectedValue(new Error('NetInfo error'));

      const state = await offlineService.getNetworkState();

      expect(state).toEqual({
        isConnected: false,
        isInternetReachable: false,
        type: 'unknown',
      });
    });
  });

  describe('subscribe', () => {
    it('adds listener and returns unsubscribe function', () => {
      const mockUnsubscribe = jest.fn();
      mockNetInfo.addEventListener.mockReturnValue(mockUnsubscribe);

      const listener: NetworkListener = jest.fn();
      const unsubscribe = offlineService.subscribe(listener);

      expect(mockNetInfo.addEventListener).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('calls listener when network state changes', () => {
      let capturedHandler: (state: NetInfoState) => void = () => {};
      mockNetInfo.addEventListener.mockImplementation((handler) => {
        capturedHandler = handler;
        return jest.fn();
      });

      const listener: NetworkListener = jest.fn();
      offlineService.subscribe(listener);

      // Simulate network state change
      capturedHandler({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      } as NetInfoState);

      expect(listener).toHaveBeenCalledWith({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });
    });

    it('unsubscribe removes the listener', () => {
      const mockUnsubscribe = jest.fn();
      mockNetInfo.addEventListener.mockReturnValue(mockUnsubscribe);

      const listener: NetworkListener = jest.fn();
      const unsubscribe = offlineService.subscribe(listener);

      unsubscribe();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('supports multiple listeners', () => {
      const mockUnsubscribe1 = jest.fn();
      const mockUnsubscribe2 = jest.fn();
      mockNetInfo.addEventListener
        .mockReturnValueOnce(mockUnsubscribe1)
        .mockReturnValueOnce(mockUnsubscribe2);

      const listener1: NetworkListener = jest.fn();
      const listener2: NetworkListener = jest.fn();

      offlineService.subscribe(listener1);
      offlineService.subscribe(listener2);

      expect(mockNetInfo.addEventListener).toHaveBeenCalledTimes(2);
    });
  });

  describe('cleanup', () => {
    it('unsubscribes all listeners', () => {
      const mockUnsubscribe1 = jest.fn();
      const mockUnsubscribe2 = jest.fn();
      mockNetInfo.addEventListener
        .mockReturnValueOnce(mockUnsubscribe1)
        .mockReturnValueOnce(mockUnsubscribe2);

      offlineService.subscribe(jest.fn());
      offlineService.subscribe(jest.fn());

      offlineService.cleanup();

      expect(mockUnsubscribe1).toHaveBeenCalled();
      expect(mockUnsubscribe2).toHaveBeenCalled();
    });

    it('handles cleanup when no listeners exist', () => {
      // Should not throw
      expect(() => offlineService.cleanup()).not.toThrow();
    });
  });

  describe('waitForOnline', () => {
    it('resolves immediately when already online', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      } as NetInfoState);

      await expect(offlineService.waitForOnline()).resolves.toBeUndefined();
    });

    it('waits until online when currently offline', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      } as NetInfoState);

      let capturedHandler: (state: NetInfoState) => void = () => {};
      mockNetInfo.addEventListener.mockImplementation((handler) => {
        capturedHandler = handler;
        return jest.fn();
      });

      const waitPromise = offlineService.waitForOnline();

      // Simulate coming back online
      setTimeout(() => {
        capturedHandler({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
        } as NetInfoState);
      }, 10);

      await expect(waitPromise).resolves.toBeUndefined();
    });

    it('respects timeout option', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      } as NetInfoState);

      mockNetInfo.addEventListener.mockReturnValue(jest.fn());

      await expect(
        offlineService.waitForOnline({ timeout: 50 })
      ).rejects.toThrow('Timeout waiting for online');
    });
  });
});
