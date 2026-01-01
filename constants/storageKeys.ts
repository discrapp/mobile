/**
 * AsyncStorage key constants
 *
 * All storage keys should be defined here to:
 * - Prevent typos
 * - Provide a single source of truth
 * - Enable easier refactoring
 * - Provide type safety
 *
 * Naming conventions:
 * - All keys use @discr/ prefix
 * - Key parts use lowercase with underscores
 */
export const STORAGE_KEYS = {
  /** Cache of user's discs */
  DISC_CACHE: '@discr/discs_cache',
  /** Timestamp of when disc cache was last updated */
  DISC_CACHE_TIMESTAMP: '@discr/discs_cache_timestamp',
  /** Whether biometric authentication is enabled */
  BIOMETRIC_ENABLED: '@discr/biometric_enabled',
} as const;

/** Type representing all storage key values */
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
