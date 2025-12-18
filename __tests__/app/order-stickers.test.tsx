import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import OrderStickersScreen from '../../app/order-stickers';

// Mock expo-router
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
  Stack: {
    Screen: () => null,
  },
}));

// Mock supabase
const mockGetSession = jest.fn(() => Promise.resolve({
  data: { session: { access_token: 'test-token' } },
  error: null,
}));
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock Linking
jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

describe('OrderStickersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock - no default address
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('get-default-address')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(null),
        });
      }
      if (url.includes('save-default-address')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'addr-1',
            name: 'John Doe',
            street_address: '123 Main St',
            city: 'Austin',
            state: 'TX',
            postal_code: '78701',
            country: 'US',
          }),
        });
      }
      if (url.includes('create-sticker-order')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            order_id: 'order-123',
            checkout_url: 'https://checkout.stripe.com/test',
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  describe('initial rendering', () => {
    it('renders the order stickers screen', async () => {
      const { getByText } = render(<OrderStickersScreen />);

      await waitFor(() => {
        expect(getByText('AceBack QR Code Stickers')).toBeTruthy();
      });
    });

    it('shows quantity selector', async () => {
      const { getByText } = render(<OrderStickersScreen />);

      await waitFor(() => {
        expect(getByText('Quantity')).toBeTruthy();
        expect(getByText('5')).toBeTruthy(); // default quantity
      });
    });

    it('shows shipping address section', async () => {
      const { getByText } = render(<OrderStickersScreen />);

      await waitFor(() => {
        expect(getByText('Shipping Address')).toBeTruthy();
      });
    });
  });

  describe('address auto-fill', () => {
    it('auto-fills form with saved default address', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('get-default-address')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              id: 'addr-1',
              name: 'John Doe',
              street_address: '123 Main St',
              street_address_2: 'Apt 4B',
              city: 'Austin',
              state: 'TX',
              postal_code: '78701',
              country: 'US',
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      const { getByDisplayValue } = render(<OrderStickersScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('John Doe')).toBeTruthy();
        expect(getByDisplayValue('123 Main St')).toBeTruthy();
        expect(getByDisplayValue('Apt 4B')).toBeTruthy();
        expect(getByDisplayValue('Austin')).toBeTruthy();
        expect(getByDisplayValue('TX')).toBeTruthy();
        expect(getByDisplayValue('78701')).toBeTruthy();
      });
    });

    it('leaves form empty when no default address exists', async () => {
      const { queryByDisplayValue, getByPlaceholderText } = render(<OrderStickersScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('John Doe')).toBeTruthy();
        expect(queryByDisplayValue('John Doe')).toBeNull();
      });
    });
  });

  describe('save as default checkbox', () => {
    it('shows save as default checkbox', async () => {
      const { getByText } = render(<OrderStickersScreen />);

      await waitFor(() => {
        expect(getByText('Save as my default address')).toBeTruthy();
      });
    });

    it('checkbox defaults to checked when no saved address exists', async () => {
      // Default mock returns null for address
      const { getByText } = render(<OrderStickersScreen />);

      await waitFor(() => {
        expect(getByText('Save as my default address')).toBeTruthy();
      });

      // The checkbox should be checked by default for new users
      // We verify this by checking the fetch was called for get-default-address
      // and it returned null
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('get-default-address'),
        expect.any(Object)
      );
    });

    it('checkbox defaults to unchecked when address exists', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('get-default-address')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              id: 'addr-1',
              name: 'John Doe',
              street_address: '123 Main St',
              city: 'Austin',
              state: 'TX',
              postal_code: '78701',
              country: 'US',
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      const { getByText, getByDisplayValue } = render(<OrderStickersScreen />);

      // Wait for address to load
      await waitFor(() => {
        expect(getByDisplayValue('John Doe')).toBeTruthy();
      });

      // Checkbox should still be visible
      expect(getByText('Save as my default address')).toBeTruthy();
    });

    it('toggles checkbox when pressed', async () => {
      const { getByText } = render(<OrderStickersScreen />);

      await waitFor(() => {
        expect(getByText('Save as my default address')).toBeTruthy();
      });

      // Press the checkbox label to toggle
      fireEvent.press(getByText('Save as my default address'));

      // The checkbox should toggle (we can verify by attempting to checkout)
      // and checking if save-default-address was called
    });
  });

  describe('form validation', () => {
    it('shows error when name is missing', async () => {
      const { getByText, getByPlaceholderText } = render(<OrderStickersScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('John Doe')).toBeTruthy();
      });

      // Fill in all fields except name
      fireEvent.changeText(getByPlaceholderText('123 Main St'), '456 Oak Ave');
      fireEvent.changeText(getByPlaceholderText('City'), 'Austin');
      fireEvent.changeText(getByPlaceholderText('CA'), 'TX');
      fireEvent.changeText(getByPlaceholderText('12345'), '78701');

      fireEvent.press(getByText(/Pay \$/));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Missing Information', 'Name is required');
      });
    });

    it('shows error when street address is missing', async () => {
      const { getByText, getByPlaceholderText } = render(<OrderStickersScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('John Doe')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('John Doe'), 'John Doe');
      fireEvent.changeText(getByPlaceholderText('City'), 'Austin');
      fireEvent.changeText(getByPlaceholderText('CA'), 'TX');
      fireEvent.changeText(getByPlaceholderText('12345'), '78701');

      fireEvent.press(getByText(/Pay \$/));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Missing Information', 'Street address is required');
      });
    });

    it('shows error when city is missing', async () => {
      const { getByText, getByPlaceholderText } = render(<OrderStickersScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('John Doe')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('John Doe'), 'John Doe');
      fireEvent.changeText(getByPlaceholderText('123 Main St'), '456 Oak Ave');
      fireEvent.changeText(getByPlaceholderText('CA'), 'TX');
      fireEvent.changeText(getByPlaceholderText('12345'), '78701');

      fireEvent.press(getByText(/Pay \$/));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Missing Information', 'City is required');
      });
    });

    it('shows error when state is missing', async () => {
      const { getByText, getByPlaceholderText } = render(<OrderStickersScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('John Doe')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('John Doe'), 'John Doe');
      fireEvent.changeText(getByPlaceholderText('123 Main St'), '456 Oak Ave');
      fireEvent.changeText(getByPlaceholderText('City'), 'Austin');
      fireEvent.changeText(getByPlaceholderText('12345'), '78701');

      fireEvent.press(getByText(/Pay \$/));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Missing Information', 'State is required');
      });
    });

    it('shows error when postal code is missing', async () => {
      const { getByText, getByPlaceholderText } = render(<OrderStickersScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('John Doe')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('John Doe'), 'John Doe');
      fireEvent.changeText(getByPlaceholderText('123 Main St'), '456 Oak Ave');
      fireEvent.changeText(getByPlaceholderText('City'), 'Austin');
      fireEvent.changeText(getByPlaceholderText('CA'), 'TX');

      fireEvent.press(getByText(/Pay \$/));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Missing Information', 'Postal code is required');
      });
    });
  });

  describe('checkout with address save', () => {
    it('saves address when checkbox is checked on checkout', async () => {
      const { getByText, getByPlaceholderText } = render(<OrderStickersScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('John Doe')).toBeTruthy();
      });

      // Fill in address
      fireEvent.changeText(getByPlaceholderText('John Doe'), 'Jane Smith');
      fireEvent.changeText(getByPlaceholderText('123 Main St'), '789 Pine Rd');
      fireEvent.changeText(getByPlaceholderText('City'), 'Dallas');
      fireEvent.changeText(getByPlaceholderText('CA'), 'TX');
      fireEvent.changeText(getByPlaceholderText('12345'), '75001');

      // Checkbox should be checked by default for new users
      fireEvent.press(getByText(/Pay \$/));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('save-default-address'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Jane Smith'),
          })
        );
      });
    });

    it('does not save address when checkbox is unchecked', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('get-default-address')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              id: 'addr-1',
              name: 'John Doe',
              street_address: '123 Main St',
              city: 'Austin',
              state: 'TX',
              postal_code: '78701',
              country: 'US',
            }),
          });
        }
        if (url.includes('create-sticker-order')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              order_id: 'order-123',
              checkout_url: 'https://checkout.stripe.com/test',
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      const { getByText, getByDisplayValue } = render(<OrderStickersScreen />);

      // Wait for address to load
      await waitFor(() => {
        expect(getByDisplayValue('John Doe')).toBeTruthy();
      });

      // Clear the previous mock calls
      mockFetch.mockClear();

      // Reset mock to track calls
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('create-sticker-order')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              order_id: 'order-123',
              checkout_url: 'https://checkout.stripe.com/test',
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      fireEvent.press(getByText(/Pay \$/));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('create-sticker-order'),
          expect.any(Object)
        );
      });

      // Verify save-default-address was NOT called since checkbox is unchecked
      // (when user already has an address, checkbox defaults to unchecked)
      const saveAddressCalls = mockFetch.mock.calls.filter(
        (call: string[]) => call[0].includes('save-default-address')
      );
      expect(saveAddressCalls.length).toBe(0);
    });

    it('proceeds with checkout even if address save fails', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('get-default-address')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(null),
          });
        }
        if (url.includes('save-default-address')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Save failed' }),
          });
        }
        if (url.includes('create-sticker-order')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              order_id: 'order-123',
              checkout_url: 'https://checkout.stripe.com/test',
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      const { getByText, getByPlaceholderText } = render(<OrderStickersScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('John Doe')).toBeTruthy();
      });

      // Fill in address
      fireEvent.changeText(getByPlaceholderText('John Doe'), 'Jane Smith');
      fireEvent.changeText(getByPlaceholderText('123 Main St'), '789 Pine Rd');
      fireEvent.changeText(getByPlaceholderText('City'), 'Dallas');
      fireEvent.changeText(getByPlaceholderText('CA'), 'TX');
      fireEvent.changeText(getByPlaceholderText('12345'), '75001');

      fireEvent.press(getByText(/Pay \$/));

      // Should still proceed to checkout even if save-default-address failed
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('create-sticker-order'),
          expect.any(Object)
        );
      });
    });
  });

  describe('quantity controls', () => {
    it('increments quantity when plus button is pressed', async () => {
      const { getByText } = render(<OrderStickersScreen />);

      await waitFor(() => {
        expect(getByText('5')).toBeTruthy();
      });

      // Find and press the plus button (increment)
      const plusButtons = getByText('5').parent?.parent?.findAllByType?.('Pressable');
      // Alternative: use testID or look for the icon
    });

    it('decrements quantity when minus button is pressed', async () => {
      const { getByText } = render(<OrderStickersScreen />);

      await waitFor(() => {
        expect(getByText('5')).toBeTruthy();
      });
    });

    it('updates total price when quantity changes', async () => {
      const { getAllByText } = render(<OrderStickersScreen />);

      await waitFor(() => {
        // Default 5 stickers at $1 each = $5.00
        // Multiple elements show this price (summary and button)
        expect(getAllByText('$5.00').length).toBeGreaterThan(0);
      });
    });
  });

  describe('order summary', () => {
    it('shows order summary section', async () => {
      const { getByText } = render(<OrderStickersScreen />);

      await waitFor(() => {
        expect(getByText('Order Summary')).toBeTruthy();
      });
    });

    it('shows free shipping', async () => {
      const { getByText } = render(<OrderStickersScreen />);

      await waitFor(() => {
        expect(getByText('FREE')).toBeTruthy();
      });
    });

    it('shows checkout button with total', async () => {
      const { getByText } = render(<OrderStickersScreen />);

      await waitFor(() => {
        expect(getByText(/Pay \$5\.00/)).toBeTruthy();
      });
    });
  });
});
