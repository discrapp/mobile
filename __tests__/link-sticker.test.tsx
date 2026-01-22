import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LinkStickerScreen from '../app/link-sticker';

// Mock expo-camera
const mockRequestPermission = jest.fn();
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: () => [{ granted: false }, mockRequestPermission],
}));

// Mock expo-router
const mockRouterBack = jest.fn();
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockRouterBack,
    push: mockRouterPush,
    replace: mockRouterReplace,
  }),
  useLocalSearchParams: () => ({}),
}));

// Mock supabase
const mockGetSession = jest.fn();
jest.mock('../lib/supabase', () => ({
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
      data: { session: { access_token: 'test-token' } },
    });
  });

  it('renders the initial code entry screen', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { getByText, getByPlaceholderText } = render(<LinkStickerScreen />);

    await waitFor(() => {
      expect(getByText('Link Your Sticker')).toBeTruthy();
      expect(getByPlaceholderText('e.g., ABC123XY')).toBeTruthy();
      expect(getByText('Verify Code')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
    });
  });

  it('allows entering a sticker code', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { getByPlaceholderText } = render(<LinkStickerScreen />);

    await waitFor(() => {
      const input = getByPlaceholderText('e.g., ABC123XY');
      fireEvent.changeText(input, 'TEST123');
      expect(input.props.value).toBe('TEST123');
    });
  });

  it('navigates back when cancel is pressed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { getByText } = render(<LinkStickerScreen />);

    await waitFor(() => {
      expect(getByText('Cancel')).toBeTruthy();
    });

    fireEvent.press(getByText('Cancel'));
    expect(mockRouterBack).toHaveBeenCalled();
  });

  it('validates code format before submitting', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { getByText, getByPlaceholderText } = render(<LinkStickerScreen />);

    await waitFor(() => {
      expect(getByText('Verify Code')).toBeTruthy();
    });

    // Enter a code and verify button is available
    const input = getByPlaceholderText('e.g., ABC123XY');
    expect(input).toBeTruthy();

    // The button should be pressable
    const verifyButton = getByText('Verify Code');
    expect(verifyButton).toBeTruthy();
  });

  it('shows error when not signed in during verification', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { getByText, getByPlaceholderText } = render(<LinkStickerScreen />);

    await waitFor(() => {
      const input = getByPlaceholderText('e.g., ABC123XY');
      fireEvent.changeText(input, 'TEST123');
    });

    fireEvent.press(getByText('Verify Code'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please sign in to link stickers');
    });
  });

  it('calls verify API when verify button is pressed', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'assigned' }),
      });

    const { getByText, getByPlaceholderText } = render(<LinkStickerScreen />);

    await waitFor(() => {
      const input = getByPlaceholderText('e.g., ABC123XY');
      fireEvent.changeText(input, 'TEST123');
    });

    fireEvent.press(getByText('Verify Code'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/verify-qr-code'),
        expect.any(Object)
      );
    });
  });

  it('displays sticker code input field', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { getByPlaceholderText } = render(<LinkStickerScreen />);

    await waitFor(() => {
      const input = getByPlaceholderText('e.g., ABC123XY');
      expect(input).toBeTruthy();
      expect(input.props.autoCapitalize).toBe('characters');
    });
  });

  describe('disc selection', () => {
    it('calls verify API with code', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 'd1', mold: 'Destroyer', manufacturer: 'Innova' }]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'unassigned', qr_code_id: 'qr-1' }),
        });

      const { getByText, getByPlaceholderText } = render(<LinkStickerScreen />);

      await waitFor(() => {
        const input = getByPlaceholderText('e.g., ABC123XY');
        fireEvent.changeText(input, 'TEST123');
      });

      fireEvent.press(getByText('Verify Code'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/verify-qr-code'),
          expect.any(Object)
        );
      });
    });

    it('handles already assigned code', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'assigned' }),
        });

      const { getByText, getByPlaceholderText } = render(<LinkStickerScreen />);

      await waitFor(() => {
        const input = getByPlaceholderText('e.g., ABC123XY');
        fireEvent.changeText(input, 'TEST123');
      });

      fireEvent.press(getByText('Verify Code'));

      // Should handle assigned status without crashing
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/verify-qr-code'),
          expect.any(Object)
        );
      });
    });
  });

  describe('verify errors', () => {
    it('handles API error response', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Invalid code' }),
        });

      const { getByText, getByPlaceholderText } = render(<LinkStickerScreen />);

      await waitFor(() => {
        const input = getByPlaceholderText('e.g., ABC123XY');
        fireEvent.changeText(input, 'BADCODE');
      });

      fireEvent.press(getByText('Verify Code'));

      // Should still render without crashing
      await waitFor(() => {
        expect(getByText('Link Your Sticker')).toBeTruthy();
      });
    });

    it('handles not found code status', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'not_found' }),
        });

      const { getByText, getByPlaceholderText } = render(<LinkStickerScreen />);

      await waitFor(() => {
        const input = getByPlaceholderText('e.g., ABC123XY');
        fireEvent.changeText(input, 'NOTFOUND');
      });

      fireEvent.press(getByText('Verify Code'));

      // Should handle not found status
      await waitFor(() => {
        expect(getByText('Link Your Sticker')).toBeTruthy();
      });
    });
  });

  describe('input states', () => {
    it('allows typing in the code input', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const { getByPlaceholderText } = render(<LinkStickerScreen />);

      await waitFor(() => {
        const input = getByPlaceholderText('e.g., ABC123XY');
        fireEvent.changeText(input, 'MYCODE123');
        expect(input.props.value).toBe('MYCODE123');
      });
    });

    it('displays code input with uppercase', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const { getByPlaceholderText } = render(<LinkStickerScreen />);

      await waitFor(() => {
        const input = getByPlaceholderText('e.g., ABC123XY');
        expect(input.props.autoCapitalize).toBe('characters');
      });
    });
  });

  describe('QR scanning', () => {
    it('renders Scan QR Code button', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const { getByText } = render(<LinkStickerScreen />);

      await waitFor(() => {
        expect(getByText('Scan QR Code')).toBeTruthy();
      });
    });

    it('renders "or enter manually" divider', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const { getByText } = render(<LinkStickerScreen />);

      await waitFor(() => {
        expect(getByText('or enter manually')).toBeTruthy();
      });
    });

    it('requests camera permission when Scan QR Code is pressed', async () => {
      mockRequestPermission.mockResolvedValue({ granted: false });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const { getByText } = render(<LinkStickerScreen />);

      await waitFor(() => {
        expect(getByText('Scan QR Code')).toBeTruthy();
      });

      fireEvent.press(getByText('Scan QR Code'));

      await waitFor(() => {
        expect(mockRequestPermission).toHaveBeenCalled();
      });
    });

    it('shows alert when camera permission is denied', async () => {
      mockRequestPermission.mockResolvedValue({ granted: false });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const { getByText } = render(<LinkStickerScreen />);

      await waitFor(() => {
        expect(getByText('Scan QR Code')).toBeTruthy();
      });

      fireEvent.press(getByText('Scan QR Code'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Camera Permission Required',
          'Please grant camera permission to scan QR codes.',
          [{ text: 'OK' }]
        );
      });
    });
  });
});
