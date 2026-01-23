import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DiscRecommendationCard from '../../components/DiscRecommendationCard';
import { DiscRecommendation } from '@/hooks/useDiscRecommendations';

const mockRecommendation: DiscRecommendation = {
  disc: {
    id: 'disc-123',
    manufacturer: 'Innova',
    mold: 'Destroyer',
    category: 'Distance Driver',
    stability: 'Overstable',
    flight_numbers: {
      speed: 12,
      glide: 5,
      turn: -1,
      fade: 3,
    },
  },
  reason: 'This disc fills the high-speed overstable slot in your bag',
  gap_type: 'speed_range',
  priority: 1,
  purchase_url: 'https://example.com/destroyer',
};

describe('DiscRecommendationCard', () => {
  const mockOnBuyPress = jest.fn();
  const mockOnDismissPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders disc information correctly', () => {
    const { getByText } = render(
      <DiscRecommendationCard
        recommendation={mockRecommendation}
        isDark={false}
        onBuyPress={mockOnBuyPress}
      />
    );

    expect(getByText('Destroyer')).toBeTruthy();
    expect(getByText('Innova')).toBeTruthy();
    expect(getByText('Distance Driver')).toBeTruthy();
  });

  it('renders flight numbers', () => {
    const { getByText } = render(
      <DiscRecommendationCard
        recommendation={mockRecommendation}
        isDark={false}
        onBuyPress={mockOnBuyPress}
      />
    );

    expect(getByText('12')).toBeTruthy(); // Speed
    expect(getByText('5')).toBeTruthy(); // Glide
    expect(getByText('-1')).toBeTruthy(); // Turn
    expect(getByText('3')).toBeTruthy(); // Fade
    expect(getByText('Speed')).toBeTruthy();
    expect(getByText('Glide')).toBeTruthy();
    expect(getByText('Turn')).toBeTruthy();
    expect(getByText('Fade')).toBeTruthy();
  });

  it('renders priority badge', () => {
    const { getByText } = render(
      <DiscRecommendationCard
        recommendation={mockRecommendation}
        isDark={false}
        onBuyPress={mockOnBuyPress}
      />
    );

    expect(getByText('Top Pick')).toBeTruthy();
  });

  it('renders correct priority labels for different priorities', () => {
    const priorities = [
      { priority: 1, label: 'Top Pick' },
      { priority: 2, label: '2nd Pick' },
      { priority: 3, label: '3rd Pick' },
      { priority: 4, label: '4th Pick' },
      { priority: 5, label: '5th Pick' },
    ];

    priorities.forEach(({ priority, label }) => {
      const rec = { ...mockRecommendation, priority };
      const { getByText } = render(
        <DiscRecommendationCard
          recommendation={rec}
          isDark={false}
          onBuyPress={mockOnBuyPress}
        />
      );
      expect(getByText(label)).toBeTruthy();
    });
  });

  it('renders fallback priority label for unknown priority', () => {
    const rec = { ...mockRecommendation, priority: 10 };
    const { getByText } = render(
      <DiscRecommendationCard
        recommendation={rec}
        isDark={false}
        onBuyPress={mockOnBuyPress}
      />
    );
    expect(getByText('#10')).toBeTruthy();
  });

  it('renders gap type badge', () => {
    const { getByText } = render(
      <DiscRecommendationCard
        recommendation={mockRecommendation}
        isDark={false}
        onBuyPress={mockOnBuyPress}
      />
    );

    expect(getByText('Speed Gap')).toBeTruthy();
  });

  it('renders correct gap type labels', () => {
    const gapTypes = [
      { gap_type: 'speed_range', label: 'Speed Gap' },
      { gap_type: 'stability', label: 'Stability Gap' },
      { gap_type: 'category', label: 'Category Gap' },
    ];

    gapTypes.forEach(({ gap_type, label }) => {
      const rec = { ...mockRecommendation, gap_type: gap_type as 'speed_range' | 'stability' | 'category' };
      const { getByText } = render(
        <DiscRecommendationCard
          recommendation={rec}
          isDark={false}
          onBuyPress={mockOnBuyPress}
        />
      );
      expect(getByText(label)).toBeTruthy();
    });
  });

  it('renders stability badge', () => {
    const { getByText } = render(
      <DiscRecommendationCard
        recommendation={mockRecommendation}
        isDark={false}
        onBuyPress={mockOnBuyPress}
      />
    );

    expect(getByText('Overstable')).toBeTruthy();
  });

  it('renders different stability badges', () => {
    const stabilities = ['Understable', 'Stable', 'Overstable'];

    stabilities.forEach((stability) => {
      const rec = {
        ...mockRecommendation,
        disc: { ...mockRecommendation.disc, stability },
      };
      const { getByText } = render(
        <DiscRecommendationCard
          recommendation={rec}
          isDark={false}
          onBuyPress={mockOnBuyPress}
        />
      );
      expect(getByText(stability)).toBeTruthy();
    });
  });

  it('renders AI reason', () => {
    const { getByText } = render(
      <DiscRecommendationCard
        recommendation={mockRecommendation}
        isDark={false}
        onBuyPress={mockOnBuyPress}
      />
    );

    expect(getByText('This disc fills the high-speed overstable slot in your bag')).toBeTruthy();
  });

  it('renders buy button and handles press', () => {
    const { getByText } = render(
      <DiscRecommendationCard
        recommendation={mockRecommendation}
        isDark={false}
        onBuyPress={mockOnBuyPress}
      />
    );

    const buyButton = getByText('Buy on Infinite Discs');
    expect(buyButton).toBeTruthy();

    fireEvent.press(buyButton);
    expect(mockOnBuyPress).toHaveBeenCalledTimes(1);
  });

  it('does not render dismiss button when onDismissPress is not provided', () => {
    const { queryByText } = render(
      <DiscRecommendationCard
        recommendation={mockRecommendation}
        isDark={false}
        onBuyPress={mockOnBuyPress}
      />
    );

    expect(queryByText("Don't Show Again")).toBeNull();
  });

  it('renders dismiss button when onDismissPress is provided', () => {
    const { getByText } = render(
      <DiscRecommendationCard
        recommendation={mockRecommendation}
        isDark={false}
        onBuyPress={mockOnBuyPress}
        onDismissPress={mockOnDismissPress}
      />
    );

    expect(getByText("Don't Show Again")).toBeTruthy();
  });

  it('handles dismiss button press', () => {
    const { getByText } = render(
      <DiscRecommendationCard
        recommendation={mockRecommendation}
        isDark={false}
        onBuyPress={mockOnBuyPress}
        onDismissPress={mockOnDismissPress}
      />
    );

    fireEvent.press(getByText("Don't Show Again"));
    expect(mockOnDismissPress).toHaveBeenCalledTimes(1);
  });

  it('shows dismissing state when isDismissing is true', () => {
    const { getByText, queryByText } = render(
      <DiscRecommendationCard
        recommendation={mockRecommendation}
        isDark={false}
        onBuyPress={mockOnBuyPress}
        onDismissPress={mockOnDismissPress}
        isDismissing={true}
      />
    );

    expect(getByText('Dismissing...')).toBeTruthy();
    expect(queryByText("Don't Show Again")).toBeNull();
  });

  it('applies dark mode styles', () => {
    const { getByText } = render(
      <DiscRecommendationCard
        recommendation={mockRecommendation}
        isDark={true}
        onBuyPress={mockOnBuyPress}
        onDismissPress={mockOnDismissPress}
      />
    );

    // Just verify it renders without crashing in dark mode
    expect(getByText('Destroyer')).toBeTruthy();
    expect(getByText("Don't Show Again")).toBeTruthy();
  });

  it('handles disc without category', () => {
    const recWithoutCategory = {
      ...mockRecommendation,
      disc: {
        ...mockRecommendation.disc,
        category: undefined,
      },
    };

    const { getByText, queryByText } = render(
      <DiscRecommendationCard
        recommendation={recWithoutCategory}
        isDark={false}
        onBuyPress={mockOnBuyPress}
      />
    );

    expect(getByText('Destroyer')).toBeTruthy();
    expect(queryByText('Distance Driver')).toBeNull();
  });

  it('handles disc without stability', () => {
    const recWithoutStability = {
      ...mockRecommendation,
      disc: {
        ...mockRecommendation.disc,
        stability: undefined,
      },
    };

    const { getByText, queryByText } = render(
      <DiscRecommendationCard
        recommendation={recWithoutStability}
        isDark={false}
        onBuyPress={mockOnBuyPress}
      />
    );

    expect(getByText('Destroyer')).toBeTruthy();
    expect(queryByText('Overstable')).toBeNull();
    expect(queryByText('Understable')).toBeNull();
    expect(queryByText('Stable')).toBeNull();
  });

  it('handles disc without flight numbers', () => {
    const recWithoutFlightNumbers = {
      ...mockRecommendation,
      disc: {
        ...mockRecommendation.disc,
        flight_numbers: undefined,
      },
    };

    const { getByText, queryByText } = render(
      <DiscRecommendationCard
        recommendation={recWithoutFlightNumbers}
        isDark={false}
        onBuyPress={mockOnBuyPress}
      />
    );

    expect(getByText('Destroyer')).toBeTruthy();
    // Flight number labels should not be present
    expect(queryByText('Speed')).toBeNull();
    expect(queryByText('Glide')).toBeNull();
  });
});
