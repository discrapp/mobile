import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import OrderDetailScreen from '../../app/orders/[id]';

// Mock expo-router
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({
      push: mockRouterPush,
    }),
    useLocalSearchParams: () => ({ id: 'order-123' }),
    Stack: {
      Screen: ({ options }: { options: { title: string } }) => null,
    },
    useFocusEffect: (callback: React.EffectCallback) => {
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

// Mock Linking
jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

// Mock fetch
global.fetch = jest.fn();

const mockOrder = {
  id: 'order-123',
  order_number: 'ORD-12345',
  quantity: 5,
  unit_price_cents: 300,
  total_price_cents: 1500,
  status: 'paid',
  tracking_number: null,
  created_at: '2024-01-15T10:00:00Z',
  paid_at: '2024-01-15T10:05:00Z',
  printed_at: null,
  shipped_at: null,
  shipping_address: {
    name: 'John Doe',
    street_address: '123 Main St',
    street_address_2: 'Apt 4',
    city: 'Austin',
    state: 'TX',
    postal_code: '78701',
    country: 'USA',
  },
};

const mockShippedOrder = {
  ...mockOrder,
  status: 'shipped',
  tracking_number: '1Z999AA10123456784',
  printed_at: '2024-01-16T10:00:00Z',
  shipped_at: '2024-01-17T10:00:00Z',
};

describe('OrderDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
  });

  it('shows loading indicator initially', async () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const { UNSAFE_getAllByType } = render(<OrderDetailScreen />);

    const ActivityIndicator = require('react-native').ActivityIndicator;
    const indicators = UNSAFE_getAllByType(ActivityIndicator);
    expect(indicators.length).toBeGreaterThan(0);
  });

  it('displays order details from API', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ order: mockOrder }),
    });

    const { getByText, getAllByText } = render(<OrderDetailScreen />);

    await waitFor(() => {
      // "Order Placed" appears in both status badge and timeline
      expect(getAllByText('Order Placed').length).toBeGreaterThan(0);
      expect(getByText('ORD-12345')).toBeTruthy();
      expect(getByText('5 stickers')).toBeTruthy();
      // Total price may appear in multiple places
      expect(getAllByText('$15.00').length).toBeGreaterThan(0);
    });
  });

  it('displays shipping address', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ order: mockOrder }),
    });

    const { getByText } = render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('123 Main St')).toBeTruthy();
      expect(getByText('Apt 4')).toBeTruthy();
      expect(getByText('Austin, TX 78701')).toBeTruthy();
    });
  });

  it('displays tracking information when available', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ order: mockShippedOrder }),
    });

    const { getByText, getAllByText } = render(<OrderDetailScreen />);

    await waitFor(() => {
      // "Shipped" appears in both status badge and timeline
      expect(getAllByText('Shipped').length).toBeGreaterThan(0);
      expect(getByText('1Z999AA10123456784')).toBeTruthy();
      expect(getByText('Tap to track your package')).toBeTruthy();
    });
  });

  it('opens tracking URL when tracking card is pressed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ order: mockShippedOrder }),
    });

    const { getByText } = render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(getByText('1Z999AA10123456784')).toBeTruthy();
    });

    fireEvent.press(getByText('Tap to track your package'));

    await waitFor(() => {
      expect(Linking.canOpenURL).toHaveBeenCalled();
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining('ups.com')
      );
    });
  });

  it('shows error state when order not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Order not found' }),
    });

    const { getByText } = render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(getByText('Order not found')).toBeTruthy();
    });
  });

  it('displays order progress timeline', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ order: mockOrder }),
    });

    const { getByText, getAllByText } = render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(getByText('Order Progress')).toBeTruthy();
      // "Order Placed" appears in both status badge and timeline
      expect(getAllByText('Order Placed').length).toBeGreaterThan(0);
      expect(getByText('Processing')).toBeTruthy();
      expect(getByText('Printed')).toBeTruthy();
      expect(getByText('Delivered')).toBeTruthy();
    });
  });

  it('displays help section with email link', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ order: mockOrder }),
    });

    const { getByText } = render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(getByText('support@discrapp.com')).toBeTruthy();
    });
  });

  it('opens email when support link is pressed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ order: mockOrder }),
    });

    const { getByText } = render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(getByText('support@discrapp.com')).toBeTruthy();
    });

    fireEvent.press(getByText('support@discrapp.com'));

    expect(Linking.openURL).toHaveBeenCalledWith('mailto:support@discrapp.com');
  });

  it('does not fetch when no session', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('displays FREE shipping text', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ order: mockOrder }),
    });

    const { getByText } = render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(getByText('FREE')).toBeTruthy();
    });
  });

  it('opens USPS tracking URL for USPS tracking number', async () => {
    const uspsOrder = {
      ...mockOrder,
      status: 'shipped',
      tracking_number: '92001901755477000044975869',
      shipped_at: '2024-01-17T10:00:00Z',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ order: uspsOrder }),
    });

    const { getByText } = render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(getByText('92001901755477000044975869')).toBeTruthy();
    });

    fireEvent.press(getByText('Tap to track your package'));

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining('usps.com')
      );
    });
  });

  it('opens FedEx tracking URL for FedEx tracking number', async () => {
    const fedexOrder = {
      ...mockOrder,
      status: 'shipped',
      tracking_number: '123456789012',
      shipped_at: '2024-01-17T10:00:00Z',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ order: fedexOrder }),
    });

    const { getByText } = render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(getByText('123456789012')).toBeTruthy();
    });

    fireEvent.press(getByText('Tap to track your package'));

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining('fedex.com')
      );
    });
  });

  it('defaults to USPS for unknown tracking number format', async () => {
    const unknownOrder = {
      ...mockOrder,
      status: 'shipped',
      tracking_number: 'ABCD1234',
      shipped_at: '2024-01-17T10:00:00Z',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ order: unknownOrder }),
    });

    const { getByText } = render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(getByText('ABCD1234')).toBeTruthy();
    });

    fireEvent.press(getByText('Tap to track your package'));

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining('usps.com')
      );
    });
  });
});
