import { Alert } from 'react-native';

// Unmock errorHandler to test the actual implementation
jest.unmock('../../lib/errorHandler');

// Must import after unmocking
const { handleError, showSuccess, showInfo } = require('../../lib/errorHandler');

jest.spyOn(Alert, 'alert');

describe('errorHandler', async () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleError', async () => {
    describe('alert dialogs', async () => {
      it('shows alert for critical errors', async () => {
        const error = new Error('Out of memory');
        handleError(error, { operation: 'test' });

        // "out of memory" has a specific friendly message mapping
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'The app ran out of memory. Please restart.'
        );
      });

      it('shows alert with retry option for critical errors when onRetry provided', async () => {
        const error = new Error('Fatal error occurred');
        const onRetry = jest.fn();
        handleError(error, { operation: 'test', onRetry });

        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'A critical error occurred. Please restart the app.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: onRetry },
          ]
        );
      });

      it('shows alert when forceAlert is true', async () => {
        const error = new Error('Regular error');
        handleError(error, { operation: 'test', forceAlert: true });

        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Something went wrong. Please try again.'
        );
      });

      it('shows session expired alert for auth errors requiring reauth', async () => {
        const error = new Error('JWT expired');
        handleError(error, { operation: 'test' });

        expect(Alert.alert).toHaveBeenCalledWith(
          'Session Expired',
          'Your session has expired. Please sign in again.',
          [{ text: 'OK' }]
        );
      });

      it('shows session expired alert for refresh token not found', async () => {
        const error = new Error('refresh_token_not_found');
        handleError(error, { operation: 'test' });

        expect(Alert.alert).toHaveBeenCalledWith(
          'Session Expired',
          'Your session has expired. Please sign in again.',
          [{ text: 'OK' }]
        );
      });
    });

    describe('toast notifications', async () => {
      it('does not show alert for regular errors (uses toast)', async () => {
        const error = new Error('Something went wrong');
        handleError(error, { operation: 'test' });

        // Regular errors show toast, not alert
        expect(Alert.alert).not.toHaveBeenCalled();
      });

      it('does not show alert for network errors (uses toast)', async () => {
        const error = new Error('Network request failed');
        handleError(error, { operation: 'test' });

        expect(Alert.alert).not.toHaveBeenCalled();
      });

      it('does not show alert for API errors (uses toast)', async () => {
        const error = new Error('Row not found');
        handleError(error, { operation: 'test' });

        expect(Alert.alert).not.toHaveBeenCalled();
      });
    });
  });

  describe('showSuccess', async () => {
    it('does not throw when called', async () => {
      expect(() => showSuccess('Operation completed!')).not.toThrow();
    });
  });

  describe('showInfo', async () => {
    it('does not throw when called', async () => {
      expect(() => showInfo('Just so you know...')).not.toThrow();
    });
  });
});
