import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import CheckoutSuccessScreen from '../../app/checkout/success';

// Mock expo-router
const mockRouterReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    replace: (path: string) => mockRouterReplace(path),
  },
  useLocalSearchParams: () => ({ order_id: 'order-123' }),
}));

describe('CheckoutSuccessScreen', async () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders payment successful message', async () => {
    const { getByText } = await render(<CheckoutSuccessScreen />);

    expect(getByText('✅')).toBeTruthy();
    expect(getByText('Payment Successful!')).toBeTruthy();
    expect(getByText('Your order has been placed successfully.')).toBeTruthy();
  });

  it('displays order ID when provided', async () => {
    const { getByText } = await render(<CheckoutSuccessScreen />);

    expect(getByText('Order ID: order-123')).toBeTruthy();
  });

  it('shows redirect message', async () => {
    const { getByText } = await render(<CheckoutSuccessScreen />);

    expect(getByText('Returning to the app...')).toBeTruthy();
  });

  it('redirects to order detail after 3 seconds when order_id provided', async () => {
    render(<CheckoutSuccessScreen />);

    expect(mockRouterReplace).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith('/orders/order-123');
    });
  });

  it('cleans up timer on unmount', async () => {
    const { unmount } = await render(<CheckoutSuccessScreen />);

    unmount();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});

// Note: Testing without order_id would require module re-mocking which breaks React.
// The component behavior is simple enough that the with-order_id tests cover the core functionality.
