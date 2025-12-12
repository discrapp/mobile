import AsyncStorage from '@react-native-async-storage/async-storage';

export const DISC_CACHE_KEY = '@aceback/discs_cache';
export const DISC_CACHE_TIMESTAMP_KEY = '@aceback/discs_cache_timestamp';

// Cache is considered stale after 30 seconds
const CACHE_TTL_MS = 30 * 1000;

export interface CachedDisc {
  id: string;
  mold?: string;
  name?: string;
  manufacturer?: string;
  plastic?: string;
  weight?: number;
  color?: string;
  flight_numbers?: {
    speed: number | null;
    glide: number | null;
    turn: number | null;
    fade: number | null;
  };
  reward_amount?: string;
  notes?: string;
  created_at?: string;
  photos?: Array<{
    id: string;
    storage_path: string;
    photo_uuid: string;
    photo_url?: string;
    created_at: string;
  }>;
  active_recovery?: {
    id: string;
    status: string;
    finder_id: string;
    found_at: string;
  } | null;
  was_surrendered?: boolean;
  surrendered_at?: string | null;
}

/**
 * Get cached discs from AsyncStorage
 * Returns null if cache is empty or invalid
 */
export async function getCachedDiscs(): Promise<CachedDisc[] | null> {
  try {
    const cached = await AsyncStorage.getItem(DISC_CACHE_KEY);
    if (!cached) {
      return null;
    }
    return JSON.parse(cached);
  } catch (error) {
    console.error('Error reading disc cache:', error);
    return null;
  }
}

/**
 * Save discs to AsyncStorage cache with timestamp
 */
export async function setCachedDiscs(discs: CachedDisc[]): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [DISC_CACHE_KEY, JSON.stringify(discs)],
      [DISC_CACHE_TIMESTAMP_KEY, Date.now().toString()],
    ]);
  } catch (error) {
    console.error('Error saving disc cache:', error);
  }
}

/**
 * Check if the cache is stale (older than TTL)
 * Returns true if cache should be refreshed
 */
export async function isCacheStale(): Promise<boolean> {
  try {
    const timestamp = await AsyncStorage.getItem(DISC_CACHE_TIMESTAMP_KEY);
    if (!timestamp) {
      return true;
    }
    const cacheAge = Date.now() - parseInt(timestamp, 10);
    return cacheAge > CACHE_TTL_MS;
  } catch (error) {
    console.error('Error checking cache staleness:', error);
    return true;
  }
}

/**
 * Clear the disc cache and timestamp
 */
export async function clearDiscCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([DISC_CACHE_KEY, DISC_CACHE_TIMESTAMP_KEY]);
  } catch (error) {
    console.error('Error clearing disc cache:', error);
  }
}
