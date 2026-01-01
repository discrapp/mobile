import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

// Mock expo-local-authentication
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

// Mock error handler
jest.mock('@/lib/errorHandler', () => ({
  handleError: jest.fn(),
}));

import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { handleError } from '@/lib/errorHandler';
import { STORAGE_KEYS } from '@/constants/storageKeys';

describe('useBiometricAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  describe('initialization', () => {
    it('initializes with default state', () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([2]);

      const { result } = renderHook(() => useBiometricAuth());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.authenticate).toBe('function');
      expect(typeof result.current.checkBiometricAvailability).toBe('function');
      expect(typeof result.current.setBiometricEnabled).toBe('function');
    });

    it('checks biometric availability on mount', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([2]);

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(LocalAuthentication.hasHardwareAsync).toHaveBeenCalled();
      expect(LocalAuthentication.isEnrolledAsync).toHaveBeenCalled();
      expect(result.current.hasHardware).toBe(true);
      expect(result.current.isEnrolled).toBe(true);
    });

    it('loads biometric enabled preference from storage', async () => {
      AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([2]);

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isBiometricEnabled).toBe(true);
    });

    it('defaults to disabled when no preference is stored', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([2]);

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isBiometricEnabled).toBe(false);
    });
  });

  describe('biometric hardware detection', () => {
    it('detects when device has no biometric hardware', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasHardware).toBe(false);
      expect(result.current.isEnrolled).toBe(false);
      expect(result.current.isAvailable).toBe(false);
    });

    it('detects when biometrics are not enrolled', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([2]);

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasHardware).toBe(true);
      expect(result.current.isEnrolled).toBe(false);
      expect(result.current.isAvailable).toBe(false);
    });

    it('detects Face ID as authentication type', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.biometricType).toBe('Face ID');
    });

    it('detects Touch ID as authentication type', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.biometricType).toBe('Touch ID');
    });

    it('detects Iris as authentication type', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.IRIS,
      ]);

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.biometricType).toBe('Biometrics');
    });

    it('returns null biometricType when no hardware', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.biometricType).toBeNull();
    });
  });

  describe('authenticate', () => {
    beforeEach(() => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([2]);
    });

    it('returns true on successful authentication', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let authResult: boolean = false;
      await act(async () => {
        authResult = await result.current.authenticate();
      });

      expect(authResult).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('returns false on failed authentication', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: 'user_cancel',
      });

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let authResult: boolean = false;
      await act(async () => {
        authResult = await result.current.authenticate();
      });

      expect(authResult).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('calls authenticateAsync with correct options', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.authenticate();
      });

      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Unlock Discr',
        fallbackLabel: 'Use password',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
    });

    it('accepts custom prompt message', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.authenticate({ promptMessage: 'Custom message' });
      });

      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          promptMessage: 'Custom message',
        })
      );
    });

    it('returns false when biometrics are not available', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let authResult: boolean = false;
      await act(async () => {
        authResult = await result.current.authenticate();
      });

      expect(authResult).toBe(false);
      expect(LocalAuthentication.authenticateAsync).not.toHaveBeenCalled();
    });

    it('handles authentication errors', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockRejectedValue(
        new Error('Biometric authentication failed')
      );

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let authResult: boolean = false;
      await act(async () => {
        authResult = await result.current.authenticate();
      });

      expect(authResult).toBe(false);
      expect(result.current.error).toBe('Biometric authentication failed');
      expect(handleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ operation: 'biometric-authenticate' })
      );
    });

    it('handles lockout error', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: 'lockout',
      });

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.authenticate();
      });

      expect(result.current.error).toBe('Too many failed attempts. Please try again later.');
    });

    it('handles user cancel gracefully without error', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: 'user_cancel',
      });

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.authenticate();
      });

      // User cancel should not set an error message
      expect(result.current.error).toBeNull();
    });
  });

  describe('setBiometricEnabled', () => {
    beforeEach(() => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([2]);
    });

    it('saves preference to AsyncStorage when enabling', async () => {
      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.setBiometricEnabled(true);
      });

      expect(result.current.isBiometricEnabled).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');
    });

    it('saves preference to AsyncStorage when disabling', async () => {
      AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.setBiometricEnabled(false);
      });

      expect(result.current.isBiometricEnabled).toBe(false);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.BIOMETRIC_ENABLED, 'false');
    });

    it('cannot enable biometrics when not available', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.setBiometricEnabled(true);
      });

      expect(result.current.isBiometricEnabled).toBe(false);
      expect(result.current.error).toBe('Biometrics are not available on this device');
    });

    it('handles storage errors', async () => {
      const storageError = new Error('Storage error');
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(storageError);

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.setBiometricEnabled(true);
      });

      expect(result.current.error).toBe('Failed to save biometric preference');
      expect(handleError).toHaveBeenCalledWith(storageError, expect.objectContaining({
        operation: 'set-biometric-enabled',
      }));
    });
  });

  describe('checkBiometricAvailability', () => {
    it('refreshes biometric availability status', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasHardware).toBe(false);

      // Now the device has hardware
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([2]);

      await act(async () => {
        await result.current.checkBiometricAvailability();
      });

      expect(result.current.hasHardware).toBe(true);
      expect(result.current.isEnrolled).toBe(true);
      expect(result.current.isAvailable).toBe(true);
    });

    it('handles errors during availability check', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([2]);

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Now throw an error
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockRejectedValue(
        new Error('Hardware check failed')
      );

      await act(async () => {
        await result.current.checkBiometricAvailability();
      });

      expect(result.current.error).toBe('Failed to check biometric availability');
      expect(handleError).toHaveBeenCalled();
    });
  });

  describe('resetAuthState', () => {
    beforeEach(() => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([2]);
    });

    it('resets authenticated state', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.authenticate();
      });

      expect(result.current.isAuthenticated).toBe(true);

      act(() => {
        result.current.resetAuthState();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('error handling', () => {
    it('handles non-Error exceptions gracefully', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockRejectedValue('String error');
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to check biometric availability');
    });
  });

  describe('function reference stability', () => {
    it('maintains function reference stability across re-renders', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([2]);

      const { result, rerender } = renderHook(() => useBiometricAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialAuthenticate = result.current.authenticate;
      const initialSetBiometricEnabled = result.current.setBiometricEnabled;
      const initialCheckAvailability = result.current.checkBiometricAvailability;
      const initialResetAuthState = result.current.resetAuthState;

      rerender({});

      expect(result.current.authenticate).toBe(initialAuthenticate);
      expect(result.current.setBiometricEnabled).toBe(initialSetBiometricEnabled);
      expect(result.current.checkBiometricAvailability).toBe(initialCheckAvailability);
      expect(result.current.resetAuthState).toBe(initialResetAuthState);
    });
  });
});
