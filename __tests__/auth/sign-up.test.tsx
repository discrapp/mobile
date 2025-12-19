import React, { act } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SignUp from '../../app/(auth)/sign-up';

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
const mockSignUp = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    signUp: mockSignUp,
  }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

// Helper to get the button by text when there are multiple matches
const getButton = (getAllByText: (text: string) => any[], text: string) => {
  const elements = getAllByText(text);
  // The button is the second element (first is the title)
  return elements[elements.length - 1];
};

describe('SignUp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getAllByText, getByText, getByPlaceholderText } = render(<SignUp />);

    expect(getByText('Discr')).toBeTruthy();
    expect(getAllByText('Create Account').length).toBeGreaterThanOrEqual(1);
    expect(getByText('Sign up to get started')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Create a password (min 8 characters)')).toBeTruthy();
    expect(getByPlaceholderText('Confirm your password')).toBeTruthy();
  });

  it('shows validation error for empty email', async () => {
    const { getAllByText, getByText, getByPlaceholderText } = render(<SignUp />);

    fireEvent.changeText(getByPlaceholderText('Create a password (min 8 characters)'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    fireEvent.press(getButton(getAllByText, 'Create Account'));

    await waitFor(() => {
      expect(getByText('Email is required')).toBeTruthy();
    });
  });

  it('shows validation error for invalid email format', async () => {
    const { getAllByText, getByText, getByPlaceholderText } = render(<SignUp />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'invalid-email');
    fireEvent.changeText(getByPlaceholderText('Create a password (min 8 characters)'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    fireEvent.press(getButton(getAllByText, 'Create Account'));

    await waitFor(() => {
      expect(getByText('Please enter a valid email')).toBeTruthy();
    });
  });

  it('shows validation error for empty password', async () => {
    const { getAllByText, getByText, getByPlaceholderText } = render(<SignUp />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.press(getButton(getAllByText, 'Create Account'));

    await waitFor(() => {
      expect(getByText('Password is required')).toBeTruthy();
    });
  });

  it('shows validation error for short password', async () => {
    const { getAllByText, getByText, getByPlaceholderText } = render(<SignUp />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Create a password (min 8 characters)'), 'short');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'short');
    fireEvent.press(getButton(getAllByText, 'Create Account'));

    await waitFor(() => {
      expect(getByText('Password must be at least 8 characters')).toBeTruthy();
    });
  });

  it('shows validation error for password mismatch', async () => {
    const { getAllByText, getByText, getByPlaceholderText } = render(<SignUp />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Create a password (min 8 characters)'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password456');
    fireEvent.press(getButton(getAllByText, 'Create Account'));

    await waitFor(() => {
      expect(getByText('Passwords do not match')).toBeTruthy();
    });
  });

  it('calls signUp with correct credentials', async () => {
    mockSignUp.mockResolvedValue({ error: null });

    const { getAllByText, getByPlaceholderText } = render(<SignUp />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Create a password (min 8 characters)'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    await act(async () => {
      fireEvent.press(getButton(getAllByText, 'Create Account'));
    });

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('shows success message on successful sign up', async () => {
    mockSignUp.mockResolvedValue({ error: null });

    const { getAllByText, getByPlaceholderText } = render(<SignUp />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Create a password (min 8 characters)'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    await act(async () => {
      fireEvent.press(getButton(getAllByText, 'Create Account'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Account created! You can now sign in.',
        expect.any(Array)
      );
    });
  });

  it('shows error alert on sign up failure', async () => {
    mockSignUp.mockResolvedValue({ error: { message: 'Email already exists' } });

    const { getAllByText, getByPlaceholderText } = render(<SignUp />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'existing@example.com');
    fireEvent.changeText(getByPlaceholderText('Create a password (min 8 characters)'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    await act(async () => {
      fireEvent.press(getButton(getAllByText, 'Create Account'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Sign Up Error', 'Email already exists');
    });
  });

  it('shows error alert on unexpected error', async () => {
    mockSignUp.mockRejectedValue(new Error('Network error'));

    const { getAllByText, getByPlaceholderText } = render(<SignUp />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Create a password (min 8 characters)'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    await act(async () => {
      fireEvent.press(getButton(getAllByText, 'Create Account'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'An unexpected error occurred');
    });
  });

  it('clears email error when typing', async () => {
    const { getAllByText, getByText, getByPlaceholderText, queryByText } = render(<SignUp />);

    fireEvent.press(getButton(getAllByText, 'Create Account'));

    await waitFor(() => {
      expect(getByText('Email is required')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 't');

    await waitFor(() => {
      expect(queryByText('Email is required')).toBeNull();
    });
  });

  it('clears password error when typing', async () => {
    const { getAllByText, getByText, getByPlaceholderText, queryByText } = render(<SignUp />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.press(getButton(getAllByText, 'Create Account'));

    await waitFor(() => {
      expect(getByText('Password is required')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('Create a password (min 8 characters)'), 'p');

    await waitFor(() => {
      expect(queryByText('Password is required')).toBeNull();
    });
  });

  it('clears confirm password error when typing', async () => {
    const { getAllByText, getByText, getByPlaceholderText, queryByText } = render(<SignUp />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Create a password (min 8 characters)'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'different');
    fireEvent.press(getButton(getAllByText, 'Create Account'));

    await waitFor(() => {
      expect(getByText('Passwords do not match')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');

    await waitFor(() => {
      expect(queryByText('Passwords do not match')).toBeNull();
    });
  });

  it('has sign in link', () => {
    const { getByText } = render(<SignUp />);
    expect(getByText('Already have an account?')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });
});
