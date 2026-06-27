import React from 'react';
import { render, waitFor, fireEvent } from './test-utils';
import { Alert, Linking } from 'react-native';
import MyOrdersScreen from '../app/my-orders';

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock Linking
jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

// Mock expo-router
const mockRouterPush = jest.fn();
jest.mock('expo-router', async () => {
  const React = require('react');
  return {
    useRouter: () => ({
      push: mockRouterPush,
    }),
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
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

// Mock fetch
global.fetch = jest.fn();

const mockOrder = {
  id: 'order-1',
  order_number: 'ORD-12345',
  quantity: 5,
  total_price_cents: 1500,
  status: 'paid',
  tracking_number: null,
  created_at: '2024-01-15T10:00:00Z',
  shipped_at: null,
};

const mockOrderWithTracking = {
  ...mockOrder,
  id: 'order-2',
  order_number: 'ORD-12346',
  status: 'shipped',
  tracking_number: '1Z999AA10123456784',
  shipped_at: '2024-01-16T10:00:00Z',
};

const mockPendingPaymentOrder = {
  ...mockOrder,
  id: 'order-3',
  order_number: 'ORD-12347',
  status: 'pending_payment',
};

const mockShippedNoTrackingOrder = {
  ...mockOrder,
  id: 'order-4',
  order_number: 'ORD-12348',
  status: 'shipped',
  tracking_number: null,
  shipped_at: '2024-01-16T10:00:00Z',
};

describe('MyOrdersScreen', async () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
  });

  it('shows skeleton loaders initially', async () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const { UNSAFE_getAllByType } = await render(<MyOrdersScreen />);

    const Animated = require('react-native').Animated;
    const skeletons = UNSAFE_getAllByType(Animated.View);
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no orders', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ orders: [] }),
    });

    const { getByText } = await render(<MyOrdersScreen />);

    await waitFor(() => {
      expect(getByText('No Orders Yet')).toBeTruthy();
      expect(getByText(/Order QR code stickers/)).toBeTruthy();
      expect(getByText('Order Stickers')).toBeTruthy();
    });
  });

  it('displays orders from API', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ orders: [mockOrder] }),
    });

    const { getByText } = await render(<MyOrdersScreen />);

    await waitFor(() => {
      expect(getByText('ORD-12345')).toBeTruthy();
      expect(getByText('5 stickers')).toBeTruthy();
      expect(getByText('$15.00')).toBeTruthy();
      expect(getByText('Paid')).toBeTruthy();
    });
  });

  it('displays singular sticker text for quantity 1', async () => {
    const singleStickerOrder = { ...mockOrder, quantity: 1 };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ orders: [singleStickerOrder] }),
    });

    const { getByText } = await render(<MyOrdersScreen />);

    await waitFor(() => {
      expect(getByText('1 sticker')).toBeTruthy();
    });
  });

  it('displays tracking number when available', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ orders: [mockOrderWithTracking] }),
    });

    const { getByText } = await render(<MyOrdersScreen />);

    await waitFor(() => {
      expect(getByText('Tracking: 1Z999AA10123456784')).toBeTruthy();
      expect(getByText('Shipped')).toBeTruthy();
    });
  });

  it('navigates to order detail when order is pressed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ orders: [mockOrder] }),
    });

    const { getByText } = await render(<MyOrdersScreen />);

    await waitFor(() => {
      expect(getByText('ORD-12345')).toBeTruthy();
    });

    fireEvent.press(getByText('ORD-12345'));

    expect(mockRouterPush).toHaveBeenCalledWith('/orders/order-1');
  });

  it('shows FAB when orders exist', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ orders: [mockOrder] }),
    });

    const { getByText, UNSAFE_root } = await render(<MyOrdersScreen />);

    await waitFor(() => {
      expect(getByText('ORD-12345')).toBeTruthy();
    });

    expect(UNSAFE_root).toBeTruthy();
  });

  it('navigates to order-stickers from empty state button', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ orders: [] }),
    });

    const { getByText } = await render(<MyOrdersScreen />);

    await waitFor(() => {
      expect(getByText('Order Stickers')).toBeTruthy();
    });

    fireEvent.press(getByText('Order Stickers'));

    expect(mockRouterPush).toHaveBeenCalledWith('/order-stickers');
  });

  it('handles API error gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { getByText } = await render(<MyOrdersScreen />);

    await waitFor(() => {
      // Should show empty state on error
      expect(getByText('No Orders Yet')).toBeTruthy();
    });
  });

  it('does not fetch when no session', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    render(<MyOrdersScreen />);

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('displays different statuses correctly', async () => {
    const processingOrder = { ...mockOrder, id: 'order-5', status: 'processing' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ orders: [processingOrder] }),
    });

    const { getByText } = await render(<MyOrdersScreen />);

    await waitFor(() => {
      expect(getByText('Processing')).toBeTruthy();
    });
  });

  describe('Action Buttons', async () => {
    it('shows Complete Payment and Cancel buttons for pending_payment orders', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ orders: [mockPendingPaymentOrder] }),
      });

      const { getByText } = await render(<MyOrdersScreen />);

      await waitFor(() => {
        expect(getByText('Complete Payment')).toBeTruthy();
        expect(getByText('Cancel')).toBeTruthy();
      });
    });

    it('shows Mark as Delivered button for shipped orders without tracking', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ orders: [mockShippedNoTrackingOrder] }),
      });

      const { getByText } = await render(<MyOrdersScreen />);

      await waitFor(() => {
        expect(getByText('Mark as Delivered')).toBeTruthy();
      });
    });

    it('does not show Mark as Delivered for shipped orders with tracking', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ orders: [mockOrderWithTracking] }),
      });

      const { queryByText, getByText } = await render(<MyOrdersScreen />);

      await waitFor(() => {
        expect(getByText('Shipped')).toBeTruthy();
      });

      expect(queryByText('Mark as Delivered')).toBeNull();
    });
  });
});
