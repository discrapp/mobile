/**
 * Cache service for offline data persistence
 * Provides a type-safe caching layer with TTL support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@discr/cache/';
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Cache entry structure with metadata
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Options for cache operations
 */
export interface CacheOptions {
  /** Time-to-live in milliseconds */
  ttl?: number;
}

/**
 * Predefined cache keys for consistency
 */
export const CACHE_KEYS = {
  DISC_COLLECTION: 'disc-collection',
  USER_PROFILE: 'user-profile',
  NOTIFICATIONS: 'notifications',
} as const;

/**
 * Cache service for managing offline data with TTL support
 */
export class CacheService {
  private prefix: string;
  private defaultTTL: number;

  constructor(options?: { prefix?: string; defaultTTL?: number }) {
    this.prefix = options?.prefix ?? CACHE_PREFIX;
    this.defaultTTL = options?.defaultTTL ?? DEFAULT_TTL_MS;
  }

  /**
   * Get the full storage key with prefix
   */
  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Get cached data by key
   * Returns null if key doesn't exist, is expired, or invalid
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const stored = await AsyncStorage.getItem(this.getKey(key));
      if (!stored) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(stored);

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  /**
   * Store data in cache with TTL
   */
  async set<T>(key: string, data: T, options?: CacheOptions): Promise<void> {
    try {
      const now = Date.now();
      const ttl = options?.ttl ?? this.defaultTTL;

      const entry: CacheEntry<T> = {
        data,
        timestamp: now,
        expiresAt: now + ttl,
      };

      await AsyncStorage.setItem(this.getKey(key), JSON.stringify(entry));
    } catch {
      // Silently fail - caching is best-effort
    }
  }

  /**
   * Remove a specific key from cache
   */
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.getKey(key));
    } catch {
      // Silently fail
    }
  }

  /**
   * Clear all cache entries with this service's prefix
   */
  async clear(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter((k) => k.startsWith(this.prefix));

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch {
      // Silently fail
    }
  }

  /**
   * Check if a cache entry is stale (expired or doesn't exist)
   */
  async isStale(key: string): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(this.getKey(key));
      if (!stored) {
        return true;
      }

      const entry: CacheEntry<unknown> = JSON.parse(stored);
      return Date.now() > entry.expiresAt;
    } catch {
      return true;
    }
  }

  /**
   * Get cache entry with full metadata (does not filter expired entries)
   */
  async getWithMetadata<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const stored = await AsyncStorage.getItem(this.getKey(key));
      if (!stored) {
        return null;
      }

      return JSON.parse(stored) as CacheEntry<T>;
    } catch {
      return null;
    }
  }
}

/**
 * Default cache service instance
 */
export const cacheService = new CacheService();
