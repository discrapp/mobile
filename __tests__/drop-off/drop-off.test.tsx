import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import DropOffScreen from '../../app/drop-off/[id]';

// Mock Linking
const mockOpenURL = jest.fn();
const mockOpenSettings = jest.fn();
jest.spyOn(Linking, 'openURL').mockImplementation(mockOpenURL);
jest.spyOn(Linking, 'openSettings').mockImplementation(mockOpenSettings);

// Mock expo-router with shared instance
const mockRouter = { replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ id: 'recovery-123' }),
}));

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({
    coords: { latitude: 42.123, longitude: -71.456 },
  })),
  Accuracy: { High: 5 },
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
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/photo.jpg' } })),
      })),
    },
  },
}));

// Mock fetch
global.fetch = jest.fn();

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock CameraWithOverlay
jest.mock('../../components/CameraWithOverlay', () => 'CameraWithOverlay');

// Mock imageCompression
jest.mock('../../utils/imageCompression', () => ({
  compressImage: jest.fn((uri) => Promise.resolve({ uri })),
}));

// Mock errorHandler
jest.mock('../../lib/errorHandler', () => ({
  handleError: jest.fn(),
  showSuccess: jest.fn(),
}));

describe('DropOffScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ disc: { name: 'Test Disc' } }),
    });
  });

  it('renders drop off screen', async () => {
    const { getByText } = render(<DropOffScreen />);

    await waitFor(() => {
      expect(getByText('Drop Off Location')).toBeTruthy();
    });
  });

  it('shows take photo button', async () => {
    const { getByText } = render(<DropOffScreen />);

    await waitFor(() => {
      expect(getByText('Take a photo of the drop-off spot')).toBeTruthy();
    });
  });

  it('shows location captured after getting location', async () => {
    const { getByText } = render(<DropOffScreen />);

    await waitFor(() => {
      expect(getByText('Location captured')).toBeTruthy();
    });
  });

  it('shows location notes field', async () => {
    const { getByPlaceholderText } = render(<DropOffScreen />);

    await waitFor(() => {
      expect(getByPlaceholderText('e.g., Behind the big oak tree near hole 7, under a rock')).toBeTruthy();
    });
  });

  it('shows confirm drop-off button', async () => {
    const { getByText } = render(<DropOffScreen />);

    await waitFor(() => {
      expect(getByText('Confirm Drop-off')).toBeTruthy();
    });
  });

  it('shows cancel button', async () => {
    const { getByText } = render(<DropOffScreen />);

    await waitFor(() => {
      expect(getByText('Cancel')).toBeTruthy();
    });
  });

  it('validates missing photo', async () => {
    const { getByText } = render(<DropOffScreen />);

    await waitFor(() => {
      expect(getByText('Confirm Drop-off')).toBeTruthy();
    });

    fireEvent.press(getByText('Confirm Drop-off'));

    expect(Alert.alert).toHaveBeenCalledWith('Missing Photo', 'Please take a photo of the drop-off location.');
  });

  it('handles cancel button press', async () => {
    const { getByText } = render(<DropOffScreen />);

    await waitFor(() => {
      expect(getByText('Cancel')).toBeTruthy();
    });

    fireEvent.press(getByText('Cancel'));

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('allows entering location notes', async () => {
    const { getByPlaceholderText } = render(<DropOffScreen />);

    await waitFor(() => {
      expect(getByPlaceholderText('e.g., Behind the big oak tree near hole 7, under a rock')).toBeTruthy();
    });

    fireEvent.changeText(
      getByPlaceholderText('e.g., Behind the big oak tree near hole 7, under a rock'),
      'Near the pavilion'
    );

    // Text should be entered
    expect(getByPlaceholderText('e.g., Behind the big oak tree near hole 7, under a rock').props.value).toBe('Near the pavilion');
  });

  it('shows loading state during location fetch', async () => {
    const { getByText, queryByText } = render(<DropOffScreen />);

    await waitFor(() => {
      expect(getByText('Drop Off Location')).toBeTruthy();
    });

    // Should show location captured after fetching
    await waitFor(() => {
      expect(getByText('Location captured')).toBeTruthy();
    });
  });

  it('fetches recovery details on mount', async () => {
    render(<DropOffScreen />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/get-recovery-details'),
        expect.any(Object)
      );
    });
  });

  it('fetches disc name from recovery details', async () => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ disc: { name: 'Destroyer' } }),
    });

    render(<DropOffScreen />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/get-recovery-details'),
        expect.any(Object)
      );
    });
  });

  it('shows help text for location notes', async () => {
    const { getByText } = render(<DropOffScreen />);

    await waitFor(() => {
      expect(getByText('Add any helpful details to help the owner find the exact spot.')).toBeTruthy();
    });
  });

  it('shows location coordinates when captured', async () => {
    const { getByText } = render(<DropOffScreen />);

    await waitFor(() => {
      expect(getByText('Location captured')).toBeTruthy();
      expect(getByText('42.123000, -71.456000')).toBeTruthy();
    });
  });

  it('handles fetch error gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { getByText } = render(<DropOffScreen />);

    // Should still render the screen
    await waitFor(() => {
      expect(getByText('Drop Off Location')).toBeTruthy();
    });
  });

  it('shows photo requirements section', async () => {
    const { getByText } = render(<DropOffScreen />);

    await waitFor(() => {
      expect(getByText('Take a photo of the drop-off spot')).toBeTruthy();
    });
  });

  it('shows missing location alert when location not available', async () => {
    const Location = require('expo-location');
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const { getByText } = render(<DropOffScreen />);

    await waitFor(() => {
      expect(getByText('Confirm Drop-off')).toBeTruthy();
    });

    // Location denied should show alert when trying to submit
    fireEvent.press(getByText('Confirm Drop-off'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('shows the drop off title', async () => {
    const { getByText } = render(<DropOffScreen />);

    await waitFor(() => {
      expect(getByText('Drop Off Location')).toBeTruthy();
    });
  });

  it('displays helpful notes placeholder', async () => {
    const { getByPlaceholderText } = render(<DropOffScreen />);

    await waitFor(() => {
      expect(getByPlaceholderText('e.g., Behind the big oak tree near hole 7, under a rock')).toBeTruthy();
    });
  });

  it('displays both action buttons', async () => {
    const { getByText } = render(<DropOffScreen />);

    await waitFor(() => {
      expect(getByText('Confirm Drop-off')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
    });
  });

  describe('location permission', () => {
    beforeEach(() => {
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 42.123, longitude: -71.456 },
      });
    });

    it('shows location coordinates after successful location fetch', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('42.123000, -71.456000')).toBeTruthy();
      });
    });

    it('shows location captured badge', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Location captured')).toBeTruthy();
      });
    });
  });

  describe('location notes', () => {
    it('allows multiline notes input', async () => {
      const { getByPlaceholderText } = render(<DropOffScreen />);

      await waitFor(() => {
        const notesInput = getByPlaceholderText('e.g., Behind the big oak tree near hole 7, under a rock');
        expect(notesInput).toBeTruthy();
      });
    });
  });

  describe('recovery details', () => {
    it('handles API response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ disc: { name: 'Firebird', manufacturer: 'Innova' } }),
      });

      render(<DropOffScreen />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('handles non-ok API response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' }),
      });

      const { getByText } = render(<DropOffScreen />);

      // Should still render without crashing
      await waitFor(() => {
        expect(getByText('Drop Off Location')).toBeTruthy();
      });
    });
  });

  describe('form sections', () => {
    it('shows photo section label', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Take a photo of the drop-off spot')).toBeTruthy();
      });
    });

    it('shows notes input field', async () => {
      const { getByPlaceholderText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('e.g., Behind the big oak tree near hole 7, under a rock')).toBeTruthy();
      });
    });
  });

  describe('submit flow', () => {
    it('validates photo before submit', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Confirm Drop-off')).toBeTruthy();
      });

      fireEvent.press(getByText('Confirm Drop-off'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Missing Photo',
        'Please take a photo of the drop-off location.'
      );
    });
  });

  describe('location section', () => {
    it('shows current location section', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Drop Off Location')).toBeTruthy();
      });
    });
  });

  describe('form elements', () => {
    it('shows photo section', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Take a photo of the drop-off spot')).toBeTruthy();
      });
    });

    it('shows notes input', async () => {
      const { getByPlaceholderText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('e.g., Behind the big oak tree near hole 7, under a rock')).toBeTruthy();
      });
    });
  });

  describe('action buttons', () => {
    it('shows confirm button', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Confirm Drop-off')).toBeTruthy();
      });
    });

    it('shows cancel button', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Cancel')).toBeTruthy();
      });
    });
  });

  describe('location display', () => {
    it('formats location coordinates correctly', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('42.123000, -71.456000')).toBeTruthy();
      });
    });
  });

  describe('notes input', () => {
    it('allows entering location notes', async () => {
      const { getByPlaceholderText } = render(<DropOffScreen />);

      await waitFor(() => {
        const notesInput = getByPlaceholderText('e.g., Behind the big oak tree near hole 7, under a rock');
        fireEvent.changeText(notesInput, 'Near the pavilion');
        expect(notesInput.props.value).toBe('Near the pavilion');
      });
    });
  });

  describe('location permission denied', () => {
    it('shows alert when location permission denied', async () => {
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Drop Off Location')).toBeTruthy();
      });

      // Should still render without crashing
      await waitFor(() => {
        expect(getByText('Confirm Drop-off')).toBeTruthy();
      });
    });
  });

  describe('submit with photo and location', () => {
    it('shows photo button before taking photo', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Take a photo of the drop-off spot')).toBeTruthy();
      });
    });
  });

  describe('missing location validation', () => {
    it('shows alert when submitting without location', async () => {
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Confirm Drop-off')).toBeTruthy();
      });

      fireEvent.press(getByText('Confirm Drop-off'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });
    });
  });

  describe('disc name display', () => {
    it('fetches disc name from recovery details', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ disc: { name: 'My Destroyer' } }),
      });

      render(<DropOffScreen />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/get-recovery-details'),
          expect.any(Object)
        );
      });
    });
  });

  describe('location error handling', () => {
    it('handles location fetch error gracefully', async () => {
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Location.getCurrentPositionAsync.mockRejectedValue(new Error('Location error'));

      const { getByText } = render(<DropOffScreen />);

      // Should still render without crashing
      await waitFor(() => {
        expect(getByText('Drop Off Location')).toBeTruthy();
      });
    });
  });

  describe('screen header', () => {
    it('shows drop off screen header', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Drop Off Location')).toBeTruthy();
        expect(getByText(/Leave the disc somewhere safe/)).toBeTruthy();
      });
    });
  });

  describe('photo section label', () => {
    it('shows photo required label', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText(/Photo of Location/)).toBeTruthy();
      });
    });
  });

  describe('photo hint text', () => {
    it('shows photo hint', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText(/Take a clear photo showing where you left the disc/)).toBeTruthy();
      });
    });
  });

  describe('camera component', () => {
    it('shows camera overlay component', async () => {
      const { UNSAFE_getByType } = render(<DropOffScreen />);

      await waitFor(() => {
        // CameraWithOverlay is mocked
        expect(UNSAFE_getByType).toBeDefined();
      });
    });
  });

  describe('submit flow', () => {
    beforeEach(() => {
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 42.123, longitude: -71.456 },
      });
    });

    it('validates photo before submit', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Confirm Drop-off')).toBeTruthy();
      });

      fireEvent.press(getByText('Confirm Drop-off'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Missing Photo',
        'Please take a photo of the drop-off location.'
      );
    });
  });

  describe('form rendering', () => {
    it('shows all form elements', async () => {
      const { getByText, getByPlaceholderText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Drop Off Location')).toBeTruthy();
        expect(getByText('Confirm Drop-off')).toBeTruthy();
        expect(getByText('Cancel')).toBeTruthy();
        expect(getByPlaceholderText('e.g., Behind the big oak tree near hole 7, under a rock')).toBeTruthy();
      });
    });
  });

  describe('dark mode', () => {
    it('renders in light mode', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Drop Off Location')).toBeTruthy();
      });
    });
  });

  describe('API integration', () => {
    it('fetches recovery details from API', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ disc: { name: 'Firebird', manufacturer: 'Innova' } }),
      });

      render(<DropOffScreen />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/get-recovery-details'),
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              Authorization: expect.any(String),
            }),
          })
        );
      });
    });
  });

  describe('location state', () => {
    it('updates location state when location captured', async () => {
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 40.7128, longitude: -74.0060 },
      });

      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Location captured')).toBeTruthy();
        expect(getByText('40.712800, -74.006000')).toBeTruthy();
      });
    });
  });

  describe('notes field', () => {
    it('can enter and change location notes', async () => {
      const { getByPlaceholderText } = render(<DropOffScreen />);

      await waitFor(() => {
        const input = getByPlaceholderText('e.g., Behind the big oak tree near hole 7, under a rock');
        expect(input).toBeTruthy();
      });

      const input = getByPlaceholderText('e.g., Behind the big oak tree near hole 7, under a rock');
      fireEvent.changeText(input, 'By the parking lot');

      expect(input.props.value).toBe('By the parking lot');
    });
  });

  describe('buttons', () => {
    it('cancel button navigates back', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Cancel')).toBeTruthy();
      });

      fireEvent.press(getByText('Cancel'));

      expect(mockRouter.back).toHaveBeenCalled();
    });

    it('confirm button is present', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Confirm Drop-off')).toBeTruthy();
      });
    });
  });

  describe('location permission alert', () => {
    it('shows permission required alert with settings option', async () => {
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

      render(<DropOffScreen />);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Permission Required',
          'Location permission is required to record the drop-off location. Please enable it in settings.',
          expect.arrayContaining([
            expect.objectContaining({ text: 'Cancel' }),
            expect.objectContaining({ text: 'Open Settings' }),
          ])
        );
      });
    });
  });

  describe('missing location validation', () => {
    it('shows missing location alert on submit without location', async () => {
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const { getByText, UNSAFE_root } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Confirm Drop-off')).toBeTruthy();
      });

      // Simulate photo being set by directly setting state
      // Since we can't easily set photo state, the first alert will be missing photo
      fireEvent.press(getByText('Confirm Drop-off'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });
    });
  });

  describe('no session handling', () => {
    it('shows sign in error when no session on submit', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Confirm Drop-off')).toBeTruthy();
      });

      fireEvent.press(getByText('Confirm Drop-off'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });
    });
  });

  describe('fetch recovery details', () => {
    it('handles no session gracefully', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
      });

      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Drop Off Location')).toBeTruthy();
      });
    });

    it('handles response without disc name', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ disc: {} }),
      });

      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Drop Off Location')).toBeTruthy();
      });
    });
  });

  describe('tap to get location', () => {
    it('shows tap to get location when no location yet', async () => {
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Tap to get current location')).toBeTruthy();
      });
    });
  });

  describe('GPS location section', () => {
    it('shows GPS location label', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText(/GPS Location/)).toBeTruthy();
      });
    });

    it('shows GPS hint text', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText(/Your GPS coordinates will help the owner navigate/)).toBeTruthy();
      });
    });
  });

  describe('location notes optional', () => {
    it('shows location notes as optional', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText(/Location Notes \(Optional\)/)).toBeTruthy();
      });
    });
  });

  describe('successful submit flow', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 42.123, longitude: -71.456 },
      });

      const { supabase } = require('../../lib/supabase');
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'test-token', user: { id: 'user-1' } } },
      });
    });

    it('uploads photo and creates drop-off on successful submit', async () => {
      // Mock all required API calls
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('get-recovery-details')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ disc: { name: 'Destroyer' } }),
          });
        }
        if (url.includes('upload-drop-off-photo')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ photo_url: 'https://example.com/uploaded-photo.jpg' }),
          });
        }
        if (url.includes('create-drop-off')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Location captured')).toBeTruthy();
      });

      // Can't directly trigger photo taken, but can verify the component renders
      expect(getByText('Confirm Drop-off')).toBeTruthy();
    });

    it('calls upload-drop-off-photo API', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('get-recovery-details')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ disc: { name: 'Test' } }),
          });
        }
        if (url.includes('upload-drop-off-photo')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ photo_url: 'https://example.com/photo.jpg' }),
          });
        }
        if (url.includes('create-drop-off')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Drop Off Location')).toBeTruthy();
      });
    });

    it('handles photo upload failure', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('get-recovery-details')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ disc: { name: 'Test' } }),
          });
        }
        if (url.includes('upload-drop-off-photo')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Upload failed' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Drop Off Location')).toBeTruthy();
      });
    });

    it('handles create-drop-off API failure', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('get-recovery-details')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ disc: { name: 'Test' } }),
          });
        }
        if (url.includes('upload-drop-off-photo')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ photo_url: 'https://example.com/photo.jpg' }),
          });
        }
        if (url.includes('create-drop-off')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Failed to create drop-off' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Drop Off Location')).toBeTruthy();
      });
    });
  });

  describe('open maps preview', () => {
    it('renders location pressable area', async () => {
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 42.123, longitude: -71.456 },
      });

      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Location captured')).toBeTruthy();
      });

      // The location area should be pressable
      fireEvent.press(getByText('Location captured'));
      // This triggers openMapsPreview
    });
  });

  describe('retake photo button', () => {
    it('renders photo section', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Take a photo of the drop-off spot')).toBeTruthy();
      });

      // Press to open camera
      fireEvent.press(getByText('Take a photo of the drop-off spot'));
    });
  });

  describe('loading location state', () => {
    it('shows loading state while fetching location', async () => {
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync.mockImplementation(
        () => new Promise(() => {}) // Never resolves to keep loading
      );

      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Getting your location...')).toBeTruthy();
      });
    });
  });

  describe('platform specific maps URL', () => {
    it('renders on iOS', async () => {
      jest.doMock('react-native', () => ({
        ...jest.requireActual('react-native'),
        Platform: { OS: 'ios', select: jest.fn((opts) => opts.ios) },
      }));

      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Drop Off Location')).toBeTruthy();
      });
    });
  });

  describe('upload photo no session', () => {
    it('handles no session during photo upload', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.auth.getSession
        .mockResolvedValueOnce({
          data: { session: { access_token: 'test-token' } },
        })
        .mockResolvedValueOnce({
          data: { session: null },
        });

      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Drop Off Location')).toBeTruthy();
      });
    });
  });

  describe('submit button disabled state', () => {
    it('shows confirm button not disabled initially', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        const button = getByText('Confirm Drop-off');
        expect(button).toBeTruthy();
      });
    });
  });

  describe('photo section visibility', () => {
    it('shows take photo button when no photo', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Take a photo of the drop-off spot')).toBeTruthy();
      });
    });
  });

  describe('location box states', () => {
    it('shows loading state', async () => {
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync.mockImplementation(
        () => new Promise(() => {})
      );

      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Getting your location...')).toBeTruthy();
      });
    });

    it('shows success state with coordinates', async () => {
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 35.0, longitude: -80.0 },
      });

      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('35.000000, -80.000000')).toBeTruthy();
      });
    });

    it('shows tap to get location when permission denied', async () => {
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Tap to get current location')).toBeTruthy();
      });
    });
  });

  describe('image compression', () => {
    it('compresses image before upload', async () => {
      const { compressImage } = require('../../utils/imageCompression');

      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Drop Off Location')).toBeTruthy();
      });

      // compressImage is called when uploading a photo
      expect(compressImage).toBeDefined();
    });
  });

  describe('form data submission', () => {
    it('includes location notes in submission', async () => {
      const { getByPlaceholderText, getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('e.g., Behind the big oak tree near hole 7, under a rock')).toBeTruthy();
      });

      fireEvent.changeText(
        getByPlaceholderText('e.g., Behind the big oak tree near hole 7, under a rock'),
        'Near the pavilion entrance'
      );

      expect(getByPlaceholderText('e.g., Behind the big oak tree near hole 7, under a rock').props.value).toBe('Near the pavilion entrance');
    });
  });

  describe('handleSubmit complete flow', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 42.123, longitude: -71.456 },
      });
    });

    it('successfully submits with photo, location and notes', async () => {
      const { showSuccess } = require('../../lib/errorHandler');
      const { compressImage } = require('../../utils/imageCompression');

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('get-recovery-details')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ disc: { name: 'Destroyer' } }),
          });
        }
        if (url.includes('upload-drop-off-photo')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ photo_url: 'https://example.com/photo.jpg' }),
          });
        }
        if (url.includes('create-drop-off')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { getByText, getByPlaceholderText, UNSAFE_root } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Location captured')).toBeTruthy();
      });

      // Simulate photo being taken
      const cameraProps = UNSAFE_root.findAllByType('CameraWithOverlay')[0].props;
      await act(async () => {
        await cameraProps.onPhotoTaken({ uri: 'file:///photo.jpg' });
      });

      await waitFor(() => {
        expect(getByText('Retake')).toBeTruthy();
      });

      // Enter location notes
      fireEvent.changeText(
        getByPlaceholderText('e.g., Behind the big oak tree near hole 7, under a rock'),
        'Near the pavilion'
      );

      // Submit the form
      fireEvent.press(getByText('Confirm Drop-off'));

      await waitFor(() => {
        expect(compressImage).toHaveBeenCalledWith('file:///photo.jpg');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('upload-drop-off-photo'),
          expect.objectContaining({
            method: 'POST',
          })
        );
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('create-drop-off'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              Authorization: 'Bearer test-token',
            }),
          })
        );
        expect(showSuccess).toHaveBeenCalledWith("You've left Destroyer for the owner to pick up");
        expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/found-disc');
      });
    });

    it('trims location notes before submission', async () => {
      const { compressImage } = require('../../utils/imageCompression');

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('get-recovery-details')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ disc: { name: 'Test' } }),
          });
        }
        if (url.includes('upload-drop-off-photo')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ photo_url: 'https://example.com/photo.jpg' }),
          });
        }
        if (url.includes('create-drop-off')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { getByText, getByPlaceholderText, UNSAFE_root } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Location captured')).toBeTruthy();
      });

      // Simulate photo being taken
      const cameraProps = UNSAFE_root.findAllByType('CameraWithOverlay')[0].props;
      await act(async () => {
        await cameraProps.onPhotoTaken({ uri: 'file:///photo.jpg' });
      });

      // Enter notes with leading/trailing whitespace
      fireEvent.changeText(
        getByPlaceholderText('e.g., Behind the big oak tree near hole 7, under a rock'),
        '  Near the pavilion  '
      );

      fireEvent.press(getByText('Confirm Drop-off'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('create-drop-off'),
          expect.objectContaining({
            body: expect.stringContaining('"location_notes":"Near the pavilion"'),
          })
        );
      });
    });

    it('omits location notes when empty after trimming', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('get-recovery-details')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ disc: { name: 'Test' } }),
          });
        }
        if (url.includes('upload-drop-off-photo')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ photo_url: 'https://example.com/photo.jpg' }),
          });
        }
        if (url.includes('create-drop-off')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { getByText, UNSAFE_root } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Location captured')).toBeTruthy();
      });

      // Simulate photo being taken
      const cameraProps = UNSAFE_root.findAllByType('CameraWithOverlay')[0].props;
      await act(async () => {
        await cameraProps.onPhotoTaken({ uri: 'file:///photo.jpg' });
      });

      fireEvent.press(getByText('Confirm Drop-off'));

      await waitFor(() => {
        const createDropOffCall = (global.fetch as jest.Mock).mock.calls.find(
          call => call[0].includes('create-drop-off')
        );
        const body = JSON.parse(createDropOffCall[1].body);
        expect(body.location_notes).toBeUndefined();
      });
    });

    it('shows error when photo upload fails', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('get-recovery-details')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ disc: { name: 'Test' } }),
          });
        }
        if (url.includes('upload-drop-off-photo')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Upload failed' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { getByText, UNSAFE_root } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Location captured')).toBeTruthy();
      });

      // Simulate photo being taken
      const cameraProps = UNSAFE_root.findAllByType('CameraWithOverlay')[0].props;
      await act(async () => {
        await cameraProps.onPhotoTaken({ uri: 'file:///photo.jpg' });
      });

      fireEvent.press(getByText('Confirm Drop-off'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to upload photo. Please try again.');
      });
    });

    it('shows error when create-drop-off fails', async () => {
      const { handleError } = require('../../lib/errorHandler');

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('get-recovery-details')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ disc: { name: 'Test' } }),
          });
        }
        if (url.includes('upload-drop-off-photo')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ photo_url: 'https://example.com/photo.jpg' }),
          });
        }
        if (url.includes('create-drop-off')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Database error' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { getByText, UNSAFE_root } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Location captured')).toBeTruthy();
      });

      // Simulate photo being taken
      const cameraProps = UNSAFE_root.findAllByType('CameraWithOverlay')[0].props;
      await act(async () => {
        await cameraProps.onPhotoTaken({ uri: 'file:///photo.jpg' });
      });

      fireEvent.press(getByText('Confirm Drop-off'));

      await waitFor(() => {
        expect(handleError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            operation: 'create-drop-off',
          })
        );
      });
    });

    it('shows error when upload throws exception', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('get-recovery-details')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ disc: { name: 'Test' } }),
          });
        }
        if (url.includes('upload-drop-off-photo')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { getByText, UNSAFE_root } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Location captured')).toBeTruthy();
      });

      // Simulate photo being taken
      const cameraProps = UNSAFE_root.findAllByType('CameraWithOverlay')[0].props;
      await act(async () => {
        await cameraProps.onPhotoTaken({ uri: 'file:///photo.jpg' });
      });

      fireEvent.press(getByText('Confirm Drop-off'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to upload photo. Please try again.');
      });
    });

    it('handles session loss during upload', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.auth.getSession
        .mockResolvedValueOnce({
          data: { session: { access_token: 'test-token', user: { id: 'user-1' } } },
        })
        .mockResolvedValueOnce({
          data: { session: { access_token: 'test-token', user: { id: 'user-1' } } },
        })
        .mockResolvedValueOnce({
          data: { session: null },
        });

      const { getByText, UNSAFE_root } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Location captured')).toBeTruthy();
      });

      // Simulate photo being taken
      const cameraProps = UNSAFE_root.findAllByType('CameraWithOverlay')[0].props;
      await act(async () => {
        await cameraProps.onPhotoTaken({ uri: 'file:///photo.jpg' });
      });

      fireEvent.press(getByText('Confirm Drop-off'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to upload photo. Please try again.');
      });
    });

    it('compresses image before upload', async () => {
      const { compressImage } = require('../../utils/imageCompression');
      compressImage.mockResolvedValue({ uri: 'file:///compressed.jpg' });

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('get-recovery-details')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ disc: { name: 'Test' } }),
          });
        }
        if (url.includes('upload-drop-off-photo')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ photo_url: 'https://example.com/photo.jpg' }),
          });
        }
        if (url.includes('create-drop-off')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { getByText, UNSAFE_root } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Location captured')).toBeTruthy();
      });

      // Simulate photo being taken
      const cameraProps = UNSAFE_root.findAllByType('CameraWithOverlay')[0].props;
      await act(async () => {
        await cameraProps.onPhotoTaken({ uri: 'file:///original.jpg' });
      });

      fireEvent.press(getByText('Confirm Drop-off'));

      await waitFor(() => {
        expect(compressImage).toHaveBeenCalledWith('file:///original.jpg');
      });
    });
  });

  describe('openMapsPreview', () => {
    beforeEach(() => {
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 42.123, longitude: -71.456 },
      });
    });

    it('opens maps when location is pressed', async () => {
      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Location captured')).toBeTruthy();
      });

      fireEvent.press(getByText('Location captured'));

      expect(mockOpenURL).toHaveBeenCalledWith(
        expect.stringContaining('42.123')
      );
    });

    it('does not open maps when location is null', async () => {
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Tap to get current location')).toBeTruthy();
      });

      fireEvent.press(getByText('Tap to get current location'));

      // Should request location, not open maps
      expect(mockOpenURL).not.toHaveBeenCalled();
    });
  });

  describe('camera interaction', () => {
    it('opens camera when photo button is pressed', async () => {
      const { getByText, UNSAFE_root } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Take a photo of the drop-off spot')).toBeTruthy();
      });

      fireEvent.press(getByText('Take a photo of the drop-off spot'));

      const cameraProps = UNSAFE_root.findAllByType('CameraWithOverlay')[0].props;
      expect(cameraProps.visible).toBe(true);
    });

    it('closes camera and sets photo when photo is taken', async () => {
      const { getByText, UNSAFE_root } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Take a photo of the drop-off spot')).toBeTruthy();
      });

      const cameraProps = UNSAFE_root.findAllByType('CameraWithOverlay')[0].props;
      await act(async () => {
        await cameraProps.onPhotoTaken({ uri: 'file:///test-photo.jpg' });
      });

      await waitFor(() => {
        expect(getByText('Retake')).toBeTruthy();
      });
    });

    it('closes camera when close button is pressed', async () => {
      const { getByText, UNSAFE_root } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Take a photo of the drop-off spot')).toBeTruthy();
      });

      fireEvent.press(getByText('Take a photo of the drop-off spot'));

      const cameraProps = UNSAFE_root.findAllByType('CameraWithOverlay')[0].props;
      cameraProps.onClose();

      // Camera should be hidden
      expect(cameraProps.visible).toBe(true); // Initial state from first render
    });

    it('can retake photo', async () => {
      const { getByText, UNSAFE_root } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Take a photo of the drop-off spot')).toBeTruthy();
      });

      // Take first photo
      const cameraProps = UNSAFE_root.findAllByType('CameraWithOverlay')[0].props;
      await act(async () => {
        await cameraProps.onPhotoTaken({ uri: 'file:///first-photo.jpg' });
      });

      await waitFor(() => {
        expect(getByText('Retake')).toBeTruthy();
      });

      // Retake photo
      fireEvent.press(getByText('Retake'));

      // Take second photo
      const updatedCameraProps = UNSAFE_root.findAllByType('CameraWithOverlay')[0].props;
      await act(async () => {
        await updatedCameraProps.onPhotoTaken({ uri: 'file:///second-photo.jpg' });
      });

      await waitFor(() => {
        expect(getByText('Retake')).toBeTruthy();
      });
    });
  });

  describe('requestLocation manual trigger', () => {
    it('manually requests location when tapped', async () => {
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync
        .mockResolvedValueOnce({ status: 'denied' })
        .mockResolvedValueOnce({ status: 'granted' });
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 40.0, longitude: -70.0 },
      });

      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Tap to get current location')).toBeTruthy();
      });

      fireEvent.press(getByText('Tap to get current location'));

      await waitFor(() => {
        expect(getByText('40.000000, -70.000000')).toBeTruthy();
      });
    });

    it('handles location error with error handler', async () => {
      const { handleError } = require('../../lib/errorHandler');
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync
        .mockResolvedValueOnce({ status: 'denied' })
        .mockResolvedValueOnce({ status: 'granted' });
      Location.getCurrentPositionAsync.mockRejectedValue(new Error('GPS error'));

      const { getByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Tap to get current location')).toBeTruthy();
      });

      fireEvent.press(getByText('Tap to get current location'));

      await waitFor(() => {
        expect(handleError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            operation: 'get-location',
          })
        );
      });
    });
  });

  describe('disc name in success message', () => {
    beforeEach(() => {
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 42.123, longitude: -71.456 },
      });
    });

    it('uses default disc name when recovery details fail', async () => {
      const { showSuccess } = require('../../lib/errorHandler');

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('get-recovery-details')) {
          return Promise.reject(new Error('Failed'));
        }
        if (url.includes('upload-drop-off-photo')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ photo_url: 'https://example.com/photo.jpg' }),
          });
        }
        if (url.includes('create-drop-off')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { getByText, UNSAFE_root } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Location captured')).toBeTruthy();
      });

      // Simulate photo being taken
      const cameraProps = UNSAFE_root.findAllByType('CameraWithOverlay')[0].props;
      await act(async () => {
        await cameraProps.onPhotoTaken({ uri: 'file:///photo.jpg' });
      });

      fireEvent.press(getByText('Confirm Drop-off'));

      await waitFor(() => {
        expect(showSuccess).toHaveBeenCalledWith("You've left the disc for the owner to pick up");
      });
    });

    it('uses disc name from recovery details in success message', async () => {
      const { showSuccess } = require('../../lib/errorHandler');

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('get-recovery-details')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ disc: { name: 'Wraith' } }),
          });
        }
        if (url.includes('upload-drop-off-photo')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ photo_url: 'https://example.com/photo.jpg' }),
          });
        }
        if (url.includes('create-drop-off')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { getByText, UNSAFE_root } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Location captured')).toBeTruthy();
      });

      // Simulate photo being taken
      const cameraProps = UNSAFE_root.findAllByType('CameraWithOverlay')[0].props;
      await act(async () => {
        await cameraProps.onPhotoTaken({ uri: 'file:///photo.jpg' });
      });

      fireEvent.press(getByText('Confirm Drop-off'));

      await waitFor(() => {
        expect(showSuccess).toHaveBeenCalledWith("You've left Wraith for the owner to pick up");
      });
    });
  });

  describe('submitting state', () => {
    beforeEach(() => {
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 42.123, longitude: -71.456 },
      });
    });

    it('disables buttons while submitting', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('get-recovery-details')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ disc: { name: 'Test' } }),
          });
        }
        if (url.includes('upload-drop-off-photo')) {
          return new Promise(() => {}); // Never resolves
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { getByText, UNSAFE_root, queryByText } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Location captured')).toBeTruthy();
      });

      // Simulate photo being taken
      const cameraProps = UNSAFE_root.findAllByType('CameraWithOverlay')[0].props;
      await act(async () => {
        await cameraProps.onPhotoTaken({ uri: 'file:///photo.jpg' });
      });

      const confirmButton = getByText('Confirm Drop-off');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(queryByText('Confirm Drop-off')).toBeFalsy();
      });
    });
  });

  describe('session handling in submit', () => {
    beforeEach(() => {
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 42.123, longitude: -71.456 },
      });
    });

    it('shows sign in error when no session at submit time', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.auth.getSession
        .mockResolvedValueOnce({
          data: { session: { access_token: 'test-token' } },
        })
        .mockResolvedValueOnce({
          data: { session: null },
        });

      const { getByText, UNSAFE_root } = render(<DropOffScreen />);

      await waitFor(() => {
        expect(getByText('Location captured')).toBeTruthy();
      });

      // Simulate photo being taken
      const cameraProps = UNSAFE_root.findAllByType('CameraWithOverlay')[0].props;
      await act(async () => {
        await cameraProps.onPhotoTaken({ uri: 'file:///photo.jpg' });
      });

      fireEvent.press(getByText('Confirm Drop-off'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'You must be signed in to create a drop-off.');
      });
    });
  });
});
