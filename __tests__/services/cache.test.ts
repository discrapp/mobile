/**
 * Tests for cache service
 * TDD: These tests are written FIRST before implementation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CacheService,
  CacheOptions,
  CacheEntry,
  CACHE_KEYS,
} from '@/services/cache';

// AsyncStorage is already mocked in jest.setup.js

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheService = new CacheService();
  });

  describe('get', () => {
    it('returns null when key does not exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await cacheService.get('non-existent-key');

      expect(result).toBeNull();
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@discr/cache/non-existent-key');
    });

    it('returns cached value when key exists and not expired', async () => {
      const mockData = { id: '123', name: 'Test Disc' };
      const cacheEntry: CacheEntry<typeof mockData> = {
        data: mockData,
        timestamp: Date.now(),
        expiresAt: Date.now() + 60000, // expires in 1 minute
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cacheEntry));

      const result = await cacheService.get<typeof mockData>('test-key');

      expect(result).toEqual(mockData);
    });

    it('returns null when cache entry is expired', async () => {
      const mockData = { id: '123', name: 'Test Disc' };
      const cacheEntry: CacheEntry<typeof mockData> = {
        data: mockData,
        timestamp: Date.now() - 120000, // 2 minutes ago
        expiresAt: Date.now() - 60000, // expired 1 minute ago
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cacheEntry));

      const result = await cacheService.get<typeof mockData>('test-key');

      expect(result).toBeNull();
    });

    it('returns null when JSON parsing fails', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });

    it('returns null when AsyncStorage throws', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('stores data with default TTL', async () => {
      const mockData = { id: '123', name: 'Test Disc' };
      const mockNow = 1700000000000;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      await cacheService.set('test-key', mockData);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@discr/cache/test-key',
        expect.stringContaining('"data":{"id":"123","name":"Test Disc"}')
      );

      // Verify the stored entry has correct structure
      const storedCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const storedEntry = JSON.parse(storedCall[1]);
      expect(storedEntry.data).toEqual(mockData);
      expect(storedEntry.timestamp).toBe(mockNow);
      expect(storedEntry.expiresAt).toBe(mockNow + 5 * 60 * 1000); // default 5 min TTL

      jest.restoreAllMocks();
    });

    it('stores data with custom TTL', async () => {
      const mockData = { id: '123' };
      const mockNow = 1700000000000;
      const customTTL = 30 * 60 * 1000; // 30 minutes
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      await cacheService.set('test-key', mockData, { ttl: customTTL });

      const storedCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const storedEntry = JSON.parse(storedCall[1]);
      expect(storedEntry.expiresAt).toBe(mockNow + customTTL);

      jest.restoreAllMocks();
    });

    it('handles AsyncStorage errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage full'));

      // Should not throw
      await expect(cacheService.set('test-key', { data: 'test' })).resolves.not.toThrow();
    });
  });

  describe('remove', () => {
    it('removes item from cache', async () => {
      await cacheService.remove('test-key');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@discr/cache/test-key');
    });

    it('handles AsyncStorage errors gracefully', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(cacheService.remove('test-key')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('clears all cache entries', async () => {
      const allKeys = [
        '@discr/cache/key1',
        '@discr/cache/key2',
        '@discr/other/key3', // should not be removed
        '@discr/cache/key4',
      ];
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(allKeys);

      await cacheService.clear();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@discr/cache/key1',
        '@discr/cache/key2',
        '@discr/cache/key4',
      ]);
    });

    it('handles empty cache gracefully', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);

      await cacheService.clear();

      expect(AsyncStorage.multiRemove).not.toHaveBeenCalled();
    });

    it('handles AsyncStorage errors gracefully', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(cacheService.clear()).resolves.not.toThrow();
    });
  });

  describe('isStale', () => {
    it('returns true when key does not exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await cacheService.isStale('test-key');

      expect(result).toBe(true);
    });

    it('returns false when cache entry is not expired', async () => {
      const cacheEntry: CacheEntry<unknown> = {
        data: {},
        timestamp: Date.now(),
        expiresAt: Date.now() + 60000,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cacheEntry));

      const result = await cacheService.isStale('test-key');

      expect(result).toBe(false);
    });

    it('returns true when cache entry is expired', async () => {
      const cacheEntry: CacheEntry<unknown> = {
        data: {},
        timestamp: Date.now() - 120000,
        expiresAt: Date.now() - 60000,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cacheEntry));

      const result = await cacheService.isStale('test-key');

      expect(result).toBe(true);
    });

    it('returns true when parsing fails', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      const result = await cacheService.isStale('test-key');

      expect(result).toBe(true);
    });
  });

  describe('getWithMetadata', () => {
    it('returns null when key does not exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await cacheService.getWithMetadata('test-key');

      expect(result).toBeNull();
    });

    it('returns full cache entry with metadata', async () => {
      const mockData = { id: '123' };
      const cacheEntry: CacheEntry<typeof mockData> = {
        data: mockData,
        timestamp: 1700000000000,
        expiresAt: 1700000060000,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cacheEntry));

      const result = await cacheService.getWithMetadata<typeof mockData>('test-key');

      expect(result).toEqual(cacheEntry);
    });

    it('returns expired entries (does not filter)', async () => {
      const mockData = { id: '123' };
      const cacheEntry: CacheEntry<typeof mockData> = {
        data: mockData,
        timestamp: Date.now() - 120000,
        expiresAt: Date.now() - 60000, // expired
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cacheEntry));

      const result = await cacheService.getWithMetadata<typeof mockData>('test-key');

      expect(result).toEqual(cacheEntry);
    });
  });
});

describe('CACHE_KEYS', () => {
  it('exports disc collection cache key', () => {
    expect(CACHE_KEYS.DISC_COLLECTION).toBe('disc-collection');
  });

  it('exports user profile cache key', () => {
    expect(CACHE_KEYS.USER_PROFILE).toBe('user-profile');
  });

  it('exports notifications cache key', () => {
    expect(CACHE_KEYS.NOTIFICATIONS).toBe('notifications');
  });
});
