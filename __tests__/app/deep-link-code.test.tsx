import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import DeepLinkHandler from '../../app/d/[code]';

// Mock expo-router
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({ code: 'ABC123' })),
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

const { useLocalSearchParams } = require('expo-router');

// Mock useAuth
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({ user: null, loading: false })),
}));

const { useAuth } = require('../../contexts/AuthContext');

// Mock supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

const { supabase } = require('../../lib/supabase');

// Mock fetch
global.fetch = jest.fn();

describe('DeepLinkHandler QR Code Validation', async () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: null, loading: false });
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
  });

  describe('Valid QR codes', async () => {
    it('accepts 6-character alphanumeric code', async () => {
      useLocalSearchParams.mockReturnValue({ code: 'ABC123' });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ found: false }),
      });

      render(<DeepLinkHandler />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('accepts 10-character alphanumeric code', async () => {
      useLocalSearchParams.mockReturnValue({ code: 'ABCD123456' });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ found: false }),
      });

      render(<DeepLinkHandler />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('accepts lowercase codes (converts to uppercase)', async () => {
      useLocalSearchParams.mockReturnValue({ code: 'abc123' });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ found: false }),
      });

      render(<DeepLinkHandler />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('code=ABC123'),
          expect.any(Object)
        );
      });
    });

    it('accepts all-letters code', async () => {
      useLocalSearchParams.mockReturnValue({ code: 'ABCDEF' });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ found: false }),
      });

      render(<DeepLinkHandler />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('accepts all-numbers code', async () => {
      useLocalSearchParams.mockReturnValue({ code: '123456' });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ found: false }),
      });

      render(<DeepLinkHandler />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Invalid QR codes - should not call API', async () => {
    it('rejects code shorter than 6 characters', async () => {
      useLocalSearchParams.mockReturnValue({ code: 'ABC12' });

      const { getByText } = await render(<DeepLinkHandler />);

      await waitFor(() => {
        expect(getByText('Invalid QR code format')).toBeTruthy();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('rejects code longer than 10 characters', async () => {
      useLocalSearchParams.mockReturnValue({ code: 'ABCD12345678' });

      const { getByText } = await render(<DeepLinkHandler />);

      await waitFor(() => {
        expect(getByText('Invalid QR code format')).toBeTruthy();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('rejects code with special characters', async () => {
      useLocalSearchParams.mockReturnValue({ code: 'ABC-123' });

      const { getByText } = await render(<DeepLinkHandler />);

      await waitFor(() => {
        expect(getByText('Invalid QR code format')).toBeTruthy();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('rejects code with spaces', async () => {
      useLocalSearchParams.mockReturnValue({ code: 'ABC 123' });

      const { getByText } = await render(<DeepLinkHandler />);

      await waitFor(() => {
        expect(getByText('Invalid QR code format')).toBeTruthy();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('rejects code with SQL injection attempt', async () => {
      useLocalSearchParams.mockReturnValue({ code: "ABC'; DROP TABLE--" });

      const { getByText } = await render(<DeepLinkHandler />);

      await waitFor(() => {
        expect(getByText('Invalid QR code format')).toBeTruthy();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('rejects code with URL encoding', async () => {
      useLocalSearchParams.mockReturnValue({ code: 'ABC%20123' });

      const { getByText } = await render(<DeepLinkHandler />);

      await waitFor(() => {
        expect(getByText('Invalid QR code format')).toBeTruthy();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('rejects empty string', async () => {
      useLocalSearchParams.mockReturnValue({ code: '' });

      const { getByText } = await render(<DeepLinkHandler />);

      await waitFor(() => {
        expect(getByText('Invalid QR code')).toBeTruthy();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('rejects code with unicode characters', async () => {
      useLocalSearchParams.mockReturnValue({ code: 'ABC123\u0000' });

      const { getByText } = await render(<DeepLinkHandler />);

      await waitFor(() => {
        expect(getByText('Invalid QR code format')).toBeTruthy();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
