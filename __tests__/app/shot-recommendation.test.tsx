import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ShotRecommendationScreen from '../../app/shot-recommendation';

// Mock expo-router
const mockRouterBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockRouterBack,
  }),
  Stack: {
    Screen: () => null,
  },
}));

// Mock supabase
const mockGetSession = jest.fn();
const mockGetUser = jest.fn();
const mockFrom = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      getUser: () => mockGetUser(),
    },
    from: (table: string) => mockFrom(table),
  },
}));

// Mock useColorScheme
jest.mock('../../components/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

// Mock CameraWithOverlay
jest.mock('../../components/CameraWithOverlay', () => 'CameraWithOverlay');

// Mock useShotRecommendation hook
const mockGetRecommendation = jest.fn();
const mockReset = jest.fn();
let mockIsLoading = false;
let mockError: string | null = null;
let mockResult: unknown = null;

jest.mock('../../hooks/useShotRecommendation', () => ({
  useShotRecommendation: () => ({
    getRecommendation: mockGetRecommendation,
    isLoading: mockIsLoading,
    error: mockError,
    result: mockResult,
    reset: mockReset,
  }),
}));

// Mock expo-camera
jest.mock('expo-camera', () => ({
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
  CameraView: 'CameraView',
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock expo-image-picker
const mockLaunchImageLibraryAsync = jest.fn();
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: () => mockLaunchImageLibraryAsync(),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('ShotRecommendationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsLoading = false;
    mockError = null;
    mockResult = null;
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { throwing_hand: 'right' },
            error: null,
          }),
        }),
      }),
    });
  });

  it('renders initial screen with camera prompt', () => {
    const { getByText } = render(<ShotRecommendationScreen />);

    expect(getByText('Shot Advisor')).toBeTruthy();
    expect(getByText(/Take a photo/i)).toBeTruthy();
  });

  it('shows loading state while processing', () => {
    mockIsLoading = true;

    const { getByText } = render(<ShotRecommendationScreen />);

    expect(getByText(/Analyzing/i)).toBeTruthy();
  });

  it('displays recommendation results', () => {
    mockResult = {
      recommendation: {
        disc: {
          id: 'disc-1',
          name: 'Destroyer',
          manufacturer: 'Innova',
          flight_numbers: { speed: 12, glide: 5, turn: -1, fade: 3 },
        },
        throw_type: 'hyzer',
        power_percentage: 85,
        line_description: 'Aim left of center, let disc fade to basket.',
      },
      terrain_analysis: {
        estimated_distance_ft: 285,
        elevation_change: 'flat',
        obstacles: 'Tree line on right',
        fairway_shape: 'straight',
      },
      alternatives: [],
      confidence: 0.85,
      processing_time_ms: 1200,
      log_id: 'log-123',
    };

    const { getByText, getAllByText } = render(<ShotRecommendationScreen />);

    expect(getByText('Destroyer')).toBeTruthy();
    expect(getByText(/285/)).toBeTruthy();
    // Both confidence (85%) and power (85%) show 85%, so use getAllByText
    expect(getAllByText(/85%/).length).toBeGreaterThanOrEqual(1);
  });

  it('displays throw type in recommendation', () => {
    mockResult = {
      recommendation: {
        disc: { id: 'disc-1', name: 'Destroyer', manufacturer: 'Innova' },
        throw_type: 'hyzer',
        power_percentage: 85,
        line_description: 'Test line description',
      },
      terrain_analysis: {
        estimated_distance_ft: 285,
        elevation_change: 'flat',
        obstacles: 'None',
        fairway_shape: 'straight',
      },
      alternatives: [],
      confidence: 0.85,
    };

    const { getByText } = render(<ShotRecommendationScreen />);

    expect(getByText(/HYZER/i)).toBeTruthy();
  });

  it('displays line description', () => {
    mockResult = {
      recommendation: {
        disc: { id: 'disc-1', name: 'Destroyer', manufacturer: 'Innova' },
        throw_type: 'flat',
        power_percentage: 90,
        line_description: 'Throw straight at the basket with full power.',
      },
      terrain_analysis: {
        estimated_distance_ft: 200,
        elevation_change: 'flat',
        obstacles: 'None',
        fairway_shape: 'open',
      },
      alternatives: [],
      confidence: 0.9,
    };

    const { getByText } = render(<ShotRecommendationScreen />);

    expect(getByText(/Throw straight at the basket/)).toBeTruthy();
  });

  it('displays alternatives when available', () => {
    mockResult = {
      recommendation: {
        disc: { id: 'disc-1', name: 'Destroyer', manufacturer: 'Innova' },
        throw_type: 'hyzer',
        power_percentage: 85,
        line_description: 'Primary line',
      },
      terrain_analysis: {
        estimated_distance_ft: 285,
        elevation_change: 'flat',
        obstacles: 'Trees',
        fairway_shape: 'straight',
      },
      alternatives: [
        {
          disc: { id: 'disc-2', name: 'Wraith', manufacturer: 'Innova' },
          throw_type: 'flat',
          reason: 'More glide for uphill finish',
        },
      ],
      confidence: 0.85,
    };

    const { getByText } = render(<ShotRecommendationScreen />);

    expect(getByText('Wraith')).toBeTruthy();
    expect(getByText(/More glide/)).toBeTruthy();
  });

  it('displays terrain analysis', () => {
    mockResult = {
      recommendation: {
        disc: { id: 'disc-1', name: 'Destroyer', manufacturer: 'Innova' },
        throw_type: 'hyzer',
        power_percentage: 85,
        line_description: 'Test',
      },
      terrain_analysis: {
        estimated_distance_ft: 350,
        elevation_change: 'uphill',
        obstacles: 'OB left, trees right',
        fairway_shape: 'dogleg_right',
      },
      alternatives: [],
      confidence: 0.75,
    };

    const { getByText } = render(<ShotRecommendationScreen />);

    expect(getByText(/350/)).toBeTruthy();
    expect(getByText(/uphill/i)).toBeTruthy();
  });

  it('shows error message when recommendation fails', () => {
    mockError = 'No discs in bag. Add discs to get shot recommendations.';

    const { getByText } = render(<ShotRecommendationScreen />);

    expect(getByText(/No discs in bag/)).toBeTruthy();
  });

  it('shows try again button after error', () => {
    mockError = 'Something went wrong';

    const { getByText } = render(<ShotRecommendationScreen />);

    expect(getByText('Try Again')).toBeTruthy();
  });

  it('calls reset when try again is pressed', () => {
    mockError = 'Something went wrong';

    const { getByText } = render(<ShotRecommendationScreen />);

    fireEvent.press(getByText('Try Again'));

    expect(mockReset).toHaveBeenCalled();
  });

  it('shows back button', () => {
    const { getByText } = render(<ShotRecommendationScreen />);

    const backButton = getByText('Back');
    expect(backButton).toBeTruthy();
  });

  it('navigates back when back button is pressed', () => {
    const { getByText } = render(<ShotRecommendationScreen />);

    fireEvent.press(getByText('Back'));

    expect(mockRouterBack).toHaveBeenCalled();
  });

  it('shows try another shot button after recommendation', () => {
    mockResult = {
      recommendation: {
        disc: { id: 'disc-1', name: 'Destroyer', manufacturer: 'Innova' },
        throw_type: 'hyzer',
        power_percentage: 85,
        line_description: 'Test',
      },
      terrain_analysis: {
        estimated_distance_ft: 285,
        elevation_change: 'flat',
        obstacles: 'None',
        fairway_shape: 'straight',
      },
      alternatives: [],
      confidence: 0.85,
    };

    const { getByText } = render(<ShotRecommendationScreen />);

    expect(getByText('Try Another Shot')).toBeTruthy();
  });

  it('calls reset when try another shot is pressed', () => {
    mockResult = {
      recommendation: {
        disc: { id: 'disc-1', name: 'Destroyer', manufacturer: 'Innova' },
        throw_type: 'hyzer',
        power_percentage: 85,
        line_description: 'Test',
      },
      terrain_analysis: {
        estimated_distance_ft: 285,
        elevation_change: 'flat',
        obstacles: 'None',
        fairway_shape: 'straight',
      },
      alternatives: [],
      confidence: 0.85,
    };

    const { getByText } = render(<ShotRecommendationScreen />);

    fireEvent.press(getByText('Try Another Shot'));

    expect(mockReset).toHaveBeenCalled();
  });

  it('displays confidence level', () => {
    mockResult = {
      recommendation: {
        disc: { id: 'disc-1', name: 'Destroyer', manufacturer: 'Innova' },
        throw_type: 'hyzer',
        power_percentage: 85,
        line_description: 'Test',
      },
      terrain_analysis: {
        estimated_distance_ft: 285,
        elevation_change: 'flat',
        obstacles: 'None',
        fairway_shape: 'straight',
      },
      alternatives: [],
      confidence: 0.92,
    };

    const { getByText } = render(<ShotRecommendationScreen />);

    expect(getByText(/92%/)).toBeTruthy();
  });

  it('displays flight numbers when available', () => {
    mockResult = {
      recommendation: {
        disc: {
          id: 'disc-1',
          name: 'Destroyer',
          manufacturer: 'Innova',
          flight_numbers: { speed: 12, glide: 5, turn: -1, fade: 3 },
        },
        throw_type: 'hyzer',
        power_percentage: 85,
        line_description: 'Test',
      },
      terrain_analysis: {
        estimated_distance_ft: 285,
        elevation_change: 'flat',
        obstacles: 'None',
        fairway_shape: 'straight',
      },
      alternatives: [],
      confidence: 0.85,
    };

    const { getByText } = render(<ShotRecommendationScreen />);

    expect(getByText(/12/)).toBeTruthy(); // speed
  });

  describe('useEffect cleanup', () => {
    it('does not update state after unmount', async () => {
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      // Create a delayed promise to simulate slow network
      let resolvePromise: (value: { data: { throwing_hand: string }; error: null }) => void;
      const delayedPromise = new Promise<{ data: { throwing_hand: string }; error: null }>((resolve) => {
        resolvePromise = resolve;
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockReturnValue(delayedPromise),
          }),
        }),
      });

      const { unmount, getByText } = render(<ShotRecommendationScreen />);

      // Verify component rendered
      expect(getByText('Shot Advisor')).toBeTruthy();

      // Unmount before the promise resolves
      unmount();

      // Now resolve the promise after unmount
      resolvePromise!({ data: { throwing_hand: 'left' }, error: null });

      // Wait a tick to ensure async operations complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // Check that no warnings about state updates on unmounted components
      const stateUpdateWarning = consoleWarn.mock.calls.find(
        call => call[0]?.includes?.('state update on an unmounted')
      ) || consoleError.mock.calls.find(
        call => call[0]?.includes?.('state update on an unmounted') ||
               call[0]?.includes?.("Can't perform a React state update")
      );

      expect(stateUpdateWarning).toBeUndefined();

      consoleWarn.mockRestore();
      consoleError.mockRestore();
    });
  });
});
