import { STORAGE_KEYS } from '../../constants/storageKeys';

describe('STORAGE_KEYS', () => {
  describe('structure', () => {
    it('exports STORAGE_KEYS as a const object', () => {
      expect(STORAGE_KEYS).toBeDefined();
      expect(typeof STORAGE_KEYS).toBe('object');
    });

    it('is readonly (as const)', () => {
      // TypeScript ensures this at compile time
      // Runtime check that all values are strings
      Object.values(STORAGE_KEYS).forEach((value) => {
        expect(typeof value).toBe('string');
      });
    });
  });

  describe('disc cache keys', () => {
    it('defines DISC_CACHE key with correct value', () => {
      expect(STORAGE_KEYS.DISC_CACHE).toBe('@discr/discs_cache');
    });

    it('defines DISC_CACHE_TIMESTAMP key with correct value', () => {
      expect(STORAGE_KEYS.DISC_CACHE_TIMESTAMP).toBe(
        '@discr/discs_cache_timestamp'
      );
    });
  });

  describe('key naming convention', () => {
    it('all keys follow @discr/ prefix convention', () => {
      Object.entries(STORAGE_KEYS).forEach(([key, value]) => {
        expect(value).toMatch(
          /^@discr\//,
          `Key ${key} should start with @discr/`
        );
      });
    });

    it('all keys use lowercase with underscores', () => {
      Object.entries(STORAGE_KEYS).forEach(([key, value]) => {
        // Remove @discr/ prefix and check format
        const keyPart = value.replace('@discr/', '');
        expect(keyPart).toMatch(
          /^[a-z_]+$/,
          `Value for ${key} should use lowercase and underscores`
        );
      });
    });
  });

  describe('type safety', () => {
    it('provides StorageKey type for values', () => {
      // This test verifies the type exists at compile time
      // At runtime, we just verify the keys exist
      const keys = Object.keys(STORAGE_KEYS);
      expect(keys.length).toBeGreaterThan(0);
    });
  });
});
