import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { logger } from '@/lib/logger';

/**
 * Storage keys that contain user-specific data and should be cleared on sign out.
 * Device-specific settings (like biometric_enabled) are NOT included.
 */
const USER_DATA_KEYS = [
  STORAGE_KEYS.DISC_CACHE,
  STORAGE_KEYS.DISC_CACHE_TIMESTAMP,
] as const;

/**
 * Clear all cached user data from AsyncStorage.
 * Should be called on sign out to prevent the next user from seeing
 * the previous user's data.
 *
 * Note: Device-specific settings (e.g., biometric preferences) are NOT cleared.
 */
export async function clearUserCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([...USER_DATA_KEYS]);
    logger.debug('User cache cleared');
  } catch (error) {
    logger.error('Error clearing user cache:', error);
  }
}
