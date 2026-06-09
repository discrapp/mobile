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

describe('DeepLinkHandler', async () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLocalSearchParams.mockReturnValue({ code: 'ABC123' });
    useAuth.mockReturnValue({ user: null, loading: false });
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
  });

  it('shows loading state initially', async () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const { getByText } = await render(<DeepLinkHandler />);

    expect(getByText('Looking up disc...')).toBeTruthy();
  });

  it('shows error when no code provided', async () => {
    useLocalSearchParams.mockReturnValue({ code: undefined });

    const { getByText } = await render(<DeepLinkHandler />);

    await waitFor(() => {
      expect(getByText('Invalid QR code')).toBeTruthy();
    });
  });

  it('redirects to disc detail when user owns disc', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({
        found: true,
        is_owner: true,
        disc: { id: 'disc-123' },
      }),
    });

    render(<DeepLinkHandler />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/disc/disc-123');
    });
  });

  it('redirects to found-disc when user does not own disc', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({
        found: true,
        is_owner: false,
        disc: { id: 'disc-123' },
      }),
    });

    render(<DeepLinkHandler />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/(tabs)/found-disc',
        params: { scannedCode: 'ABC123' },
      });
    });
  });

  it('shows error when disc not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({ found: false }),
    });

    const { getByText } = await render(<DeepLinkHandler />);

    await waitFor(() => {
      expect(getByText('No disc found with this QR code')).toBeTruthy();
    });
  });

  it('shows error on API failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { getByText } = await render(<DeepLinkHandler />);

    await waitFor(() => {
      expect(getByText('Failed to look up QR code')).toBeTruthy();
    });
  });

  it('waits for auth loading to complete', async () => {
    useAuth.mockReturnValue({ user: null, loading: true });

    render(<DeepLinkHandler />);

    // Should not call fetch while auth is loading
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('converts code to uppercase', async () => {
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

  it('includes auth token in request when available', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'my-token' } },
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({ found: false }),
    });

    render(<DeepLinkHandler />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-token',
          }),
        })
      );
    });
  });

  it('shows link to found-disc on error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({ found: false }),
    });

    const { getByText } = await render(<DeepLinkHandler />);

    await waitFor(() => {
      expect(getByText('Go to Found Disc')).toBeTruthy();
    });
  });
});
