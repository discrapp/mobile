import React from 'react';
import { render } from '@testing-library/react-native';
import HomeScreen from '../../app/(tabs)/index';

// Mock useAuth
const mockUser = { email: 'test@example.com' };
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({ user: null })),
}));

const { useAuth } = require('../../contexts/AuthContext');

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders welcome message', () => {
    useAuth.mockReturnValue({ user: null });
    const { getByText } = render(<HomeScreen />);

    expect(getByText('Welcome to Discr!')).toBeTruthy();
    expect(getByText('Never lose your favorite disc again. Track your collection and help others find their lost discs.')).toBeTruthy();
  });

  it('displays user email when logged in', () => {
    useAuth.mockReturnValue({ user: mockUser });
    const { getByText } = render(<HomeScreen />);

    expect(getByText('Welcome to Discr!')).toBeTruthy();
    expect(getByText('test@example.com')).toBeTruthy();
  });

  it('does not display email when not logged in', () => {
    useAuth.mockReturnValue({ user: null });
    const { queryByText } = render(<HomeScreen />);

    expect(queryByText('test@example.com')).toBeNull();
  });
});
