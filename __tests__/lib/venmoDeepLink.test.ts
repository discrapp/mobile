import { Linking } from 'react-native';
import {
  generatePaymentNote,
  getVenmoAppUrl,
  getVenmoWebUrl,
  isValidVenmoUsername,
  formatVenmoUsername,
  openVenmoPayment,
  isVenmoInstalled,
} from '../../lib/venmoDeepLink';

// Mock Linking
jest.mock('react-native', () => ({
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

describe('venmoDeepLink', async () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePaymentNote', async () => {
    it('generates note with disc name', async () => {
      const note = generatePaymentNote('Destroyer');
      expect(note).toBe('🎁 Thank you for returning my Destroyer! 🥏');
    });

    it('generates generic note without disc name', async () => {
      const note = generatePaymentNote();
      expect(note).toBe('🎁 Thank you for returning my disc! 🥏');
    });

    it('generates generic note with undefined disc name', async () => {
      const note = generatePaymentNote(undefined);
      expect(note).toBe('🎁 Thank you for returning my disc! 🥏');
    });
  });

  describe('getVenmoAppUrl', async () => {
    it('generates correct app URL with all params', async () => {
      const url = getVenmoAppUrl({
        recipientUsername: 'John-Doe-5',
        amount: 10,
        discName: 'Destroyer',
      });
      // App URL uses spaces instead of %20 for better Venmo compatibility
      expect(url).toContain('venmo://paycharge?txn=pay&recipients=John-Doe-5&amount=10&note=');
      expect(url).toContain('Thank you for returning my Destroyer');
    });

    it('strips @ from username', async () => {
      const url = getVenmoAppUrl({
        recipientUsername: '@John-Doe-5',
        amount: 15.5,
      });
      expect(url).toContain('recipients=John-Doe-5');
      expect(url).not.toContain('recipients=@');
    });

    it('uses custom note when provided', async () => {
      const url = getVenmoAppUrl({
        recipientUsername: 'test-user',
        amount: 5,
        customNote: 'Custom payment note',
      });
      // Raw text is used in app URL (no encoding)
      expect(url).toBe('venmo://paycharge?txn=pay&recipients=test-user&amount=5&note=Custom payment note');
    });

    it('handles decimal amounts', async () => {
      const url = getVenmoAppUrl({
        recipientUsername: 'test-user',
        amount: 12.50,
      });
      expect(url).toContain('amount=12.5');
    });
  });

  describe('getVenmoWebUrl', async () => {
    it('generates correct web URL', async () => {
      const url = getVenmoWebUrl({
        recipientUsername: 'John-Doe-5',
        amount: 10,
        discName: 'Valkyrie',
      });
      // Web URL uses proper encoding
      expect(url).toContain('https://venmo.com/?txn=pay&recipients=John-Doe-5&amount=10&note=');
      expect(url).toContain('Thank%20you%20for%20returning%20my%20Valkyrie');
    });

    it('strips @ from username', async () => {
      const url = getVenmoWebUrl({
        recipientUsername: '@test-user',
        amount: 20,
      });
      expect(url).toContain('recipients=test-user');
      expect(url).not.toContain('recipients=@');
    });
  });

  describe('isValidVenmoUsername', async () => {
    it('accepts valid usernames', async () => {
      expect(isValidVenmoUsername('John-Doe-5')).toBe(true);
      expect(isValidVenmoUsername('johndoe')).toBe(true);
      expect(isValidVenmoUsername('john123')).toBe(true);
      expect(isValidVenmoUsername('Test-User-123')).toBe(true);
    });

    it('accepts username with @ prefix', async () => {
      expect(isValidVenmoUsername('@John-Doe-5')).toBe(true);
    });

    it('rejects empty username', async () => {
      expect(isValidVenmoUsername('')).toBe(false);
    });

    it('rejects username with consecutive dashes', async () => {
      expect(isValidVenmoUsername('john--doe')).toBe(false);
    });

    it('rejects too short usernames', async () => {
      expect(isValidVenmoUsername('abc')).toBe(false);
    });

    it('rejects usernames starting or ending with dash', async () => {
      expect(isValidVenmoUsername('-johndoe')).toBe(false);
      expect(isValidVenmoUsername('johndoe-')).toBe(false);
    });
  });

  describe('formatVenmoUsername', async () => {
    it('adds @ prefix', async () => {
      expect(formatVenmoUsername('johndoe')).toBe('@johndoe');
    });

    it('does not double @ prefix', async () => {
      expect(formatVenmoUsername('@johndoe')).toBe('@johndoe');
    });

    it('handles empty string', async () => {
      expect(formatVenmoUsername('')).toBe('');
    });
  });

  describe('isVenmoInstalled', async () => {
    it('returns true when Venmo app is available', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
      const result = await isVenmoInstalled();
      expect(result).toBe(true);
      expect(Linking.canOpenURL).toHaveBeenCalledWith('venmo://');
    });

    it('returns false when Venmo app is not available', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);
      const result = await isVenmoInstalled();
      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      (Linking.canOpenURL as jest.Mock).mockRejectedValue(new Error('test error'));
      const result = await isVenmoInstalled();
      expect(result).toBe(false);
    });
  });

  describe('openVenmoPayment', async () => {
    const params = {
      recipientUsername: 'test-user',
      amount: 10,
      discName: 'Destroyer',
    };

    it('opens Venmo app when available', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
      (Linking.openURL as jest.Mock).mockResolvedValue(true);

      const result = await openVenmoPayment(params);

      expect(result).toBe(true);
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining('venmo://paycharge')
      );
    });

    it('falls back to web URL when app not available', async () => {
      (Linking.canOpenURL as jest.Mock)
        .mockResolvedValueOnce(false) // App not available
        .mockResolvedValueOnce(true); // Web available
      (Linking.openURL as jest.Mock).mockResolvedValue(true);

      const result = await openVenmoPayment(params);

      expect(result).toBe(true);
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining('https://venmo.com')
      );
    });

    it('returns false when neither app nor web available', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);

      const result = await openVenmoPayment(params);

      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      (Linking.canOpenURL as jest.Mock).mockRejectedValue(new Error('test error'));

      const result = await openVenmoPayment(params);

      expect(result).toBe(false);
    });
  });
});
