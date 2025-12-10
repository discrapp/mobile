import React, { act } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SignIn from '../../app/(auth)/sign-in';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock expo-web-browser
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

// Mock expo-auth-session
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'exp://localhost:8081'),
}));

// Mock useAuth
const mockSignIn = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
  }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('SignIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText, getByPlaceholderText } = render(<SignIn />);

    expect(getByText('AceBack')).toBeTruthy();
    expect(getByText('Welcome Back')).toBeTruthy();
    expect(getByText('Sign in to continue')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('shows validation error for empty email', async () => {
    const { getByText, getByPlaceholderText } = render(<SignIn />);

    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Email is required')).toBeTruthy();
    });
  });

  it('shows validation error for invalid email format', async () => {
    const { getByText, getByPlaceholderText } = render(<SignIn />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'invalid-email');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Please enter a valid email')).toBeTruthy();
    });
  });

  it('shows validation error for empty password', async () => {
    const { getByText, getByPlaceholderText } = render(<SignIn />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Password is required')).toBeTruthy();
    });
  });

  it('calls signIn with correct credentials', async () => {
    mockSignIn.mockResolvedValue({ error: null });

    const { getByText, getByPlaceholderText } = render(<SignIn />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    await act(async () => {
      fireEvent.press(getByText('Sign In'));
    });

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('navigates to tabs on successful sign in', async () => {
    const { router } = require('expo-router');
    mockSignIn.mockResolvedValue({ error: null });

    const { getByText, getByPlaceholderText } = render(<SignIn />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    await act(async () => {
      fireEvent.press(getByText('Sign In'));
    });

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('shows error alert on sign in failure', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } });

    const { getByText, getByPlaceholderText } = render(<SignIn />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'wrongpassword');
    await act(async () => {
      fireEvent.press(getByText('Sign In'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Sign In Error', 'Invalid credentials');
    });
  });

  it('shows error alert on unexpected error', async () => {
    mockSignIn.mockRejectedValue(new Error('Network error'));

    const { getByText, getByPlaceholderText } = render(<SignIn />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    await act(async () => {
      fireEvent.press(getByText('Sign In'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'An unexpected error occurred');
    });
  });

  it('clears email error when typing', async () => {
    const { getByText, getByPlaceholderText, queryByText } = render(<SignIn />);

    // Trigger validation error
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Email is required')).toBeTruthy();
    });

    // Type in email field
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 't');

    await waitFor(() => {
      expect(queryByText('Email is required')).toBeNull();
    });
  });

  it('clears password error when typing', async () => {
    const { getByText, getByPlaceholderText, queryByText } = render(<SignIn />);

    // Fill email first
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Password is required')).toBeTruthy();
    });

    // Type in password field
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'p');

    await waitFor(() => {
      expect(queryByText('Password is required')).toBeNull();
    });
  });

  it('has forgot password link', () => {
    const { getByText } = render(<SignIn />);
    expect(getByText('Forgot password?')).toBeTruthy();
  });

  it('has sign up link', () => {
    const { getByText } = render(<SignIn />);
    expect(getByText("Don't have an account?")).toBeTruthy();
    expect(getByText('Sign Up')).toBeTruthy();
  });

});
