/**
 * Tests for disc color constants
 *
 * These tests ensure disc color mappings are centralized and have expected values.
 * Following TDD principles - these tests are written BEFORE implementation.
 */

import { DISC_COLORS, DiscColorName } from '@/constants/discColors';

describe('DISC_COLORS constants', () => {
  describe('structure', () => {
    it('should export DISC_COLORS object', () => {
      expect(DISC_COLORS).toBeDefined();
      expect(typeof DISC_COLORS).toBe('object');
    });

    it('should be immutable (frozen)', () => {
      expect(Object.isFrozen(DISC_COLORS)).toBe(true);
    });

    it('should have all expected color keys', () => {
      const expectedColors: DiscColorName[] = [
        'Red',
        'Orange',
        'Yellow',
        'Green',
        'Blue',
        'Purple',
        'Pink',
        'White',
        'Black',
        'Gray',
        'Multi',
      ];

      expectedColors.forEach((color) => {
        expect(DISC_COLORS[color]).toBeDefined();
      });
    });

    it('should have exactly 11 colors', () => {
      expect(Object.keys(DISC_COLORS)).toHaveLength(11);
    });
  });

  describe('color values', () => {
    it('should have correct hex value for Red', () => {
      expect(DISC_COLORS.Red).toBe('#E74C3C');
    });

    it('should have correct hex value for Orange', () => {
      expect(DISC_COLORS.Orange).toBe('#E67E22');
    });

    it('should have correct hex value for Yellow', () => {
      expect(DISC_COLORS.Yellow).toBe('#F1C40F');
    });

    it('should have correct hex value for Green', () => {
      expect(DISC_COLORS.Green).toBe('#2ECC71');
    });

    it('should have correct hex value for Blue', () => {
      expect(DISC_COLORS.Blue).toBe('#3498DB');
    });

    it('should have correct hex value for Purple', () => {
      expect(DISC_COLORS.Purple).toBe('#9B59B6');
    });

    it('should have correct hex value for Pink', () => {
      expect(DISC_COLORS.Pink).toBe('#E91E63');
    });

    it('should have correct hex value for White', () => {
      expect(DISC_COLORS.White).toBe('#ECF0F1');
    });

    it('should have correct hex value for Black', () => {
      expect(DISC_COLORS.Black).toBe('#2C3E50');
    });

    it('should have correct hex value for Gray', () => {
      expect(DISC_COLORS.Gray).toBe('#95A5A6');
    });

    it('should have "rainbow" value for Multi', () => {
      expect(DISC_COLORS.Multi).toBe('rainbow');
    });
  });

  describe('type safety', () => {
    it('should allow accessing colors by string key', () => {
      const colorName = 'Blue' as DiscColorName;
      expect(DISC_COLORS[colorName]).toBe('#3498DB');
    });

    it('should return undefined for unknown colors when accessed with string', () => {
      // This tests runtime behavior when an unknown color is passed
      const unknownColor = 'Unknown' as string;
      expect((DISC_COLORS as Record<string, string>)[unknownColor]).toBeUndefined();
    });
  });
});
