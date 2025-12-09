import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCachedDiscs,
  setCachedDiscs,
  clearDiscCache,
  DISC_CACHE_KEY,
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
    it('stores discs as JSON string', async () => {
      const mockDiscs = [
        { id: '1', mold: 'Destroyer' },
        { id: '2', mold: 'Buzzz' },
      ];

      await setCachedDiscs(mockDiscs);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        DISC_CACHE_KEY,
        JSON.stringify(mockDiscs)
      );
    });

    it('handles AsyncStorage errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      // Should not throw
      await expect(
        setCachedDiscs([{ id: '1', mold: 'Test' }])
      ).resolves.not.toThrow();
    });
  });

  describe('clearDiscCache', () => {
    it('removes disc cache from storage', async () => {
      await clearDiscCache();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(DISC_CACHE_KEY);
    });

    it('handles AsyncStorage errors gracefully', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      // Should not throw
      await expect(clearDiscCache()).resolves.not.toThrow();
    });
  });
});
