import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import DiscDetailScreen from '../../app/disc/[id]';

// Mock expo-router
const mockRouterPush = jest.fn();
const mockRouterBack = jest.fn();
const mockSetOptions = jest.fn();
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({
      push: mockRouterPush,
      back: mockRouterBack,
    }),
    useLocalSearchParams: () => ({
      id: 'test-disc-id',
    }),
    useNavigation: () => ({
      setOptions: mockSetOptions,
    }),
    useFocusEffect: (callback: () => void) => {
      React.useEffect(() => {
        callback();
      }, []);
    },
  };
});

// Mock supabase
const mockGetSession = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

// Mock QRCode component
jest.mock('react-native-qrcode-svg', () => 'QRCode');

// Mock expo-camera
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: () => [{ granted: false }, jest.fn()],
}));

// Mock useColorScheme
jest.mock('../../components/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

// Mock fetch
global.fetch = jest.fn();

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockDisc = {
  id: 'test-disc-id',
  name: 'Test Disc',
  manufacturer: 'Innova',
  mold: 'Destroyer',
  plastic: 'Star',
  weight: 175,
  color: 'Blue',
  flight_numbers: { speed: 12, glide: 5, turn: -1, fade: 3 },
  reward_amount: '20',
  notes: 'My favorite disc',
  created_at: '2024-01-01',
  photos: [],
  qr_code: {
    id: 'qr1',
    short_code: 'ABC123',
    status: 'active',
  },
  active_recovery: null,
  was_surrendered: false,
};

const mockDiscWithPhoto = {
  ...mockDisc,
  photos: [{
    id: 'p1',
    storage_path: 'path/to/photo',
    photo_uuid: 'uuid-123',
    photo_url: 'https://example.com/photo.jpg',
    created_at: '2024-01-01',
  }],
};

const mockDiscWithRecovery = {
  ...mockDisc,
  active_recovery: {
    id: 'r1',
    status: 'found',
    finder_id: 'finder-123',
    found_at: '2024-01-02',
  },
};

const mockSurrenderedDisc = {
  ...mockDisc,
  was_surrendered: true,
  surrendered_at: '2024-01-03',
};

describe('DiscDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
  });

  it('shows loading indicator initially', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(() => {}) // Never resolves to keep loading
    );

    const { UNSAFE_getByType } = render(<DiscDetailScreen />);

    const ActivityIndicator = require('react-native').ActivityIndicator;
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('displays disc details from API', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDisc]),
    });

    const { getByText } = render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('Destroyer')).toBeTruthy();
      expect(getByText('Innova')).toBeTruthy();
      expect(getByText('Star')).toBeTruthy();
      expect(getByText('175g')).toBeTruthy();
      expect(getByText('Blue')).toBeTruthy();
    });
  });

  it('displays flight numbers', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDisc]),
    });

    const { getByText } = render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('Flight Numbers')).toBeTruthy();
      expect(getByText('12')).toBeTruthy(); // speed
      expect(getByText('5')).toBeTruthy(); // glide
      expect(getByText('-1')).toBeTruthy(); // turn
      expect(getByText('3')).toBeTruthy(); // fade
    });
  });

  it('displays reward amount', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDisc]),
    });

    const { getByText } = render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('Reward Amount')).toBeTruthy();
      expect(getByText('$20')).toBeTruthy();
    });
  });

  it('displays notes', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDisc]),
    });

    const { getByText } = render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('Notes')).toBeTruthy();
      expect(getByText('My favorite disc')).toBeTruthy();
    });
  });

  it('displays QR code section', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDisc]),
    });

    const { getByText } = render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('QR Code')).toBeTruthy();
      expect(getByText('ABC123')).toBeTruthy();
      expect(getByText('Scan with phone camera to find this disc')).toBeTruthy();
    });
  });

  it('shows no photos placeholder when no photos', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDisc]),
    });

    const { getByText } = render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('No photos')).toBeTruthy();
    });
  });

  it('shows recovery banner for disc with active recovery', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDiscWithRecovery]),
    });

    const { getByText } = render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('Found - Tap for details')).toBeTruthy();
    });
  });

  it('navigates to recovery details when banner is pressed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDiscWithRecovery]),
    });

    const { getByText } = render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('Found - Tap for details')).toBeTruthy();
    });

    fireEvent.press(getByText('Found - Tap for details'));

    expect(mockRouterPush).toHaveBeenCalledWith('/recovery/r1');
  });

  it('shows surrendered banner for surrendered disc', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockSurrenderedDisc]),
    });

    const { getByText } = render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('This disc was surrendered to you')).toBeTruthy();
    });
  });

  it('shows delete button', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDisc]),
    });

    const { getByText } = render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('Delete Disc')).toBeTruthy();
    });
  });

  it('shows confirmation dialog when delete is pressed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDisc]),
    });

    const { getByText } = render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('Delete Disc')).toBeTruthy();
    });

    fireEvent.press(getByText('Delete Disc'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete Disc',
      'Are you sure you want to delete Destroyer? This action cannot be undone.',
      expect.any(Array)
    );
  });

  it('shows error when disc not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]), // No discs returned
    });

    render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Disc not found');
    });

    expect(mockRouterBack).toHaveBeenCalled();
  });

  it('shows error alert on fetch failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to load disc details. Please try again.'
      );
    });
  });

  it('shows link QR code button when no QR code', async () => {
    const discWithoutQR = { ...mockDisc, qr_code: null };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([discWithoutQR]),
    });

    const { getByText } = render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('Link QR Code')).toBeTruthy();
      expect(getByText('Scan a QR sticker to attach to this disc')).toBeTruthy();
    });
  });

  it('does not fetch when no session', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('uses disc name when mold is not available', async () => {
    const discWithoutMold = { ...mockDisc, mold: undefined };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([discWithoutMold]),
    });

    const { getByText } = render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('Test Disc')).toBeTruthy();
    });
  });

  it('sets navigation options with disc info', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDisc]),
    });

    render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(mockSetOptions).toHaveBeenCalled();
    });
  });

  it('shows remove QR code button when disc has QR code', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDisc]),
    });

    const { getByText } = render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('Remove QR Code')).toBeTruthy();
    });
  });

  it('shows confirmation dialog when remove QR code is pressed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDisc]),
    });

    const { getByText } = render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('Remove QR Code')).toBeTruthy();
    });

    fireEvent.press(getByText('Remove QR Code'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Unlink QR Code',
      'Are you sure you want to remove the QR code from this disc? The QR code will be deleted and cannot be recovered.',
      expect.any(Array)
    );
  });

  it('does not show remove QR code button when disc has no QR code', async () => {
    const discWithoutQR = { ...mockDisc, qr_code: null };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([discWithoutQR]),
    });

    const { queryByText } = render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(queryByText('Remove QR Code')).toBeNull();
    });
  });
});
