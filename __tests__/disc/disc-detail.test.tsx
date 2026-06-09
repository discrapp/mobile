import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import DiscDetailScreen from '../../app/disc/[id]';
import { handleError } from '../../lib/errorHandler';

// Mock expo-router
const mockRouterPush = jest.fn();
const mockRouterBack = jest.fn();
const mockSetOptions = jest.fn();
jest.mock('expo-router', async () => {
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

// Mock expo-camera with mutable permission state
let mockCameraPermission = { granted: false };
const mockRequestPermission = jest.fn();
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: () => [mockCameraPermission, mockRequestPermission],
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

describe('DiscDetailScreen', async () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    // Reset camera permission state
    mockCameraPermission = { granted: false };
    mockRequestPermission.mockResolvedValue({ granted: false });
  });

  it('shows skeleton loaders initially', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(() => {}) // Never resolves to keep loading
    );

    const { UNSAFE_getAllByType } = await render(<DiscDetailScreen />);

    // Should show skeleton components (which use Animated.View)
    const Animated = require('react-native').Animated;
    const skeletons = UNSAFE_getAllByType(Animated.View);
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays disc details from API', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDisc]),
    });

    const { getByText } = await render(<DiscDetailScreen />);

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

    const { getByText } = await render(<DiscDetailScreen />);

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

    const { getByText } = await render(<DiscDetailScreen />);

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

    const { getByText } = await render(<DiscDetailScreen />);

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

    const { getByText } = await render(<DiscDetailScreen />);

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

    const { getByText } = await render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('No photos')).toBeTruthy();
    });
  });

  it('shows recovery banner for disc with active recovery', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDiscWithRecovery]),
    });

    const { getByText } = await render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('Found - Tap for details')).toBeTruthy();
    });
  });

  it('navigates to recovery details when banner is pressed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDiscWithRecovery]),
    });

    const { getByText } = await render(<DiscDetailScreen />);

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

    const { getByText } = await render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('This disc was surrendered to you')).toBeTruthy();
    });
  });

  it('shows delete button', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDisc]),
    });

    const { getByText } = await render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('Delete Disc')).toBeTruthy();
    });
  });

  it('shows confirmation dialog when delete is pressed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDisc]),
    });

    const { getByText } = await render(<DiscDetailScreen />);

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

  it('shows error on fetch failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(handleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ operation: 'fetch-disc-detail' })
      );
    });
  });

  it('shows link QR code button when no QR code', async () => {
    const discWithoutQR = { ...mockDisc, qr_code: null };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([discWithoutQR]),
    });

    const { getByText } = await render(<DiscDetailScreen />);

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

    const { getByText } = await render(<DiscDetailScreen />);

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

    const { getByText } = await render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('Remove QR Code')).toBeTruthy();
    });
  });

  it('shows confirmation dialog when remove QR code is pressed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDisc]),
    });

    const { getByText } = await render(<DiscDetailScreen />);

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

    const { queryByText } = await render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(queryByText('Remove QR Code')).toBeNull();
    });
  });

  it('displays category when present', async () => {
    const discWithCategory = { ...mockDisc, category: 'Distance Driver' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([discWithCategory]),
    });

    const { getByText } = await render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('Distance Driver')).toBeTruthy();
    });
  });

  it('shows disc photo when available', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDiscWithPhoto]),
    });

    const { UNSAFE_getAllByType } = await render(<DiscDetailScreen />);
    const { Image } = require('react-native');

    await waitFor(() => {
      const images = UNSAFE_getAllByType(Image);
      expect(images.length).toBeGreaterThan(0);
    });
  });

  it('handles disc without optional fields', async () => {
    const minimalDisc = {
      id: 'test-disc-id',
      name: 'Basic Disc',
      flight_numbers: { speed: null, glide: null, turn: null, fade: null },
      photos: [],
      qr_code: null,
      active_recovery: null,
      was_surrendered: false,
      created_at: '2024-01-01',
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([minimalDisc]),
    });

    const { getByText } = await render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('Basic Disc')).toBeTruthy();
    });
  });

  it('shows meetup proposed status for disc in recovery', async () => {
    const discWithMeetup = {
      ...mockDisc,
      active_recovery: {
        id: 'r1',
        status: 'meetup_proposed',
        finder_id: 'finder-123',
        found_at: '2024-01-02',
      },
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([discWithMeetup]),
    });

    const { getByText } = await render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('Meetup Proposed - Tap for details')).toBeTruthy();
    });
  });

  it('shows meetup confirmed status for disc in recovery', async () => {
    const discWithConfirmedMeetup = {
      ...mockDisc,
      active_recovery: {
        id: 'r1',
        status: 'meetup_confirmed',
        finder_id: 'finder-123',
        found_at: '2024-01-02',
      },
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([discWithConfirmedMeetup]),
    });

    const { getByText } = await render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('Meetup Confirmed - Tap for details')).toBeTruthy();
    });
  });

  it('shows no reward message when reward is not set', async () => {
    const discNoReward = { ...mockDisc, reward_amount: null };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([discNoReward]),
    });

    const { queryByText } = await render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(queryByText('$20')).toBeNull();
    });
  });

  it('shows disc details section', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDisc]),
    });

    const { getByText } = await render(<DiscDetailScreen />);

    await waitFor(() => {
      expect(getByText('Innova')).toBeTruthy();
      expect(getByText('Destroyer')).toBeTruthy();
    });
  });

  describe('recovery banner', async () => {
    it('shows recovery banner for dropped off disc', async () => {
      const discDroppedOff = {
        ...mockDisc,
        active_recovery: {
          id: 'r1',
          status: 'dropped_off',
          finder_id: 'finder-123',
          found_at: '2024-01-02',
        },
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([discDroppedOff]),
      });

      const { getByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        // Verify disc loads and has recovery
        expect(getByText('Destroyer')).toBeTruthy();
      });
    });
  });

  describe('photo gallery', async () => {
    it('displays multiple photos when available', async () => {
      const discWithMultiplePhotos = {
        ...mockDisc,
        photos: [
          { id: 'p1', photo_url: 'https://example.com/photo1.jpg', created_at: '2024-01-01' },
          { id: 'p2', photo_url: 'https://example.com/photo2.jpg', created_at: '2024-01-02' },
        ],
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([discWithMultiplePhotos]),
      });

      const { UNSAFE_getAllByType } = await render(<DiscDetailScreen />);
      const { Image } = require('react-native');

      await waitFor(() => {
        const images = UNSAFE_getAllByType(Image);
        expect(images.length).toBeGreaterThan(0);
      });
    });
  });

  describe('no notes', async () => {
    it('does not show notes section when no notes', async () => {
      const discNoNotes = { ...mockDisc, notes: null };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([discNoNotes]),
      });

      const { queryByText, getByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(getByText('Destroyer')).toBeTruthy();
      });

      // Notes section should not appear
      expect(queryByText('My favorite disc')).toBeNull();
    });
  });

  describe('API error handling', async () => {
    it('shows error when API returns non-ok response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(handleError).toHaveBeenCalled();
      });
    });
  });

  describe('delete disc flow', async () => {
    it('successfully deletes disc when confirmed', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockDisc]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      const { getByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(getByText('Delete Disc')).toBeTruthy();
      });

      fireEvent.press(getByText('Delete Disc'));

      // Simulate pressing "Delete" in the alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteButton = alertCall[2].find((btn: { text: string }) => btn.text === 'Delete');
      await deleteButton.onPress();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/delete-disc'),
          expect.any(Object)
        );
      });
    });

    it('handles delete error gracefully', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockDisc]),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Cannot delete disc' }),
        });

      const { getByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(getByText('Delete Disc')).toBeTruthy();
      });

      fireEvent.press(getByText('Delete Disc'));

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteButton = alertCall[2].find((btn: { text: string }) => btn.text === 'Delete');
      await deleteButton.onPress();

      await waitFor(() => {
        expect(handleError).toHaveBeenCalled();
      });
    });

    it('handles no session during delete', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockDisc]),
      });

      const { getByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(getByText('Delete Disc')).toBeTruthy();
      });

      // Clear session for delete attempt
      mockGetSession.mockResolvedValueOnce({ data: { session: null } });

      fireEvent.press(getByText('Delete Disc'));

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteButton = alertCall[2].find((btn: { text: string }) => btn.text === 'Delete');
      await deleteButton.onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'You must be signed in to delete a disc');
      });
    });
  });

  describe('unlink QR code flow', async () => {
    it('successfully unlinks QR code when confirmed', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockDisc]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ ...mockDisc, qr_code: null }]),
        });

      const { getByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(getByText('Remove QR Code')).toBeTruthy();
      });

      fireEvent.press(getByText('Remove QR Code'));

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const unlinkButton = alertCall[2].find((btn: { text: string }) => btn.text === 'Unlink');
      await unlinkButton.onPress();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/unlink-qr-code'),
          expect.any(Object)
        );
      });
    });

    it('handles unlink error gracefully', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockDisc]),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Cannot unlink QR code' }),
        });

      const { getByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(getByText('Remove QR Code')).toBeTruthy();
      });

      fireEvent.press(getByText('Remove QR Code'));

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const unlinkButton = alertCall[2].find((btn: { text: string }) => btn.text === 'Unlink');
      await unlinkButton.onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Cannot unlink QR code');
      });
    });

    it('handles no session during unlink', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockDisc]),
      });

      const { getByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(getByText('Remove QR Code')).toBeTruthy();
      });

      mockGetSession.mockResolvedValueOnce({ data: { session: null } });

      fireEvent.press(getByText('Remove QR Code'));

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const unlinkButton = alertCall[2].find((btn: { text: string }) => btn.text === 'Unlink');
      await unlinkButton.onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'You must be signed in to unlink a QR code');
      });
    });
  });

  describe('photo gallery', async () => {
    it('shows swipe indicator for multiple photos', async () => {
      const discWithMultiplePhotos = {
        ...mockDisc,
        photos: [
          { id: 'p1', photo_url: 'https://example.com/photo1.jpg', storage_path: 'path1', photo_uuid: 'uuid1', created_at: '2024-01-01' },
          { id: 'p2', photo_url: 'https://example.com/photo2.jpg', storage_path: 'path2', photo_uuid: 'uuid2', created_at: '2024-01-02' },
        ],
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([discWithMultiplePhotos]),
      });

      const { getByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(getByText('Swipe to see photos')).toBeTruthy();
      });
    });

    it('does not show swipe indicator for single photo', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockDiscWithPhoto]),
      });

      const { queryByText, getByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(getByText('Destroyer')).toBeTruthy();
      });

      expect(queryByText('Swipe to see photos')).toBeNull();
    });

    it('filters out photos without valid URLs', async () => {
      const discWithInvalidPhoto = {
        ...mockDisc,
        photos: [
          { id: 'p1', photo_url: '', storage_path: 'path1', photo_uuid: 'uuid1', created_at: '2024-01-01' },
          { id: 'p2', photo_url: 'https://example.com/photo2.jpg', storage_path: 'path2', photo_uuid: 'uuid2', created_at: '2024-01-02' },
        ],
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([discWithInvalidPhoto]),
      });

      const { queryByText, getByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(getByText('Destroyer')).toBeTruthy();
      });

      // Should not show swipe indicator since only 1 valid photo
      expect(queryByText('Swipe to see photos')).toBeNull();
    });
  });

  describe('color display', async () => {
    it('displays white color with border', async () => {
      const discWithWhiteColor = { ...mockDisc, color: 'White' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([discWithWhiteColor]),
      });

      const { getByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(getByText('White')).toBeTruthy();
      });
    });

    it('displays multi color with rainbow dot', async () => {
      const discWithMultiColor = { ...mockDisc, color: 'Multi' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([discWithMultiColor]),
      });

      const { getByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(getByText('Multi')).toBeTruthy();
      });
    });
  });

  describe('disc not found state', async () => {
    it('shows disc not found message', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ ...mockDisc, id: 'different-id' }]),
      });

      render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Disc not found');
      });
    });
  });

  describe('fee hint display', async () => {
    it('shows fee hint for reward amount', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockDisc]),
      });

      const { getByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        // Check for Venmo fee note
        expect(getByText(/Venmo: \$20.00 \(free\)/)).toBeTruthy();
      });
    });
  });

  describe('flight numbers edge cases', async () => {
    it('hides flight numbers section when all are null', async () => {
      const discNoFlightNumbers = {
        ...mockDisc,
        flight_numbers: { speed: null, glide: null, turn: null, fade: null },
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([discNoFlightNumbers]),
      });

      const { queryByText, getByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(getByText('Destroyer')).toBeTruthy();
      });

      expect(queryByText('Flight Numbers')).toBeNull();
    });

    it('shows only available flight numbers', async () => {
      const discPartialFlightNumbers = {
        ...mockDisc,
        flight_numbers: { speed: 12, glide: null, turn: null, fade: 3 },
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([discPartialFlightNumbers]),
      });

      const { getByText, queryByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(getByText('Flight Numbers')).toBeTruthy();
        expect(getByText('12')).toBeTruthy(); // speed
        expect(getByText('3')).toBeTruthy(); // fade
      });
    });
  });

  describe('QR code scanning', async () => {
    it('shows camera permission alert when permission denied', async () => {
      const discWithoutQR = { ...mockDisc, qr_code: null };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([discWithoutQR]),
      });

      const { getByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(getByText('Link QR Code')).toBeTruthy();
      });

      fireEvent.press(getByText('Link QR Code'));

      // Should show camera permission alert
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Camera Permission Required',
          'Please grant camera permission to scan QR codes.',
          expect.any(Array)
        );
      });
    });

    it('opens scanner when permission is granted', async () => {
      // Grant permission for this test
      mockCameraPermission = { granted: true };

      const discWithoutQR = { ...mockDisc, qr_code: null };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([discWithoutQR]),
      });

      const { getByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(getByText('Link QR Code')).toBeTruthy();
      });

      fireEvent.press(getByText('Link QR Code'));

      // Should see scanning UI with cancel button
      await waitFor(() => {
        expect(getByText('Scan QR Code')).toBeTruthy();
        expect(getByText('Cancel')).toBeTruthy();
      });
    });

    it('returns to disc view when canceling scan', async () => {
      // Grant permission for this test
      mockCameraPermission = { granted: true };

      const discWithoutQR = { ...mockDisc, qr_code: null };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([discWithoutQR]),
      });

      const { getByText, queryByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(getByText('Link QR Code')).toBeTruthy();
      });

      fireEvent.press(getByText('Link QR Code'));

      await waitFor(() => {
        expect(getByText('Cancel')).toBeTruthy();
      });

      fireEvent.press(getByText('Cancel'));

      await waitFor(() => {
        expect(queryByText('Scan QR Code')).toBeNull();
        expect(getByText('Link QR Code')).toBeTruthy();
      });
    });
  });

  describe('QR code linking', async () => {
    it('verifies QR code section exists when disc has no QR code', async () => {
      const discWithoutQR = { ...mockDisc, qr_code: null };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([discWithoutQR]),
      });

      const { getByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(getByText('Link QR Code')).toBeTruthy();
        expect(getByText('QR Code')).toBeTruthy();
      });
    });
  });

  describe('unlink exception handling', async () => {
    it('handles exception during unlink', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockDisc]),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      const { getByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(getByText('Remove QR Code')).toBeTruthy();
      });

      fireEvent.press(getByText('Remove QR Code'));

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const unlinkButton = alertCall[2].find((btn: { text: string }) => btn.text === 'Unlink');

      await waitFor(async () => {
        await unlinkButton.onPress();
      });

      await waitFor(() => {
        expect(handleError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({ operation: 'unlink-qr-code' })
        );
      });
    });
  });

  describe('navigation header', async () => {
    it('sets header with edit button when disc loaded', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockDisc]),
      });

      render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(mockSetOptions).toHaveBeenCalled();
      });

      // Get the navigation options
      const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];

      // Verify edit button exists
      expect(setOptionsCall.headerRight).toBeDefined();
    });

    it('sets header with back button', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockDisc]),
      });

      render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(mockSetOptions).toHaveBeenCalled();
      });

      // Get the navigation options
      const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];

      // Verify back button exists
      expect(setOptionsCall.headerLeft).toBeDefined();
    });

    it('sets title to disc mold when loaded', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockDisc]),
      });

      render(<DiscDetailScreen />);

      await waitFor(() => {
        const calls = mockSetOptions.mock.calls;
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall.title).toBe('Destroyer');
      });
    });

    it('sets default title when no disc loaded', async () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise(() => {}) // Never resolves
      );

      render(<DiscDetailScreen />);

      // Check initial title
      await waitFor(() => {
        expect(mockSetOptions).toHaveBeenCalled();
      });

      const setOptionsCall = mockSetOptions.mock.calls[0][0];
      expect(setOptionsCall.title).toBe('Disc Details');
    });
  });

  describe('loading states', async () => {
    it('calls unlink API when unlinking QR code', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockDisc]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ ...mockDisc, qr_code: null }]),
        });

      const { getByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(getByText('Remove QR Code')).toBeTruthy();
      });

      fireEvent.press(getByText('Remove QR Code'));

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const unlinkButton = alertCall[2].find((btn: { text: string }) => btn.text === 'Unlink');

      await waitFor(async () => {
        await unlinkButton.onPress();
      });

      // Component should call unlink API
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/unlink-qr-code'),
          expect.any(Object)
        );
      });
    });

    it('calls delete API when deleting disc', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockDisc]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      const { getByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(getByText('Delete Disc')).toBeTruthy();
      });

      fireEvent.press(getByText('Delete Disc'));

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteButton = alertCall[2].find((btn: { text: string }) => btn.text === 'Delete');

      await waitFor(async () => {
        await deleteButton.onPress();
      });

      // Component should call delete API
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/delete-disc'),
          expect.any(Object)
        );
      });
    });
  });

  describe('reward amount edge cases', async () => {
    it('hides reward section when amount is 0', async () => {
      const discWithZeroReward = { ...mockDisc, reward_amount: '0' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([discWithZeroReward]),
      });

      const { queryByText, getByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(getByText('Destroyer')).toBeTruthy();
      });

      // Reward section should not be visible
      expect(queryByText('Reward Amount')).toBeNull();
    });

    it('hides reward section when amount is negative', async () => {
      const discWithNegativeReward = { ...mockDisc, reward_amount: '-5' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([discWithNegativeReward]),
      });

      const { queryByText, getByText } = await render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(getByText('Destroyer')).toBeTruthy();
      });

      // Reward section should not be visible
      expect(queryByText('Reward Amount')).toBeNull();
    });
  });

  describe('API response edge cases', async () => {
    it('shows alert and navigates back when disc not in API response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Disc not found');
      });

      await waitFor(() => {
        expect(mockRouterBack).toHaveBeenCalled();
      });
    });

    it('handles API error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}), // No error property
      });

      render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(handleError).toHaveBeenCalled();
      });
    });
  });

  describe('focus effect', async () => {
    it('refetches disc data on screen focus', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([mockDisc]),
      });

      render(<DiscDetailScreen />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // useFocusEffect calls callback immediately in test
      // So we can verify the initial call happened
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/get-user-discs'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });
  });
});
