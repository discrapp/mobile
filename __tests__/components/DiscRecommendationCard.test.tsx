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

describe('DiscRecommendationCard', async () => {
  const mockOnBuyPress = jest.fn();
  const mockOnDismissPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders disc information correctly', async () => {
    const { getByText } = await render(
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

  it('renders flight numbers', async () => {
    const { getByText } = await render(
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

  it('renders priority badge', async () => {
    const { getByText } = await render(
      <DiscRecommendationCard
        recommendation={mockRecommendation}
        isDark={false}
        onBuyPress={mockOnBuyPress}
      />
    );

    expect(getByText('Top Pick')).toBeTruthy();
  });

  it('renders correct priority labels for different priorities', async () => {
    const priorities = [
      { priority: 1, label: 'Top Pick' },
      { priority: 2, label: '2nd Pick' },
      { priority: 3, label: '3rd Pick' },
      { priority: 4, label: '4th Pick' },
      { priority: 5, label: '5th Pick' },
    ];

    for (const { priority, label } of priorities) {
      const rec = { ...mockRecommendation, priority };
      const { getByText } = await render(
        <DiscRecommendationCard
          recommendation={rec}
          isDark={false}
          onBuyPress={mockOnBuyPress}
        />
      );
      expect(getByText(label)).toBeTruthy();
    }
  });

  it('renders fallback priority label for unknown priority', async () => {
    const rec = { ...mockRecommendation, priority: 10 };
    const { getByText } = await render(
      <DiscRecommendationCard
        recommendation={rec}
        isDark={false}
        onBuyPress={mockOnBuyPress}
      />
    );
    expect(getByText('#10')).toBeTruthy();
  });

  it('renders gap type badge', async () => {
    const { getByText } = await render(
      <DiscRecommendationCard
        recommendation={mockRecommendation}
        isDark={false}
        onBuyPress={mockOnBuyPress}
      />
    );

    expect(getByText('Speed Gap')).toBeTruthy();
  });

  it('renders correct gap type labels', async () => {
    const gapTypes = [
      { gap_type: 'speed_range', label: 'Speed Gap' },
      { gap_type: 'stability', label: 'Stability Gap' },
      { gap_type: 'category', label: 'Category Gap' },
    ];

    for (const { gap_type, label } of gapTypes) {
      const rec = { ...mockRecommendation, gap_type: gap_type as 'speed_range' | 'stability' | 'category' };
      const { getByText } = await render(
        <DiscRecommendationCard
          recommendation={rec}
          isDark={false}
          onBuyPress={mockOnBuyPress}
        />
      );
      expect(getByText(label)).toBeTruthy();
    }
  });

  it('renders stability badge', async () => {
    const { getByText } = await render(
      <DiscRecommendationCard
        recommendation={mockRecommendation}
        isDark={false}
        onBuyPress={mockOnBuyPress}
      />
    );

    expect(getByText('Overstable')).toBeTruthy();
  });

  it('renders different stability badges', async () => {
    const stabilities = ['Understable', 'Stable', 'Overstable'];

    for (const stability of stabilities) {
      const rec = {
        ...mockRecommendation,
        disc: { ...mockRecommendation.disc, stability },
      };
      const { getByText } = await render(
        <DiscRecommendationCard
          recommendation={rec}
          isDark={false}
          onBuyPress={mockOnBuyPress}
        />
      );
      expect(getByText(stability)).toBeTruthy();
    }
  });

  it('renders AI reason', async () => {
    const { getByText } = await render(
      <DiscRecommendationCard
        recommendation={mockRecommendation}
        isDark={false}
        onBuyPress={mockOnBuyPress}
      />
    );

    expect(getByText('This disc fills the high-speed overstable slot in your bag')).toBeTruthy();
  });

  it('renders buy button and handles press', async () => {
    const { getByText } = await render(
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

  it('does not render dismiss button when onDismissPress is not provided', async () => {
    const { queryByText } = await render(
      <DiscRecommendationCard
        recommendation={mockRecommendation}
        isDark={false}
        onBuyPress={mockOnBuyPress}
      />
    );

    expect(queryByText("Don't Show Again")).toBeNull();
  });

  it('renders dismiss button when onDismissPress is provided', async () => {
    const { getByText } = await render(
      <DiscRecommendationCard
        recommendation={mockRecommendation}
        isDark={false}
        onBuyPress={mockOnBuyPress}
        onDismissPress={mockOnDismissPress}
      />
    );

    expect(getByText("Don't Show Again")).toBeTruthy();
  });

  it('handles dismiss button press', async () => {
    const { getByText } = await render(
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

  it('shows dismissing state when isDismissing is true', async () => {
    const { getByText, queryByText } = await render(
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

  it('applies dark mode styles', async () => {
    const { getByText } = await render(
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

  it('handles disc without category', async () => {
    const recWithoutCategory = {
      ...mockRecommendation,
      disc: {
        ...mockRecommendation.disc,
        category: null,
      },
    };

    const { getByText, queryByText } = await render(
      <DiscRecommendationCard
        recommendation={recWithoutCategory}
        isDark={false}
        onBuyPress={mockOnBuyPress}
      />
    );

    expect(getByText('Destroyer')).toBeTruthy();
    expect(queryByText('Distance Driver')).toBeNull();
  });

  it('handles disc without stability', async () => {
    const recWithoutStability = {
      ...mockRecommendation,
      disc: {
        ...mockRecommendation.disc,
        stability: null,
      },
    };

    const { getByText, queryByText } = await render(
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

  it('handles disc without flight numbers', async () => {
    const recWithoutFlightNumbers = {
      ...mockRecommendation,
      disc: {
        ...mockRecommendation.disc,
        flight_numbers: null,
      },
    };

    const { getByText, queryByText } = await render(
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
