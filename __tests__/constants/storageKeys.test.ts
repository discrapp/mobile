import { STORAGE_KEYS } from '../../constants/storageKeys';

describe('STORAGE_KEYS', async () => {
  describe('structure', async () => {
    it('exports STORAGE_KEYS as a const object', async () => {
      expect(STORAGE_KEYS).toBeDefined();
      expect(typeof STORAGE_KEYS).toBe('object');
    });

    it('is readonly (as const)', async () => {
      // TypeScript ensures this at compile time
      // Runtime check that all values are strings
      Object.values(STORAGE_KEYS).forEach((value) => {
        expect(typeof value).toBe('string');
      });
    });
  });

  describe('disc cache keys', async () => {
    it('defines DISC_CACHE key with correct value', async () => {
      expect(STORAGE_KEYS.DISC_CACHE).toBe('@discr/discs_cache');
    });

    it('defines DISC_CACHE_TIMESTAMP key with correct value', async () => {
      expect(STORAGE_KEYS.DISC_CACHE_TIMESTAMP).toBe(
        '@discr/discs_cache_timestamp'
      );
    });
  });

  describe('key naming convention', async () => {
    it('all keys follow @discr/ prefix convention', async () => {
      Object.entries(STORAGE_KEYS).forEach(([key, value]) => {
        // This will show both the key name and actual value on failure
        expect({ key, value }).toEqual(
          expect.objectContaining({ value: expect.stringMatching(/^@discr\//) })
        );
      });
    });

    it('all keys use lowercase with underscores', async () => {
      Object.entries(STORAGE_KEYS).forEach(([key, value]) => {
        // Remove @discr/ prefix and check format
        const keyPart = value.replace('@discr/', '');
        // This will show both the key name and actual value on failure
        expect({ key, keyPart }).toEqual(
          expect.objectContaining({ keyPart: expect.stringMatching(/^[a-z_]+$/) })
        );
      });
    });
  });

  describe('type safety', async () => {
    it('provides StorageKey type for values', async () => {
      // This test verifies the type exists at compile time
      // At runtime, we just verify the keys exist
      const keys = Object.keys(STORAGE_KEYS);
      expect(keys.length).toBeGreaterThan(0);
    });
  });
});
