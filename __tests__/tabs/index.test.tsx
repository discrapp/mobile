import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from '../../app/(tabs)/index';

// Mock useAuth
const mockUser = { email: 'test@example.com', id: 'user-123' };
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({ user: null })),
}));

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: jest.fn(),
}));

// Mock supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}));

// Mock disc cache
jest.mock('../../utils/discCache', () => ({
  getCachedDiscs: jest.fn(() => Promise.resolve(null)),
  CachedDisc: {},
}));

// Mock logger
jest.mock('../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const { useAuth } = require('../../contexts/AuthContext');
const { getCachedDiscs } = require('../../utils/discCache');

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCachedDiscs.mockResolvedValue(null);
  });

  it('renders welcome message', async () => {
    useAuth.mockReturnValue({ user: null });
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Welcome to Discr!')).toBeTruthy();
    });
    expect(getByText('Never lose your favorite disc again. Track your collection and help others find their lost discs.')).toBeTruthy();
  });

  it('displays user email when logged in', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Welcome to Discr!')).toBeTruthy();
    });
    expect(getByText('test@example.com')).toBeTruthy();
  });

  it('does not display email when not logged in', async () => {
    useAuth.mockReturnValue({ user: null });
    const { queryByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(queryByText('test@example.com')).toBeNull();
    });
  });

  it('shows order stickers card', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Protect Your Discs')).toBeTruthy();
    });
    expect(getByText(/Get QR code stickers/)).toBeTruthy();
  });

  it('navigates to order stickers when card is pressed', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Protect Your Discs')).toBeTruthy();
    });

    fireEvent.press(getByText('Protect Your Discs'));

    expect(mockPush).toHaveBeenCalledWith('/order-stickers');
  });

  it('shows Add Disc quick action', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Add Disc')).toBeTruthy();
    });
  });

  it('navigates to add-disc when pressed', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Add Disc')).toBeTruthy();
    });

    fireEvent.press(getByText('Add Disc'));

    expect(mockPush).toHaveBeenCalledWith('/select-entry-mode');
  });

  it('shows My Orders quick action', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('My Orders')).toBeTruthy();
    });
  });

  it('navigates to my-orders when pressed', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('My Orders')).toBeTruthy();
    });

    fireEvent.press(getByText('My Orders'));

    expect(mockPush).toHaveBeenCalledWith('/my-orders');
  });

  it('shows Found Disc quick action', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Found Disc')).toBeTruthy();
    });
  });

  it('navigates to found-disc when pressed', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Found Disc')).toBeTruthy();
    });

    fireEvent.press(getByText('Found Disc'));

    expect(mockPush).toHaveBeenCalledWith('/(tabs)/found-disc');
  });

  it('shows Link Sticker quick action', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Link Sticker')).toBeTruthy();
    });
  });

  it('navigates to link-sticker when pressed', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Link Sticker')).toBeTruthy();
    });

    fireEvent.press(getByText('Link Sticker'));

    expect(mockPush).toHaveBeenCalledWith('/link-sticker');
  });

  describe('with disc data', () => {
    const mockDiscs = [
      {
        id: '1',
        manufacturer: 'Innova',
        plastic: 'Star',
        color: 'Blue',
        category: 'Distance Driver',
        flight_numbers: { speed: 12, glide: 5, turn: -1, fade: 3 },
      },
      {
        id: '2',
        manufacturer: 'Innova',
        plastic: 'Champion',
        color: 'Red',
        category: 'Fairway Driver',
        flight_numbers: { speed: 7, glide: 5, turn: 0, fade: 2 },
      },
    ];

    it('displays bag stats when discs are cached', async () => {
      useAuth.mockReturnValue({ user: mockUser });
      getCachedDiscs.mockResolvedValue(mockDiscs);

      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('2')).toBeTruthy(); // Total discs
      });
      expect(getByText('Innova')).toBeTruthy(); // Top brand
    });

    it('shows empty state when no discs', async () => {
      useAuth.mockReturnValue({ user: mockUser });
      getCachedDiscs.mockResolvedValue([]);

      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('No Bag Insights Yet')).toBeTruthy();
      });
    });
  });
});
