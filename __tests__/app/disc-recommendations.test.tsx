import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import DiscRecommendationsScreen from '../../app/disc-recommendations';

// Mock Linking
jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

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

// Mock the hook
const mockGetRecommendations = jest.fn();
const mockReset = jest.fn();
const mockHookState = {
  getRecommendations: mockGetRecommendations,
  isLoading: false,
  error: null,
  result: null,
  reset: mockReset,
};

jest.mock('@/hooks/useDiscRecommendations', () => ({
  useDiscRecommendations: () => mockHookState,
}));

// Mock components
jest.mock('@/components/DiscRecommendationCard', () => {
  const { View, Text } = require('react-native');
  return function MockDiscRecommendationCard({ recommendation, onBuyPress }: { recommendation: { disc: { mold: string } }; onBuyPress: () => void }) {
    return (
      <View testID="disc-recommendation-card">
        <Text>{recommendation.disc.mold}</Text>
        <Text onPress={onBuyPress}>Buy</Text>
      </View>
    );
  };
});

jest.mock('@/components/BagAnalysisCard', () => {
  const { View, Text } = require('react-native');
  return function MockBagAnalysisCard() {
    return (
      <View testID="bag-analysis-card">
        <Text>Bag Analysis</Text>
      </View>
    );
  };
});

const mockResult = {
  recommendations: [
    {
      disc: {
        id: 'disc-1',
        manufacturer: 'Innova',
        mold: 'Destroyer',
        category: 'Distance Driver',
        flight_numbers: { speed: 12, glide: 5, turn: -1, fade: 3 },
        stability: 'overstable',
      },
      reason: 'Fill speed gap',
      gap_type: 'speed_range' as const,
      priority: 1,
      purchase_url: 'https://example.com/destroyer',
    },
  ],
  bag_analysis: {
    total_discs: 10,
    categories: { putter: 3, midrange: 3, driver: 4 },
    speed_range: { min: 2, max: 10 },
    speed_gaps: [{ from: 10, to: 12 }],
    stability_breakdown: [],
    brand_preferences: [],
    plastic_preferences: [],
  },
  confidence: 0.85,
  processing_time_ms: 150,
};

describe('DiscRecommendationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHookState.isLoading = false;
    mockHookState.error = null;
    mockHookState.result = null;
  });

  it('renders initial state with count selector', async () => {
    const { getByText } = render(<DiscRecommendationsScreen />);

    await waitFor(() => {
      expect(getByText('Fill My Bag')).toBeTruthy();
      expect(getByText('Fill Your Bag')).toBeTruthy();
      expect(getByText('How many recommendations?')).toBeTruthy();
      expect(getByText('1')).toBeTruthy();
      expect(getByText('3')).toBeTruthy();
      expect(getByText('5')).toBeTruthy();
      expect(getByText('Analyze My Bag')).toBeTruthy();
    });
  });

  it('navigates back when back button is pressed', async () => {
    const { getByText } = render(<DiscRecommendationsScreen />);

    await waitFor(() => {
      expect(getByText('Back')).toBeTruthy();
    });

    fireEvent.press(getByText('Back'));

    expect(mockRouterBack).toHaveBeenCalled();
  });

  it('calls getRecommendations when Analyze button is pressed', async () => {
    const { getByText } = render(<DiscRecommendationsScreen />);

    await waitFor(() => {
      expect(getByText('Analyze My Bag')).toBeTruthy();
    });

    fireEvent.press(getByText('Analyze My Bag'));

    expect(mockGetRecommendations).toHaveBeenCalledWith(3); // Default selection
  });

  it('allows selecting different recommendation counts', async () => {
    const { getByText } = render(<DiscRecommendationsScreen />);

    await waitFor(() => {
      expect(getByText('1')).toBeTruthy();
    });

    fireEvent.press(getByText('1'));
    fireEvent.press(getByText('Analyze My Bag'));

    expect(mockGetRecommendations).toHaveBeenCalledWith(1);
  });

  it('shows loading state when isLoading is true', async () => {
    mockHookState.isLoading = true;

    const { getByText } = render(<DiscRecommendationsScreen />);

    await waitFor(() => {
      expect(getByText('Analyzing your bag...')).toBeTruthy();
      expect(getByText(/AI is identifying gaps/)).toBeTruthy();
    });
  });

  it('shows error state when error is present', async () => {
    mockHookState.error = 'Failed to analyze bag';

    const { getByText } = render(<DiscRecommendationsScreen />);

    await waitFor(() => {
      expect(getByText('Something went wrong')).toBeTruthy();
      expect(getByText('Failed to analyze bag')).toBeTruthy();
      expect(getByText('Try Again')).toBeTruthy();
    });
  });

  it('calls reset when Try Again is pressed in error state', async () => {
    mockHookState.error = 'Failed to analyze bag';

    const { getByText } = render(<DiscRecommendationsScreen />);

    await waitFor(() => {
      expect(getByText('Try Again')).toBeTruthy();
    });

    fireEvent.press(getByText('Try Again'));

    expect(mockReset).toHaveBeenCalled();
  });

  it('shows results when result is present', async () => {
    mockHookState.result = mockResult;

    const { getByText, getByTestId } = render(<DiscRecommendationsScreen />);

    await waitFor(() => {
      expect(getByTestId('bag-analysis-card')).toBeTruthy();
      expect(getByText('Recommended Discs')).toBeTruthy();
      expect(getByTestId('disc-recommendation-card')).toBeTruthy();
      expect(getByText('New Analysis')).toBeTruthy();
    });
  });

  it('calls reset when New Analysis is pressed', async () => {
    mockHookState.result = mockResult;

    const { getByText } = render(<DiscRecommendationsScreen />);

    await waitFor(() => {
      expect(getByText('New Analysis')).toBeTruthy();
    });

    fireEvent.press(getByText('New Analysis'));

    expect(mockReset).toHaveBeenCalled();
  });

  it('opens purchase URL when buy button is pressed', async () => {
    mockHookState.result = mockResult;

    const { getByText } = render(<DiscRecommendationsScreen />);

    await waitFor(() => {
      expect(getByText('Buy')).toBeTruthy();
    });

    fireEvent.press(getByText('Buy'));

    await waitFor(() => {
      expect(Linking.canOpenURL).toHaveBeenCalledWith('https://example.com/destroyer');
      expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/destroyer');
    });
  });
});
