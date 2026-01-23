import { renderHook } from '@testing-library/react-native';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useAuth } from '@/contexts/AuthContext';

jest.mock('@/contexts/AuthContext');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('useIsAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when user is null', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
      registerPushToken: jest.fn(),
    });

    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(false);
  });

  it('returns false when user has no app_metadata', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        app_metadata: {},
      } as ReturnType<typeof useAuth>['user'],
      session: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
      registerPushToken: jest.fn(),
    });

    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(false);
  });

  it('returns false when user has a non-admin role', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        app_metadata: { role: 'user' },
      } as unknown as ReturnType<typeof useAuth>['user'],
      session: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
      registerPushToken: jest.fn(),
    });

    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(false);
  });

  it('returns true when user has admin role', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'admin@example.com',
        app_metadata: { role: 'admin' },
      } as unknown as ReturnType<typeof useAuth>['user'],
      session: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
      registerPushToken: jest.fn(),
    });

    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(true);
  });

  it('returns false when app_metadata.role is undefined', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        app_metadata: { provider: 'email' },
      } as ReturnType<typeof useAuth>['user'],
      session: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
      registerPushToken: jest.fn(),
    });

    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(false);
  });
});
