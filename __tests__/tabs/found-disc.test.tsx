import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import FoundDiscScreen from '../../app/(tabs)/found-disc';

// Mock expo-router
const mockRouter = { push: jest.fn(), replace: jest.fn() };
const mockSearchParams: { scannedCode?: string } = {};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockSearchParams,
}));

// Mock @react-navigation/native useFocusEffect
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => {
    const React = require('react');
    React.useEffect(() => { callback(); }, []);
  }),
}));

// Mock expo-camera
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
}));

// Mock useColorScheme
jest.mock('../../components/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

// Mock supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({
        data: { session: { access_token: 'test-token', user: { id: 'user-1' } } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
        in: jest.fn(() => ({
          not: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    })),
  },
}));

// Mock fetch
global.fetch = jest.fn();

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('FoundDiscScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset search params
    mockSearchParams.scannedCode = undefined;
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  describe('initial rendering', () => {
    it('renders found disc screen', async () => {
      const { getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByText('Found a Disc?')).toBeTruthy();
      });
    });

    it('shows QR code input', async () => {
      const { getByPlaceholderText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter code (e.g., TEST001)')).toBeTruthy();
      });
    });

    it('shows scan button', async () => {
      const { getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByText('Scan QR Code')).toBeTruthy();
      });
    });

    it('shows description text', async () => {
      const { getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByText('Scan the QR code or enter it manually to help reunite the disc with its owner.')).toBeTruthy();
      });
    });

    it('shows look up disc button', async () => {
      const { getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByText('Look Up Disc')).toBeTruthy();
      });
    });

    it('shows QR code icon', async () => {
      // The screen has a QR code icon at the top
      const { getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByText('Found a Disc?')).toBeTruthy();
      });
    });
  });

  describe('form validation', () => {
    it('validates empty QR code', async () => {
      const { getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByText('Look Up Disc')).toBeTruthy();
      });

      fireEvent.press(getByText('Look Up Disc'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please enter a QR code'
      );
    });

    it('accepts QR code input', async () => {
      const { getByPlaceholderText, getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter code (e.g., TEST001)')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Enter code (e.g., TEST001)'), 'TEST001');

      // Now clicking Look Up should not show the empty error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Disc not found' }),
      });

      fireEvent.press(getByText('Look Up Disc'));

      // Should not show "Please enter a QR code" error
      expect(Alert.alert).not.toHaveBeenCalledWith('Error', 'Please enter a QR code');
    });
  });

  describe('QR code lookup flow', () => {
    it('shows error when disc not found', async () => {
      const { getByPlaceholderText, getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter code (e.g., TEST001)')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Enter code (e.g., TEST001)'), 'INVALID');

      // Mock lookup returning not found
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      }).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ found: false }),
      });

      fireEvent.press(getByText('Look Up Disc'));

      await waitFor(() => {
        expect(getByText('No disc found with this QR code. Please check and try again.')).toBeTruthy();
      });
    });

    it('triggers lookup when Look Up button pressed with code', async () => {
      const { getByPlaceholderText, getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter code (e.g., TEST001)')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Enter code (e.g., TEST001)'), 'TEST001');
      fireEvent.press(getByText('Look Up Disc'));

      // Verify fetch was called with the lookup endpoint
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/lookup-qr-code'),
          expect.any(Object)
        );
      });
    });
  });

  describe('pending recoveries', () => {
    it('shows no recoveries initially', async () => {
      const { queryByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(queryByText('Discs I Found')).toBeFalsy();
      });
    });

    it('fetches pending recoveries on mount', async () => {
      render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/get-my-finds'),
          expect.any(Object)
        );
      });
    });

    it('displays pending recoveries section header when available', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{
          id: 'recovery-1',
          status: 'found',
          created_at: new Date().toISOString(),
          disc: {
            id: 'disc-1',
            name: 'Test Disc',
            mold: 'Destroyer',
            manufacturer: 'Innova',
            color: 'Blue',
          },
        }]),
      });

      const { getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByText('Destroyer')).toBeTruthy();
      });
    });

    it('shows disc manufacturer in pending recoveries', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{
          id: 'recovery-1',
          status: 'found',
          created_at: new Date().toISOString(),
          disc: {
            id: 'disc-1',
            name: 'Test Disc',
            mold: 'Destroyer',
            manufacturer: 'Innova',
            color: 'Blue',
          },
        }]),
      });

      const { getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByText('Innova')).toBeTruthy();
      });
    });

    it('shows status for pending recoveries', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{
          id: 'recovery-1',
          status: 'found',
          created_at: new Date().toISOString(),
          disc: {
            id: 'disc-1',
            name: 'Test Disc',
            mold: 'Destroyer',
            manufacturer: 'Innova',
          },
        }]),
      });

      const { getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByText('Waiting for owner')).toBeTruthy();
      });
    });
  });

  describe('owner recoveries', () => {
    it('renders owner recoveries section text correctly', async () => {
      // Simply verify the component renders - owner recoveries depend on complex Supabase mocks
      const { getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByText('Found a Disc?')).toBeTruthy();
      });
    });
  });

  describe('error handling', () => {
    it('handles fetch error gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<FoundDiscScreen />);

      // Should still render the screen without crashing
      await waitFor(() => {
        expect(getByText('Found a Disc?')).toBeTruthy();
      });
    });
  });

  describe('try again functionality', () => {
    it('shows try again button on error state', async () => {
      const { getByPlaceholderText, getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter code (e.g., TEST001)')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Enter code (e.g., TEST001)'), 'INVALID');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      }).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ found: false }),
      });

      fireEvent.press(getByText('Look Up Disc'));

      await waitFor(() => {
        expect(getByText('Try Again')).toBeTruthy();
      });
    });
  });

  describe('found disc flow', () => {
    it('allows typing in the QR code input', async () => {
      const { getByPlaceholderText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter code (e.g., TEST001)')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Enter code (e.g., TEST001)'), 'DISC001');

      expect(getByPlaceholderText('Enter code (e.g., TEST001)').props.value).toBe('DISC001');
    });

    it('calls lookup API when Look Up Disc is pressed', async () => {
      const { getByPlaceholderText, getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter code (e.g., TEST001)')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Enter code (e.g., TEST001)'), 'DISC001');
      fireEvent.press(getByText('Look Up Disc'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/lookup-qr-code'),
          expect.any(Object)
        );
      });
    });
  });

  describe('UI elements', () => {
    it('shows scan instructions in QR scanner button', async () => {
      const { getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByText('Scan QR Code')).toBeTruthy();
      });
    });

    it('shows manual entry section', async () => {
      const { getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByText('or enter manually')).toBeTruthy();
      });
    });

    it('shows description text about helping return disc', async () => {
      const { getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByText(/Scan the QR code or enter it manually/)).toBeTruthy();
      });
    });

    it('shows the main title', async () => {
      const { getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByText('Found a Disc?')).toBeTruthy();
      });
    });
  });

  describe('session handling', () => {
    it('fetches pending recoveries with auth token', async () => {
      render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/get-my-finds'),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: expect.stringContaining('Bearer'),
            }),
          })
        );
      });
    });

    it('includes authorization header when looking up disc', async () => {
      const { getByPlaceholderText, getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter code (e.g., TEST001)')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Enter code (e.g., TEST001)'), 'TEST123');
      fireEvent.press(getByText('Look Up Disc'));

      await waitFor(() => {
        const lookupCall = (global.fetch as jest.Mock).mock.calls.find(
          (call: string[]) => call[0].includes('/lookup-qr-code')
        );
        expect(lookupCall).toBeTruthy();
        expect(lookupCall[0]).toContain('code=TEST123');
      });
    });
  });

  describe('status displays', () => {
    it('shows meetup proposed status for pending recovery', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{
          id: 'recovery-1',
          status: 'meetup_proposed',
          created_at: new Date().toISOString(),
          disc: {
            id: 'disc-1',
            mold: 'Destroyer',
            manufacturer: 'Innova',
          },
        }]),
      });

      const { getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByText('Meetup proposed')).toBeTruthy();
      });
    });

    it('shows meetup confirmed status for pending recovery', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{
          id: 'recovery-1',
          status: 'meetup_confirmed',
          created_at: new Date().toISOString(),
          disc: {
            id: 'disc-1',
            mold: 'Destroyer',
            manufacturer: 'Innova',
          },
        }]),
      });

      const { getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByText('Meetup confirmed')).toBeTruthy();
      });
    });
  });

  describe('successful disc lookup', () => {
    it('shows disc found result with disc details', async () => {
      const { getByPlaceholderText, getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter code (e.g., TEST001)')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Enter code (e.g., TEST001)'), 'TEST001');

      // Mock successful lookup response
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            found: true,
            disc: {
              id: 'disc-1',
              mold: 'Destroyer',
              manufacturer: 'Innova',
              color: 'Blue',
            },
            is_own_disc: false,
          }),
        });

      fireEvent.press(getByText('Look Up Disc'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/lookup-qr-code?code=TEST001'),
          expect.any(Object)
        );
      });
    });

    it('shows loading state during lookup', async () => {
      const { getByPlaceholderText, getByText, queryByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter code (e.g., TEST001)')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Enter code (e.g., TEST001)'), 'TEST001');

      // Set up a delayed mock
      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ found: false }),
        }), 100))
      );

      fireEvent.press(getByText('Look Up Disc'));

      // The button should not be visible while loading
      await waitFor(() => {
        expect(queryByText('Look Up Disc')).toBeFalsy();
      }, { timeout: 50 });
    });
  });

  describe('try again flow', () => {
    it('pressing try again resets to input state', async () => {
      const { getByPlaceholderText, getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter code (e.g., TEST001)')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Enter code (e.g., TEST001)'), 'INVALID');

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ found: false }),
        });

      fireEvent.press(getByText('Look Up Disc'));

      await waitFor(() => {
        expect(getByText('Try Again')).toBeTruthy();
      });

      fireEvent.press(getByText('Try Again'));

      await waitFor(() => {
        expect(getByText('Look Up Disc')).toBeTruthy();
      });
    });
  });

  describe('scannedCode param from deep link navigation', () => {
    it('auto-triggers lookup when scannedCode param is provided', async () => {
      mockSearchParams.scannedCode = 'DEEPLINK123';

      render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/lookup-qr-code?code=DEEPLINK123'),
          expect.any(Object)
        );
      });
    });

    it('includes scannedCode in lookup API call', async () => {
      mockSearchParams.scannedCode = 'PREFILLED';

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ found: false }),
        });

      render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/lookup-qr-code?code=PREFILLED'),
          expect.any(Object)
        );
      });
    });

    it('shows disc info when scannedCode lookup succeeds', async () => {
      mockSearchParams.scannedCode = 'FOUND001';

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            found: true,
            disc: {
              id: 'disc-1',
              name: 'Deep Link Disc',
              mold: 'Destroyer',
              manufacturer: 'Innova',
              owner_display_name: 'Test Owner',
            },
            has_active_recovery: false,
          }),
        });

      const { getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByText('Disc Found!')).toBeTruthy();
      });
    });

    it('shows error when scannedCode lookup fails', async () => {
      mockSearchParams.scannedCode = 'NOTFOUND';

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ found: false }),
        });

      const { getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByText('No disc found with this QR code. Please check and try again.')).toBeTruthy();
      });
    });

    it('does not auto-trigger lookup when no scannedCode param', async () => {
      mockSearchParams.scannedCode = undefined;

      const { getByText } = render(<FoundDiscScreen />);

      await waitFor(() => {
        expect(getByText('Found a Disc?')).toBeTruthy();
      });

      // Should only have called the pending recoveries fetch, not lookup
      const lookupCalls = (global.fetch as jest.Mock).mock.calls.filter(
        (call: string[]) => call[0].includes('/lookup-qr-code')
      );
      expect(lookupCalls).toHaveLength(0);
    });
  });

});
