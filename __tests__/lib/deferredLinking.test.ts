import * as Clipboard from 'expo-clipboard';

import {
  isValidAceBackCode,
  checkClipboardForCode,
} from '@/lib/deferredLinking';

// Mock expo-clipboard
jest.mock('expo-clipboard', () => ({
  hasStringAsync: jest.fn(),
  getStringAsync: jest.fn(),
}));

describe('deferredLinking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isValidAceBackCode', () => {
    it('returns true for valid 6-character uppercase code', () => {
      expect(isValidAceBackCode('ABC123')).toBe(true);
    });

    it('returns true for valid 8-character uppercase code', () => {
      expect(isValidAceBackCode('ABCD1234')).toBe(true);
    });

    it('returns true for valid 7-character code', () => {
      expect(isValidAceBackCode('ABC1234')).toBe(true);
    });

    it('converts lowercase to uppercase and validates', () => {
      expect(isValidAceBackCode('abc123')).toBe(true);
    });

    it('returns false for code shorter than 6 characters', () => {
      expect(isValidAceBackCode('ABC12')).toBe(false);
    });

    it('returns false for code longer than 8 characters', () => {
      expect(isValidAceBackCode('ABCDE12345')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidAceBackCode('')).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(isValidAceBackCode(null as unknown as string)).toBe(false);
      expect(isValidAceBackCode(undefined as unknown as string)).toBe(false);
    });

    it('returns false for code with special characters', () => {
      expect(isValidAceBackCode('ABC-12')).toBe(false);
      expect(isValidAceBackCode('ABC_12')).toBe(false);
    });

    it('trims whitespace before validating', () => {
      expect(isValidAceBackCode('  ABC123  ')).toBe(true);
    });
  });

  describe('checkClipboardForCode', () => {
    it('returns null when clipboard is empty', async () => {
      (Clipboard.hasStringAsync as jest.Mock).mockResolvedValue(false);

      const result = await checkClipboardForCode();

      expect(result).toBeNull();
    });

    it('returns null when clipboard has no string', async () => {
      (Clipboard.hasStringAsync as jest.Mock).mockResolvedValue(true);
      (Clipboard.getStringAsync as jest.Mock).mockResolvedValue('');

      const result = await checkClipboardForCode();

      expect(result).toBeNull();
    });

    it('returns uppercase code when clipboard contains valid code', async () => {
      (Clipboard.hasStringAsync as jest.Mock).mockResolvedValue(true);
      (Clipboard.getStringAsync as jest.Mock).mockResolvedValue('abc123');

      const result = await checkClipboardForCode();

      expect(result).toBe('ABC123');
    });

    it('extracts code from AceBack URL in clipboard', async () => {
      (Clipboard.hasStringAsync as jest.Mock).mockResolvedValue(true);
      (Clipboard.getStringAsync as jest.Mock).mockResolvedValue(
        'https://aceback.app/d/XYZ789'
      );

      const result = await checkClipboardForCode();

      expect(result).toBe('XYZ789');
    });

    it('extracts code from URL with lowercase', async () => {
      (Clipboard.hasStringAsync as jest.Mock).mockResolvedValue(true);
      (Clipboard.getStringAsync as jest.Mock).mockResolvedValue(
        'https://aceback.app/d/xyz789'
      );

      const result = await checkClipboardForCode();

      expect(result).toBe('XYZ789');
    });

    it('returns null for invalid content', async () => {
      (Clipboard.hasStringAsync as jest.Mock).mockResolvedValue(true);
      (Clipboard.getStringAsync as jest.Mock).mockResolvedValue(
        'random text that is not a code'
      );

      const result = await checkClipboardForCode();

      expect(result).toBeNull();
    });

    it('returns null on clipboard error', async () => {
      (Clipboard.hasStringAsync as jest.Mock).mockRejectedValue(
        new Error('Clipboard access denied')
      );

      const result = await checkClipboardForCode();

      expect(result).toBeNull();
    });
  });
});
