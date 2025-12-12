import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCachedDiscs,
  setCachedDiscs,
  clearDiscCache,
  isCacheStale,
  DISC_CACHE_KEY,
  DISC_CACHE_TIMESTAMP_KEY,
} from '../../utils/discCache';

// AsyncStorage is already mocked in jest.setup.js

describe('discCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCachedDiscs', () => {
    it('returns null when cache is empty', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getCachedDiscs();

      expect(result).toBeNull();
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(DISC_CACHE_KEY);
    });

    it('returns parsed discs when cache exists', async () => {
      const mockDiscs = [
        { id: '1', mold: 'Destroyer' },
        { id: '2', mold: 'Buzzz' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockDiscs)
      );

      const result = await getCachedDiscs();

      expect(result).toEqual(mockDiscs);
    });

    it('returns null when JSON parsing fails', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      const result = await getCachedDiscs();

      expect(result).toBeNull();
    });

    it('returns null when AsyncStorage throws', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      const result = await getCachedDiscs();

      expect(result).toBeNull();
    });
  });

  describe('setCachedDiscs', () => {
    it('stores discs and timestamp', async () => {
      const mockDiscs = [
        { id: '1', mold: 'Destroyer' },
        { id: '2', mold: 'Buzzz' },
      ];
      const mockNow = 1700000000000;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      await setCachedDiscs(mockDiscs);

      expect(AsyncStorage.multiSet).toHaveBeenCalledWith([
        [DISC_CACHE_KEY, JSON.stringify(mockDiscs)],
        [DISC_CACHE_TIMESTAMP_KEY, mockNow.toString()],
      ]);

      jest.restoreAllMocks();
    });

    it('handles AsyncStorage errors gracefully', async () => {
      (AsyncStorage.multiSet as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      // Should not throw
      await expect(
        setCachedDiscs([{ id: '1', mold: 'Test' }])
      ).resolves.not.toThrow();
    });
  });

  describe('clearDiscCache', () => {
    it('removes disc cache and timestamp from storage', async () => {
      await clearDiscCache();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        DISC_CACHE_KEY,
        DISC_CACHE_TIMESTAMP_KEY,
      ]);
    });

    it('handles AsyncStorage errors gracefully', async () => {
      (AsyncStorage.multiRemove as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      // Should not throw
      await expect(clearDiscCache()).resolves.not.toThrow();
    });
  });

  describe('isCacheStale', () => {
    it('returns true when no timestamp exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await isCacheStale();

      expect(result).toBe(true);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(DISC_CACHE_TIMESTAMP_KEY);
    });

    it('returns false when cache is fresh (within 30 seconds)', async () => {
      const mockNow = 1700000000000;
      const recentTimestamp = (mockNow - 10000).toString(); // 10 seconds ago
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(recentTimestamp);

      const result = await isCacheStale();

      expect(result).toBe(false);
      jest.restoreAllMocks();
    });

    it('returns true when cache is stale (older than 30 seconds)', async () => {
      const mockNow = 1700000000000;
      const oldTimestamp = (mockNow - 60000).toString(); // 60 seconds ago
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(oldTimestamp);

      const result = await isCacheStale();

      expect(result).toBe(true);
      jest.restoreAllMocks();
    });

    it('returns true when AsyncStorage throws', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      const result = await isCacheStale();

      expect(result).toBe(true);
    });
  });
});
