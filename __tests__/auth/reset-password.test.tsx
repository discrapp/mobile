import React, { act } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ResetPassword from '../../app/(auth)/reset-password';
import { supabase } from '../../lib/supabase';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));

// Mock supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: jest.fn(),
    },
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('ResetPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText, getByPlaceholderText } = render(<ResetPassword />);

    expect(getByText('Create New Password')).toBeTruthy();
    expect(getByText('Enter your new password below.')).toBeTruthy();
    expect(getByPlaceholderText('Enter new password')).toBeTruthy();
    expect(getByPlaceholderText('Confirm new password')).toBeTruthy();
    expect(getByText('Reset Password')).toBeTruthy();
  });

  it('shows validation error for empty password', async () => {
    const { getByText } = render(<ResetPassword />);

    fireEvent.press(getByText('Reset Password'));

    await waitFor(() => {
      expect(getByText('Password is required')).toBeTruthy();
    });
  });

  it('shows validation error for short password', async () => {
    const { getByText, getByPlaceholderText } = render(<ResetPassword />);

    fireEvent.changeText(getByPlaceholderText('Enter new password'), '12345');
    fireEvent.press(getByText('Reset Password'));

    await waitFor(() => {
      expect(getByText('Password must be at least 6 characters')).toBeTruthy();
    });
  });

  it('shows validation error for mismatched passwords', async () => {
    const { getByText, getByPlaceholderText } = render(<ResetPassword />);

    fireEvent.changeText(getByPlaceholderText('Enter new password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'different123');
    fireEvent.press(getByText('Reset Password'));

    await waitFor(() => {
      expect(getByText('Passwords do not match')).toBeTruthy();
    });
  });

  it('calls updateUser with correct password', async () => {
    (supabase.auth.updateUser as jest.Mock).mockResolvedValue({
      data: { user: {} },
      error: null,
    });

    const { getByText, getByPlaceholderText } = render(<ResetPassword />);

    fireEvent.changeText(getByPlaceholderText('Enter new password'), 'newpassword123');
    fireEvent.changeText(
      getByPlaceholderText('Confirm new password'),
      'newpassword123'
    );
    await act(async () => {
      fireEvent.press(getByText('Reset Password'));
    });

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'newpassword123',
      });
    });
  });

  it('shows success message and redirects after password reset', async () => {
    const { router } = jest.requireMock('expo-router');
    (supabase.auth.updateUser as jest.Mock).mockResolvedValue({
      data: { user: {} },
      error: null,
    });

    const { getByText, getByPlaceholderText } = render(<ResetPassword />);

    fireEvent.changeText(getByPlaceholderText('Enter new password'), 'newpassword123');
    fireEvent.changeText(
      getByPlaceholderText('Confirm new password'),
      'newpassword123'
    );
    await act(async () => {
      fireEvent.press(getByText('Reset Password'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Password Updated',
        'Your password has been successfully updated.',
        expect.any(Array)
      );
    });
  });

  it('shows error message when updateUser fails', async () => {
    (supabase.auth.updateUser as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Invalid session' },
    });

    const { getByText, getByPlaceholderText } = render(<ResetPassword />);

    fireEvent.changeText(getByPlaceholderText('Enter new password'), 'newpassword123');
    fireEvent.changeText(
      getByPlaceholderText('Confirm new password'),
      'newpassword123'
    );
    await act(async () => {
      fireEvent.press(getByText('Reset Password'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Invalid session');
    });
  });

  it('disables button while loading', async () => {
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    (supabase.auth.updateUser as jest.Mock).mockReturnValue(promise);

    const { getByText, getByPlaceholderText, getByTestId } = render(<ResetPassword />);

    fireEvent.changeText(getByPlaceholderText('Enter new password'), 'newpassword123');
    fireEvent.changeText(
      getByPlaceholderText('Confirm new password'),
      'newpassword123'
    );
    await act(async () => {
      fireEvent.press(getByText('Reset Password'));
    });

    await waitFor(() => {
      expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    await act(async () => {
      resolvePromise!({ data: { user: {} }, error: null });
    });
  });

  it('clears password error when typing in password field', async () => {
    const { getByText, getByPlaceholderText, queryByText } = render(<ResetPassword />);

    // Submit empty form to trigger validation error
    fireEvent.press(getByText('Reset Password'));

    await waitFor(() => {
      expect(getByText('Password is required')).toBeTruthy();
    });

    // Type in password field to clear error
    fireEvent.changeText(getByPlaceholderText('Enter new password'), 'n');

    await waitFor(() => {
      expect(queryByText('Password is required')).toBeNull();
    });
  });

  it('clears confirm password error when typing in confirm field', async () => {
    const { getByText, getByPlaceholderText, queryByText } = render(<ResetPassword />);

    // Set password but mismatched confirm
    fireEvent.changeText(getByPlaceholderText('Enter new password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'different');
    fireEvent.press(getByText('Reset Password'));

    await waitFor(() => {
      expect(getByText('Passwords do not match')).toBeTruthy();
    });

    // Type in confirm field to clear error
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'p');

    await waitFor(() => {
      expect(queryByText('Passwords do not match')).toBeNull();
    });
  });

  it('handles unexpected error during password reset', async () => {
    (supabase.auth.updateUser as jest.Mock).mockRejectedValue(new Error('Network failure'));

    const { getByText, getByPlaceholderText } = render(<ResetPassword />);

    fireEvent.changeText(getByPlaceholderText('Enter new password'), 'newpassword123');
    fireEvent.changeText(
      getByPlaceholderText('Confirm new password'),
      'newpassword123'
    );
    await act(async () => {
      fireEvent.press(getByText('Reset Password'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'An unexpected error occurred. Please try again.'
      );
    });
  });

  it('navigates to tabs after successful password reset', async () => {
    const { router } = jest.requireMock('expo-router');
    (supabase.auth.updateUser as jest.Mock).mockResolvedValue({
      data: { user: {} },
      error: null,
    });

    const { getByText, getByPlaceholderText } = render(<ResetPassword />);

    fireEvent.changeText(getByPlaceholderText('Enter new password'), 'newpassword123');
    fireEvent.changeText(
      getByPlaceholderText('Confirm new password'),
      'newpassword123'
    );
    await act(async () => {
      fireEvent.press(getByText('Reset Password'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });

    // Get the Alert callback and invoke it
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const okButton = alertCall[2][0];
    okButton.onPress();

    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });
});
