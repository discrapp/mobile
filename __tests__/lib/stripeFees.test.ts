import {
  calculateStripeFee,
  calculateTotalWithFee,
  formatFeePreview,
  formatFeeHint,
} from '../../lib/stripeFees';

describe('stripeFees', () => {
  describe('calculateStripeFee', () => {
    it('returns 0 for zero reward', () => {
      expect(calculateStripeFee(0)).toBe(0);
    });

    it('returns 0 for negative reward', () => {
      expect(calculateStripeFee(-10)).toBe(0);
    });

    it('calculates fee for $10 reward', () => {
      const fee = calculateStripeFee(10);
      // Expected: (10 * 100 + 30) / (1 - 0.029) = 1030 / 0.971 = 1061 cents
      // Fee = 1061 - 1000 = 61 cents = $0.61
      expect(fee).toBeCloseTo(0.61, 1);
    });

    it('calculates fee for $20 reward', () => {
      const fee = calculateStripeFee(20);
      // Expected: (20 * 100 + 30) / (1 - 0.029) = 2030 / 0.971 = 2090 cents
      // Fee = 2090 - 2000 = 90 cents = $0.90
      expect(fee).toBeCloseTo(0.9, 1);
    });

    it('calculates fee for $50 reward', () => {
      const fee = calculateStripeFee(50);
      // Expected: (50 * 100 + 30) / (1 - 0.029) = 5030 / 0.971 = 5181 cents
      // Fee = 5181 - 5000 = 181 cents = $1.81
      expect(fee).toBeCloseTo(1.81, 1);
    });

    it('handles small amounts', () => {
      const fee = calculateStripeFee(1);
      expect(fee).toBeGreaterThan(0);
    });
  });

  describe('calculateTotalWithFee', () => {
    it('returns 0 for zero reward', () => {
      expect(calculateTotalWithFee(0)).toBe(0);
    });

    it('returns 0 for negative reward', () => {
      expect(calculateTotalWithFee(-10)).toBe(0);
    });

    it('calculates total for $10 reward', () => {
      const total = calculateTotalWithFee(10);
      expect(total).toBeGreaterThan(10);
      expect(total).toBeCloseTo(10.61, 1);
    });

    it('calculates total for $20 reward', () => {
      const total = calculateTotalWithFee(20);
      expect(total).toBeGreaterThan(20);
      expect(total).toBeCloseTo(20.9, 1);
    });

    it('handles small amounts', () => {
      const total = calculateTotalWithFee(1);
      expect(total).toBeGreaterThan(1);
    });
  });

  describe('formatFeePreview', () => {
    it('returns empty string for zero reward', () => {
      expect(formatFeePreview(0)).toBe('');
    });

    it('returns empty string for negative reward', () => {
      expect(formatFeePreview(-10)).toBe('');
    });

    it('formats fee preview for $10 reward', () => {
      const preview = formatFeePreview(10);
      expect(preview).toContain('$');
      expect(preview).toContain('with card');
      expect(preview).toContain('processing fee');
    });

    it('formats fee preview for $20 reward', () => {
      const preview = formatFeePreview(20);
      expect(preview).toMatch(/\$[\d.]+\s+with card/);
      expect(preview).toContain('processing fee');
    });

    it('includes total and fee amounts', () => {
      const preview = formatFeePreview(10);
      // Should match format: "$X.XX with card (includes $Y.YY processing fee)"
      expect(preview).toMatch(/\$\d+\.\d{2} with card \(includes \$\d+\.\d{2} processing fee\)/);
    });
  });

  describe('formatFeeHint', () => {
    it('returns empty string for zero reward', () => {
      expect(formatFeeHint(0)).toBe('');
    });

    it('returns empty string for negative reward', () => {
      expect(formatFeeHint(-10)).toBe('');
    });

    it('formats fee hint for $10 reward', () => {
      const hint = formatFeeHint(10);
      expect(hint).toContain('Card:');
      expect(hint).toContain('fee');
    });

    it('formats fee hint for $20 reward', () => {
      const hint = formatFeeHint(20);
      expect(hint).toMatch(/Card: \$[\d.]+/);
      expect(hint).toContain('+$');
      expect(hint).toContain('fee');
    });

    it('includes total and fee amounts', () => {
      const hint = formatFeeHint(10);
      // Should match format: "Card: $X.XX (+$Y.YY fee)"
      expect(hint).toMatch(/Card: \$\d+\.\d{2} \(\+\$\d+\.\d{2} fee\)/);
    });
  });
});
