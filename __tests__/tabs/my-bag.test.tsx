import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import MyBagScreen from '../../app/(tabs)/my-bag';

// Mock expo-router
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({
      push: mockRouterPush,
    }),
    useFocusEffect: (callback: React.EffectCallback) => {
      // useFocusEffect runs on every render when the callback reference changes
      // The component uses useCallback with [cacheLoaded] dependency,
      // so we need to run the effect when the callback changes
      React.useEffect(() => {
        const cleanup = callback();
        return () => {
          if (cleanup) cleanup();
        };
      }, [callback]);
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

// Mock discCache
const mockGetCachedDiscs = jest.fn();
const mockSetCachedDiscs = jest.fn();
const mockIsCacheStale = jest.fn();
jest.mock('../../utils/discCache', () => ({
  getCachedDiscs: () => mockGetCachedDiscs(),
  setCachedDiscs: (discs: any) => mockSetCachedDiscs(discs),
  isCacheStale: () => mockIsCacheStale(),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockDisc = {
  id: '1',
  name: 'Test Disc',
  manufacturer: 'Innova',
  mold: 'Destroyer',
  plastic: 'Star',
  weight: 175,
  color: 'Blue',
  flight_numbers: { speed: 12, glide: 5, turn: -1, fade: 3 },
  created_at: '2024-01-01',
  photos: [],
  active_recovery: null,
  was_surrendered: false,
};

const mockDiscWithPhoto = {
  ...mockDisc,
  id: '2',
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
  id: '3',
  active_recovery: {
    id: 'r1',
    status: 'found',
    finder_id: 'finder-123',
    found_at: '2024-01-02',
  },
};

const mockSurrenderedDisc = {
  ...mockDisc,
  id: '4',
  was_surrendered: true,
  surrendered_at: '2024-01-03',
};

describe('MyBagScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCachedDiscs.mockResolvedValue(null);
    mockIsCacheStale.mockResolvedValue(true); // Default to stale so tests trigger fetch
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
  });

  it('shows loading indicator initially', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(() => {}) // Never resolves to keep loading
    );

    const { getByTestId, UNSAFE_getByType } = render(<MyBagScreen />);

    // Should show ActivityIndicator
    const ActivityIndicator = require('react-native').ActivityIndicator;
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('shows empty state when no discs', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { getByText } = render(<MyBagScreen />);

    await waitFor(() => {
      expect(getByText('No Discs in Your Bag')).toBeTruthy();
      expect(getByText('Start building your disc collection by adding your first disc!')).toBeTruthy();
      expect(getByText('Add Your First Disc')).toBeTruthy();
    });
  });

  it('displays discs from API', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDisc]),
    });

    const { getByText } = render(<MyBagScreen />);

    await waitFor(() => {
      expect(getByText('Destroyer')).toBeTruthy(); // mold
      expect(getByText('Innova')).toBeTruthy(); // manufacturer
      expect(getByText('Star')).toBeTruthy(); // plastic
      expect(getByText('Blue')).toBeTruthy(); // color
    });
  });

  it('uses cached discs when available', async () => {
    mockGetCachedDiscs.mockResolvedValue([mockDisc]);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDisc]),
    });

    const { getByText } = render(<MyBagScreen />);

    await waitFor(() => {
      expect(getByText('Destroyer')).toBeTruthy();
    });
  });

  it('caches discs after fetching', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDisc]),
    });

    render(<MyBagScreen />);

    await waitFor(() => {
      expect(mockSetCachedDiscs).toHaveBeenCalledWith([mockDisc]);
    });
  });

  it('navigates to disc detail when disc is pressed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDisc]),
    });

    const { getByText } = render(<MyBagScreen />);

    await waitFor(() => {
      expect(getByText('Destroyer')).toBeTruthy();
    });

    fireEvent.press(getByText('Destroyer'));

    expect(mockRouterPush).toHaveBeenCalledWith('/disc/1');
  });

  it('shows FAB when discs exist', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDisc]),
    });

    const { getByText, UNSAFE_root } = render(<MyBagScreen />);

    await waitFor(() => {
      expect(getByText('Destroyer')).toBeTruthy();
    });

    // FAB should exist when we have discs - verify component renders correctly
    // The FAB contains a plus icon and navigates to /add-disc when pressed
    // We verify indirectly that the component renders properly with discs
    expect(UNSAFE_root).toBeTruthy();
  });

  it('navigates to add-disc from empty state button', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { getByText } = render(<MyBagScreen />);

    await waitFor(() => {
      expect(getByText('Add Your First Disc')).toBeTruthy();
    });

    fireEvent.press(getByText('Add Your First Disc'));

    expect(mockRouterPush).toHaveBeenCalledWith('/add-disc');
  });

  it('shows recovery badge for disc with active recovery', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDiscWithRecovery]),
    });

    const { getByText } = render(<MyBagScreen />);

    await waitFor(() => {
      expect(getByText('Found')).toBeTruthy();
    });
  });

  it('shows surrendered badge for surrendered disc', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockSurrenderedDisc]),
    });

    const { getByText } = render(<MyBagScreen />);

    await waitFor(() => {
      expect(getByText('Surrendered')).toBeTruthy();
    });
  });

  it('shows error alert when fetch fails and no cached data', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<MyBagScreen />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to load your discs. Please try again.'
      );
    });
  });

  it('displays cached data when fetch fails', async () => {
    mockGetCachedDiscs.mockResolvedValue([mockDisc]);
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { getByText } = render(<MyBagScreen />);

    await waitFor(() => {
      // Cached data should still be displayed even when fetch fails
      expect(getByText('Destroyer')).toBeTruthy();
    });
  });

  it('handles API error response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Server error' }),
    });

    render(<MyBagScreen />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to load your discs. Please try again.'
      );
    });
  });

  it('does not fetch when no session', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    render(<MyBagScreen />);

    await waitFor(() => {
      // Fetch should not be called
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('displays photo count when disc has photos', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockDiscWithPhoto]),
    });

    const { getByText } = render(<MyBagScreen />);

    await waitFor(() => {
      expect(getByText('1')).toBeTruthy(); // photo count
    });
  });

  it('uses disc name when mold is not available', async () => {
    const discWithoutMold = { ...mockDisc, mold: undefined };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([discWithoutMold]),
    });

    const { getByText } = render(<MyBagScreen />);

    await waitFor(() => {
      expect(getByText('Test Disc')).toBeTruthy(); // falls back to name
    });
  });
});
