import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import RecoveryDetailScreen from '../../app/recovery/[id]';

// Mock expo-router
const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockSetOptions = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush, replace: mockReplace, canGoBack: mockCanGoBack }),
  useLocalSearchParams: () => ({ id: 'recovery-123' }),
  useNavigation: () => ({ setOptions: mockSetOptions }),
}));

// Mock useColorScheme
jest.mock('../../components/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

// Mock Avatar component
jest.mock('../../components/Avatar', () => ({
  Avatar: () => 'Avatar',
}));

// Mock supabase
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn(),
};
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({
        data: { session: { access_token: 'test-token', user: { id: 'owner-1' } } },
      })),
    },
    channel: jest.fn(() => mockChannel),
    removeChannel: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('RecoveryDetailScreen', () => {
  const mockRecoveryData = {
    id: 'recovery-123',
    status: 'found',
    finder_message: 'Found your disc!',
    found_at: '2024-01-15T10:00:00Z',
    user_role: 'owner',
    disc: {
      id: 'disc-1',
      name: 'Destroyer',
      manufacturer: 'Innova',
      mold: 'Destroyer',
      plastic: 'Star',
      color: 'Blue',
      reward_amount: 10,
    },
    owner: {
      id: 'owner-1',
      display_name: 'Owner User',
      avatar_url: null,
    },
    finder: {
      id: 'finder-1',
      display_name: 'Finder User',
      avatar_url: null,
    },
    meetup_proposals: [],
    drop_off: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRecoveryData),
    });
  });

  it('shows loading state initially', () => {
    const { getByText } = render(<RecoveryDetailScreen />);
    expect(getByText('Loading recovery details...')).toBeTruthy();
  });

  it('renders recovery details', async () => {
    const { getByText } = render(<RecoveryDetailScreen />);

    await waitFor(() => {
      expect(getByText('Destroyer')).toBeTruthy();
    });
  });

  it('shows disc found status badge', async () => {
    const { getByText } = render(<RecoveryDetailScreen />);

    await waitFor(() => {
      expect(getByText('Disc Found')).toBeTruthy();
    });
  });

  it('shows disc manufacturer', async () => {
    const { getByText } = render(<RecoveryDetailScreen />);

    await waitFor(() => {
      expect(getByText('Innova')).toBeTruthy();
    });
  });

  it('shows disc plastic', async () => {
    const { getByText } = render(<RecoveryDetailScreen />);

    await waitFor(() => {
      expect(getByText('Star')).toBeTruthy();
    });
  });

  it('shows disc color badge', async () => {
    const { getByText } = render(<RecoveryDetailScreen />);

    await waitFor(() => {
      expect(getByText('Blue')).toBeTruthy();
    });
  });

  it('shows reward badge', async () => {
    const { getByText } = render(<RecoveryDetailScreen />);

    await waitFor(() => {
      expect(getByText('$10 Reward')).toBeTruthy();
    });
  });

  it('shows people section', async () => {
    const { getByText } = render(<RecoveryDetailScreen />);

    await waitFor(() => {
      expect(getByText('People')).toBeTruthy();
      expect(getByText('Owner')).toBeTruthy();
      expect(getByText('Finder')).toBeTruthy();
    });
  });

  it('shows finder message', async () => {
    const { getByText } = render(<RecoveryDetailScreen />);

    await waitFor(() => {
      expect(getByText("Finder's Message")).toBeTruthy();
      expect(getByText('Found your disc!')).toBeTruthy();
    });
  });

  it('shows propose meetup button for found status', async () => {
    const { getByText } = render(<RecoveryDetailScreen />);

    await waitFor(() => {
      expect(getByText('Propose a Meetup')).toBeTruthy();
    });
  });

  it('shows surrender button for owner', async () => {
    const { getByText } = render(<RecoveryDetailScreen />);

    await waitFor(() => {
      expect(getByText('Surrender Disc to Finder')).toBeTruthy();
    });
  });

  it('navigates to propose meetup on button press', async () => {
    const { getByText } = render(<RecoveryDetailScreen />);

    await waitFor(() => {
      expect(getByText('Propose a Meetup')).toBeTruthy();
    });

    fireEvent.press(getByText('Propose a Meetup'));

    expect(mockPush).toHaveBeenCalledWith('/propose-meetup/recovery-123');
  });

  it('shows error state when fetch fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Not found' }),
    });

    const { getByText } = render(<RecoveryDetailScreen />);

    await waitFor(() => {
      expect(getByText('Error')).toBeTruthy();
      expect(getByText('Not found')).toBeTruthy();
    });
  });

  it('shows go back button on error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Not found' }),
    });

    const { getByText } = render(<RecoveryDetailScreen />);

    await waitFor(() => {
      expect(getByText('Go Back')).toBeTruthy();
    });

    fireEvent.press(getByText('Go Back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows recovered status when disc is recovered', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ...mockRecoveryData,
        status: 'recovered',
        recovered_at: '2024-01-20T10:00:00Z',
      }),
    });

    const { getByText } = render(<RecoveryDetailScreen />);

    await waitFor(() => {
      expect(getByText('Disc Recovered!')).toBeTruthy();
    });
  });

  it('shows surrendered status for owner', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ...mockRecoveryData,
        status: 'surrendered',
        surrendered_at: '2024-01-20T10:00:00Z',
      }),
    });

    const { getByText } = render(<RecoveryDetailScreen />);

    await waitFor(() => {
      expect(getByText('Disc Surrendered')).toBeTruthy();
    });
  });

  it('shows pending meetup proposal section', async () => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        ...mockRecoveryData,
        status: 'meetup_proposed',
        meetup_proposals: [{
          id: 'prop-1',
          proposed_by: 'finder-1',
          location_name: 'Maple Hill DGC',
          proposed_datetime: '2024-01-25T14:00:00Z',
          status: 'pending',
          message: 'Meet at parking lot',
          created_at: '2024-01-20T10:00:00Z',
        }],
      }),
    });

    const { getByText } = render(<RecoveryDetailScreen />);

    await waitFor(() => {
      expect(getByText('Maple Hill DGC')).toBeTruthy();
    });
  });

  it('shows confirmed meetup section', async () => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        ...mockRecoveryData,
        status: 'meetup_confirmed',
        meetup_proposals: [{
          id: 'prop-1',
          proposed_by: 'finder-1',
          location_name: 'Central Park',
          proposed_datetime: '2024-01-25T14:00:00Z',
          status: 'accepted',
          created_at: '2024-01-20T10:00:00Z',
        }],
      }),
    });

    const { getByText } = render(<RecoveryDetailScreen />);

    await waitFor(() => {
      expect(getByText('Central Park')).toBeTruthy();
    });
  });

  it('shows dropped off section when disc is dropped off', async () => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        ...mockRecoveryData,
        status: 'dropped_off',
        drop_off: {
          id: 'drop-1',
          photo_url: 'https://example.com/photo.jpg',
          latitude: 42.123,
          longitude: -71.456,
          location_notes: 'Under the big oak tree',
          dropped_off_at: '2024-01-20T10:00:00Z',
          created_at: '2024-01-20T10:00:00Z',
        },
      }),
    });

    const { getByText } = render(<RecoveryDetailScreen />);

    await waitFor(() => {
      expect(getByText('Disc Dropped Off!')).toBeTruthy();
    });
  });

  it('shows meetup proposed status badge', async () => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        ...mockRecoveryData,
        status: 'meetup_proposed',
      }),
    });

    const { getByText } = render(<RecoveryDetailScreen />);

    await waitFor(() => {
      expect(getByText('Meetup Proposed')).toBeTruthy();
    });
  });

  it('shows meetup confirmed status badge', async () => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        ...mockRecoveryData,
        status: 'meetup_confirmed',
      }),
    });

    const { getByText } = render(<RecoveryDetailScreen />);

    await waitFor(() => {
      expect(getByText('Meetup Confirmed')).toBeTruthy();
    });
  });
});
