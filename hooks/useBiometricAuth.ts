import { useState, useCallback, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleError } from '@/lib/errorHandler';
import { STORAGE_KEYS } from '@/constants/storageKeys';

export interface AuthenticateOptions {
  /** Custom prompt message for the authentication dialog */
  promptMessage?: string;
}

interface UseBiometricAuthResult {
  /** Whether biometric authentication is currently loading */
  isLoading: boolean;
  /** Whether the user has successfully authenticated */
  isAuthenticated: boolean;
  /** Error message if authentication failed */
  error: string | null;
  /** Whether the device has biometric hardware */
  hasHardware: boolean;
  /** Whether biometrics are enrolled on the device */
  isEnrolled: boolean;
  /** Whether biometrics are available (has hardware and enrolled) */
  isAvailable: boolean;
  /** Whether biometric authentication is enabled by the user */
  isBiometricEnabled: boolean;
  /** The type of biometric available (Face ID, Touch ID, or Biometrics) */
  biometricType: string | null;
  /** Authenticate using biometrics */
  authenticate: (options?: AuthenticateOptions) => Promise<boolean>;
  /** Check if biometrics are available */
  checkBiometricAvailability: () => Promise<void>;
  /** Enable or disable biometric authentication */
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  /** Reset the authentication state */
  resetAuthState: () => void;
}

/**
 * Hook for biometric authentication using Face ID / Touch ID.
 * Provides methods to check availability, authenticate, and manage preferences.
 */
export function useBiometricAuth(): UseBiometricAuthResult {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasHardware, setHasHardware] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);

  const isAvailable = hasHardware && isEnrolled;

  /**
   * Determine the biometric type label based on supported authentication types.
   */
  const getBiometricTypeLabel = useCallback(
    async (types: LocalAuthentication.AuthenticationType[]): Promise<string | null> => {
      if (types.length === 0) {
        return null;
      }

      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'Face ID';
      }

      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'Touch ID';
      }

      return 'Biometrics';
    },
    []
  );

  /**
   * Check biometric availability and load user preferences.
   */
  const checkBiometricAvailability = useCallback(async (): Promise<void> => {
    try {
      const [hardware, enrolled, types] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
      ]);

      setHasHardware(hardware);
      setIsEnrolled(enrolled);

      const typeLabel = await getBiometricTypeLabel(types);
      setBiometricType(typeLabel);

      // Load user preference
      const storedPreference = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
      setIsBiometricEnabled(storedPreference === 'true');
    } catch (err) {
      const errorMessage = 'Failed to check biometric availability';
      setError(errorMessage);
      handleError(err, { operation: 'check-biometric-availability' });
    } finally {
      setIsLoading(false);
    }
  }, [getBiometricTypeLabel]);

  /**
   * Authenticate the user using biometrics.
   */
  const authenticate = useCallback(
    async (options?: AuthenticateOptions): Promise<boolean> => {
      if (!isAvailable) {
        return false;
      }

      setError(null);

      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: options?.promptMessage ?? 'Unlock Discr',
          fallbackLabel: 'Use password',
          cancelLabel: 'Cancel',
          disableDeviceFallback: false,
        });

        if (result.success) {
          setIsAuthenticated(true);
          return true;
        }

        // Handle specific error cases
        if (result.error === 'lockout') {
          setError('Too many failed attempts. Please try again later.');
        } else if (result.error !== 'user_cancel') {
          // User cancel is not an error, just return false without setting error
          setError(result.error || null);
        }

        return false;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Biometric authentication failed';
        setError(errorMessage);
        handleError(err, { operation: 'biometric-authenticate' });
        return false;
      }
    },
    [isAvailable]
  );

  /**
   * Enable or disable biometric authentication.
   */
  const setBiometricEnabledFn = useCallback(
    async (enabled: boolean): Promise<void> => {
      if (enabled && !isAvailable) {
        setError('Biometrics are not available on this device');
        return;
      }

      try {
        await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, enabled.toString());
        setIsBiometricEnabled(enabled);
        setError(null);
      } catch (err) {
        setError('Failed to save biometric preference');
        handleError(err, { operation: 'set-biometric-enabled' });
      }
    },
    [isAvailable]
  );

  /**
   * Reset the authentication state.
   */
  const resetAuthState = useCallback((): void => {
    setIsAuthenticated(false);
    setError(null);
  }, []);

  // Check availability on mount
  useEffect(() => {
    checkBiometricAvailability();
  }, [checkBiometricAvailability]);

  return {
    isLoading,
    isAuthenticated,
    error,
    hasHardware,
    isEnrolled,
    isAvailable,
    isBiometricEnabled,
    biometricType,
    authenticate,
    checkBiometricAvailability,
    setBiometricEnabled: setBiometricEnabledFn,
    resetAuthState,
  };
}
