import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LinkStickerScreen from '../../app/link-sticker';

// Mock expo-camera
const mockRequestPermission = jest.fn();
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: () => [{ granted: false }, mockRequestPermission],
}));

// Mock expo-router
const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
  useLocalSearchParams: () => ({}),
}));

// Mock useColorScheme
jest.mock('../../components/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

// Mock supabase
const mockGetSession = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

// Mock fetch
global.fetch = jest.fn();

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('LinkStickerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token', user: { id: 'user-1' } } },
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  it('renders link sticker screen', async () => {
    const { getByText } = render(<LinkStickerScreen />);

    await waitFor(() => {
      expect(getByText('Link Your Sticker')).toBeTruthy();
    });
  });

  it('shows code input field', async () => {
    const { getByPlaceholderText } = render(<LinkStickerScreen />);

    await waitFor(() => {
      expect(getByPlaceholderText('e.g., ABC123XY')).toBeTruthy();
    });
  });

  it('shows verify code button', async () => {
    const { getByText } = render(<LinkStickerScreen />);

    await waitFor(() => {
      expect(getByText('Verify Code')).toBeTruthy();
    });
  });

  it('shows cancel button', async () => {
    const { getByText } = render(<LinkStickerScreen />);

    await waitFor(() => {
      expect(getByText('Cancel')).toBeTruthy();
    });
  });

  it('handles cancel button press', async () => {
    const { getByText } = render(<LinkStickerScreen />);

    await waitFor(() => {
      expect(getByText('Cancel')).toBeTruthy();
    });

    fireEvent.press(getByText('Cancel'));

    expect(mockBack).toHaveBeenCalled();
  });

  it('allows entering sticker code', async () => {
    const { getByPlaceholderText } = render(<LinkStickerScreen />);

    await waitFor(() => {
      const input = getByPlaceholderText('e.g., ABC123XY');
      expect(input).toBeTruthy();
    });

    const input = getByPlaceholderText('e.g., ABC123XY');
    fireEvent.changeText(input, 'ABC123');

    expect(input.props.value).toBe('ABC123');
  });

  it('shows description text', async () => {
    const { getByText } = render(<LinkStickerScreen />);

    await waitFor(() => {
      expect(getByText('Scan the QR code on your sticker or enter the code manually')).toBeTruthy();
    });
  });

  describe('verify code API call', () => {
    it('calls verify API when code is entered and button pressed', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('verify-qr-code')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: 'assigned' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: 'disc-1', name: 'Destroyer' }]),
        });
      });

      const { getByText, getByPlaceholderText } = render(<LinkStickerScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('e.g., ABC123XY')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('e.g., ABC123XY'), 'ABC123XY');
      fireEvent.press(getByText('Verify Code'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/verify-qr-code'),
          expect.any(Object)
        );
      });
    });

    it('shows error when code is already active', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('verify-qr-code')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: 'active' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      const { getByText, getByPlaceholderText } = render(<LinkStickerScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('e.g., ABC123XY')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('e.g., ABC123XY'), 'ABC123XY');
      fireEvent.press(getByText('Verify Code'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Already Linked',
          'This sticker is already linked to a disc.'
        );
      });
    });

    it('shows error when code status is invalid', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('verify-qr-code')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: 'invalid' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      const { getByText, getByPlaceholderText } = render(<LinkStickerScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('e.g., ABC123XY')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('e.g., ABC123XY'), 'ABC123XY');
      fireEvent.press(getByText('Verify Code'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'This sticker cannot be linked. Please contact support.'
        );
      });
    });

    it('shows API error when response not ok', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('verify-qr-code')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Invalid code' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      const { getByText, getByPlaceholderText } = render(<LinkStickerScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('e.g., ABC123XY')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('e.g., ABC123XY'), 'ABC123XY');
      fireEvent.press(getByText('Verify Code'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Invalid code');
      });
    });
  });

  describe('disc selection', () => {
    it('shows disc selection after code verified', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('verify-qr-code')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: 'assigned' }),
          });
        }
        if (url.includes('get-user-discs')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              { id: 'disc-1', name: 'Destroyer', manufacturer: 'Innova' },
            ]),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      const { getByText, getByPlaceholderText } = render(<LinkStickerScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('e.g., ABC123XY')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('e.g., ABC123XY'), 'ABC123XY');
      fireEvent.press(getByText('Verify Code'));

      await waitFor(() => {
        expect(getByText('Select a Disc')).toBeTruthy();
      });
    });
  });

  describe('link disc flow', () => {
    it('calls link API when disc selected and button pressed', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('verify-qr-code')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: 'assigned' }),
          });
        }
        if (url.includes('get-user-discs')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              { id: 'disc-1', name: 'Destroyer', manufacturer: 'Innova' },
            ]),
          });
        }
        if (url.includes('link-qr-to-disc')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      const { getByText, getByPlaceholderText } = render(<LinkStickerScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('e.g., ABC123XY')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('e.g., ABC123XY'), 'ABC123XY');
      fireEvent.press(getByText('Verify Code'));

      await waitFor(() => {
        expect(getByText('Destroyer')).toBeTruthy();
      });

      // Select the disc
      fireEvent.press(getByText('Destroyer'));

      await waitFor(() => {
        expect(getByText('Link Sticker to Disc')).toBeTruthy();
      });

      fireEvent.press(getByText('Link Sticker to Disc'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/link-qr-to-disc'),
          expect.any(Object)
        );
      });
    });

    it('shows success alert after linking', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('verify-qr-code')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: 'assigned' }),
          });
        }
        if (url.includes('get-user-discs')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              { id: 'disc-1', name: 'Destroyer', manufacturer: 'Innova' },
            ]),
          });
        }
        if (url.includes('link-qr-to-disc')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      const { getByText, getByPlaceholderText } = render(<LinkStickerScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('e.g., ABC123XY')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('e.g., ABC123XY'), 'ABC123XY');
      fireEvent.press(getByText('Verify Code'));

      await waitFor(() => {
        expect(getByText('Destroyer')).toBeTruthy();
      });

      fireEvent.press(getByText('Destroyer'));
      fireEvent.press(getByText('Link Sticker to Disc'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success!',
          'Your sticker has been linked to your disc. Anyone who scans it can now contact you.',
          expect.any(Array)
        );
      });
    });

    it('handles link API error', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('verify-qr-code')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: 'assigned' }),
          });
        }
        if (url.includes('get-user-discs')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              { id: 'disc-1', name: 'Destroyer', manufacturer: 'Innova' },
            ]),
          });
        }
        if (url.includes('link-qr-to-disc')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Link failed' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      const { getByText, getByPlaceholderText } = render(<LinkStickerScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('e.g., ABC123XY')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('e.g., ABC123XY'), 'ABC123XY');
      fireEvent.press(getByText('Verify Code'));

      await waitFor(() => {
        expect(getByText('Destroyer')).toBeTruthy();
      });

      fireEvent.press(getByText('Destroyer'));
      fireEvent.press(getByText('Link Sticker to Disc'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Link failed');
      });
    });
  });

  describe('no session handling', () => {
    it('shows error when no session for verify', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      const { getByText, getByPlaceholderText } = render(<LinkStickerScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('e.g., ABC123XY')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('e.g., ABC123XY'), 'ABC123XY');
      fireEvent.press(getByText('Verify Code'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please sign in to link stickers');
      });
    });
  });

  describe('disc list rendering', () => {
    it('shows disc name and manufacturer', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('verify-qr-code')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: 'assigned' }),
          });
        }
        if (url.includes('get-user-discs')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              { id: 'disc-1', name: 'Destroyer', manufacturer: 'Innova', mold: 'Destroyer', color: 'Blue' },
            ]),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      const { getByText, getByPlaceholderText } = render(<LinkStickerScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('e.g., ABC123XY')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('e.g., ABC123XY'), 'ABC123XY');
      fireEvent.press(getByText('Verify Code'));

      await waitFor(() => {
        expect(getByText('Destroyer')).toBeTruthy();
        expect(getByText('Innova')).toBeTruthy();
        expect(getByText('Blue')).toBeTruthy();
      });
    });
  });
});
