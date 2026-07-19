import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearUserCache } from '@/utils/clearUserCache';
import { STORAGE_KEYS } from '@/constants/storageKeys';

jest.mock('@react-native-async-storage/async-storage', () => ({
  multiRemove: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

const mockMultiRemove = AsyncStorage.multiRemove as jest.MockedFunction<
  typeof AsyncStorage.multiRemove
>;

describe('clearUserCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes all user data storage keys', async () => {
    mockMultiRemove.mockResolvedValue(undefined);

    await clearUserCache();

    expect(mockMultiRemove).toHaveBeenCalledWith([
      STORAGE_KEYS.DISC_CACHE,
      STORAGE_KEYS.DISC_CACHE_TIMESTAMP,
    ]);
  });

  it('logs debug message on success', async () => {
    const { logger } = require('@/lib/logger');
    mockMultiRemove.mockResolvedValue(undefined);

    await clearUserCache();

    expect(logger.debug).toHaveBeenCalledWith('User cache cleared');
  });

  it('logs error on failure', async () => {
    const { logger } = require('@/lib/logger');
    const error = new Error('Storage error');
    mockMultiRemove.mockRejectedValue(error);

    await clearUserCache();

    expect(logger.error).toHaveBeenCalledWith('Error clearing user cache:', error);
  });

  it('does not clear biometric settings', async () => {
    mockMultiRemove.mockResolvedValue(undefined);

    await clearUserCache();

    const callArgs = mockMultiRemove.mock.calls[0][0];
    expect(callArgs).not.toContain(STORAGE_KEYS.BIOMETRIC_ENABLED);
  });
});
