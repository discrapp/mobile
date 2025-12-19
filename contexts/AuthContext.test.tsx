import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
  },
}));

// Mock expo-linking
jest.mock('expo-linking', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'test-token' })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(),
  AndroidImportance: { MAX: 5 },
}));

// Mock expo-device
jest.mock('expo-device', () => ({
  isDevice: true,
}));

const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;
const mockSignInWithPassword = supabase.auth.signInWithPassword as jest.Mock;
const mockSignUp = supabase.auth.signUp as jest.Mock;
const mockSignInWithOAuth = supabase.auth.signInWithOAuth as jest.Mock;
const mockSignOut = supabase.auth.signOut as jest.Mock;
const mockInvoke = supabase.functions.invoke as jest.Mock;

const mockSession = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  user: { id: 'user-1', email: 'test@example.com' },
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupMocks = (session: any = null) => {
    mockGetSession.mockResolvedValue({
      data: { session },
      error: null,
    });

    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });

    mockInvoke.mockResolvedValue({ data: {}, error: null });
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  describe('initial state', () => {
    it('should provide initial auth state with no session', async () => {
      setupMocks();

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it('should provide auth state with existing session', async () => {
      setupMocks(mockSession);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.session).toEqual(mockSession);
      expect(result.current.user).toEqual(mockSession.user);
    });

    it('should start with loading true', async () => {
      setupMocks();

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Initially loading should be true
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('signIn', () => {
    it('should call signInWithPassword with email and password', async () => {
      setupMocks();
      mockSignInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should return error when signIn fails', async () => {
      setupMocks();
      const mockError = new Error('Invalid credentials');
      mockSignInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: mockError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'wrong-password');
      });

      expect(signInResult).toEqual({ error: mockError });
    });
  });

  describe('signUp', () => {
    it('should call signUp with email and password', async () => {
      setupMocks();
      mockSignUp.mockResolvedValue({
        data: { session: null, user: mockSession.user },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signUp('new@example.com', 'password123');
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
      });
    });

    it('should return error when signUp fails', async () => {
      setupMocks();
      const mockError = new Error('Email already in use');
      mockSignUp.mockResolvedValue({
        data: { session: null, user: null },
        error: mockError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp('existing@example.com', 'password123');
      });

      expect(signUpResult).toEqual({ error: mockError });
    });
  });

  describe('signInWithGoogle', () => {
    it('should call signInWithOAuth with google provider', async () => {
      setupMocks();
      mockSignInWithOAuth.mockResolvedValue({
        data: { provider: 'google', url: 'https://google.com/oauth' },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'com.discr.app://',
        },
      });
    });

    it('should return error when Google sign in fails', async () => {
      setupMocks();
      const mockError = new Error('OAuth error');
      mockSignInWithOAuth.mockResolvedValue({
        data: { provider: null, url: null },
        error: mockError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let googleResult;
      await act(async () => {
        googleResult = await result.current.signInWithGoogle();
      });

      expect(googleResult).toEqual({ error: mockError });
    });
  });

  describe('signOut', () => {
    it('should call signOut when signOut is invoked', async () => {
      setupMocks(mockSession);
      mockSignOut.mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('should clear session and user even if signOut fails', async () => {
      setupMocks(mockSession);
      mockSignOut.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.session).toEqual(mockSession);

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it('should provide signOut function', async () => {
      setupMocks();

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.signOut).toBe('function');
    });
  });

  describe('registerPushToken', () => {
    it('should provide registerPushToken function', async () => {
      setupMocks();

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.registerPushToken).toBe('function');
    });
  });

  describe('context functions', () => {
    it('should provide all auth functions', async () => {
      setupMocks();

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.signIn).toBe('function');
      expect(typeof result.current.signUp).toBe('function');
      expect(typeof result.current.signInWithGoogle).toBe('function');
      expect(typeof result.current.signOut).toBe('function');
      expect(typeof result.current.registerPushToken).toBe('function');
    });
  });
});
