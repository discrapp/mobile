import React, { act } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ForgotPassword from '../../app/(auth)/forgot-password';
import { supabase } from '../../lib/supabase';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
  },
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: jest.fn(),
    },
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('ForgotPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText, getByPlaceholderText } = render(<ForgotPassword />);

    expect(getByText('Reset Password')).toBeTruthy();
    expect(
      getByText("Enter your email and we'll send you a link to reset your password.")
    ).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByText('Send Reset Link')).toBeTruthy();
  });

  it('shows validation error for empty email', async () => {
    const { getByText } = render(<ForgotPassword />);

    fireEvent.press(getByText('Send Reset Link'));

    await waitFor(() => {
      expect(getByText('Email is required')).toBeTruthy();
    });
  });

  it('shows validation error for invalid email format', async () => {
    const { getByText, getByPlaceholderText } = render(<ForgotPassword />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'invalid-email');
    fireEvent.press(getByText('Send Reset Link'));

    await waitFor(() => {
      expect(getByText('Please enter a valid email address')).toBeTruthy();
    });
  });

  it('calls resetPasswordForEmail with correct email', async () => {
    (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
      data: {},
      error: null,
    });

    const { getByText, getByPlaceholderText } = render(<ForgotPassword />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    await act(async () => {
      fireEvent.press(getByText('Send Reset Link'));
    });

    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          redirectTo: expect.any(String),
        })
      );
    });
  });

  it('shows success message after sending reset link', async () => {
    (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
      data: {},
      error: null,
    });

    const { getByText, getByPlaceholderText } = render(<ForgotPassword />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    await act(async () => {
      fireEvent.press(getByText('Send Reset Link'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Check Your Email',
        expect.stringContaining('test@example.com'),
        expect.any(Array)
      );
    });
  });

  it('shows error message when resetPasswordForEmail fails', async () => {
    (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'User not found' },
    });

    const { getByText, getByPlaceholderText } = render(<ForgotPassword />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    await act(async () => {
      fireEvent.press(getByText('Send Reset Link'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'User not found');
    });
  });

  it('disables button while loading', async () => {
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    (supabase.auth.resetPasswordForEmail as jest.Mock).mockReturnValue(promise);

    const { getByText, getByPlaceholderText, getByTestId } = render(<ForgotPassword />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    await act(async () => {
      fireEvent.press(getByText('Send Reset Link'));
    });

    // Button should show loading state
    await waitFor(() => {
      expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    // Resolve the promise
    await act(async () => {
      resolvePromise!({ data: {}, error: null });
    });
  });

  it('has a back to sign in link', () => {
    const { getByText } = render(<ForgotPassword />);

    expect(getByText('Back to Sign In')).toBeTruthy();
  });

  it('handles unexpected error with alert', async () => {
    (supabase.auth.resetPasswordForEmail as jest.Mock).mockRejectedValue(
      new Error('Network failure')
    );

    const { getByText, getByPlaceholderText } = render(<ForgotPassword />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    await act(async () => {
      fireEvent.press(getByText('Send Reset Link'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'An unexpected error occurred. Please try again.'
      );
    });
  });

  it('clears error when typing in email field', async () => {
    const { getByText, getByPlaceholderText, queryByText } = render(<ForgotPassword />);

    // First trigger an error
    fireEvent.press(getByText('Send Reset Link'));

    await waitFor(() => {
      expect(getByText('Email is required')).toBeTruthy();
    });

    // Now type in the email field
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 't');

    await waitFor(() => {
      expect(queryByText('Email is required')).toBeNull();
    });
  });

  it('navigates back when OK is pressed on success alert', async () => {
    const { router } = jest.requireMock('expo-router');
    (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
      data: {},
      error: null,
    });

    const { getByText, getByPlaceholderText } = render(<ForgotPassword />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    await act(async () => {
      fireEvent.press(getByText('Send Reset Link'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });

    // Get the Alert callback and invoke it
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const okButton = alertCall[2][0];
    okButton.onPress();

    expect(router.back).toHaveBeenCalled();
  });
});
