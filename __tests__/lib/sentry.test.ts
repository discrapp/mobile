// Unmock our sentry wrapper to test the actual implementation
jest.unmock('@/lib/sentry');

import * as Sentry from '@sentry/react-native';
import { initSentry, captureError, setUserContext, clearUserContext } from '@/lib/sentry';

describe('Sentry utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initSentry', () => {
    it('should initialize Sentry with correct config when DSN is set', () => {
      // Arrange
      const originalEnv = process.env.EXPO_PUBLIC_SENTRY_DSN;
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';

      // Act
      initSentry();

      // Assert
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://test@sentry.io/123',
          enableAutoSessionTracking: true,
        })
      );

      // Cleanup
      process.env.EXPO_PUBLIC_SENTRY_DSN = originalEnv;
    });

    it('should not initialize Sentry when DSN is not set', () => {
      // Arrange
      const originalEnv = process.env.EXPO_PUBLIC_SENTRY_DSN;
      delete process.env.EXPO_PUBLIC_SENTRY_DSN;

      // Act
      initSentry();

      // Assert
      expect(Sentry.init).not.toHaveBeenCalled();

      // Cleanup
      process.env.EXPO_PUBLIC_SENTRY_DSN = originalEnv;
    });
  });

  describe('captureError', () => {
    it('should capture exception with Sentry', () => {
      // Arrange
      const error = new Error('Test error');

      // Act
      captureError(error);

      // Assert
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('should capture exception with context when provided', () => {
      // Arrange
      const error = new Error('Test error');
      const context = { userId: '123', screen: 'MyBag' };

      // Act
      captureError(error, context);

      // Assert
      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });
  });

  describe('setUserContext', () => {
    it('should set user in Sentry', () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';

      // Act
      setUserContext(userId, email);

      // Assert
      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: userId,
        email: email,
      });
    });

    it('should set user with only id when email not provided', () => {
      // Arrange
      const userId = 'user-123';

      // Act
      setUserContext(userId);

      // Assert
      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: userId,
        email: undefined,
      });
    });
  });

  describe('clearUserContext', () => {
    it('should clear user from Sentry', () => {
      // Act
      clearUserContext();

      // Assert
      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });
  });
});
