import {
  ErrorCategory,
  categorizeError,
  getErrorMessage,
  getUserFriendlyMessage,
  requiresReauth,
} from '../../lib/errors';

describe('errors', async () => {
  describe('getErrorMessage', async () => {
    it('extracts message from Error instance', async () => {
      const error = new Error('Test error message');
      expect(getErrorMessage(error)).toBe('Test error message');
    });

    it('returns string directly if error is a string', async () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('extracts message from object with message property', async () => {
      const error = { message: 'Object error message' };
      expect(getErrorMessage(error)).toBe('Object error message');
    });

    it('returns default message for null', async () => {
      expect(getErrorMessage(null)).toBe('An unknown error occurred');
    });

    it('returns default message for undefined', async () => {
      expect(getErrorMessage(undefined)).toBe('An unknown error occurred');
    });

    it('returns default message for object without message', async () => {
      expect(getErrorMessage({ code: 500 })).toBe('An unknown error occurred');
    });

    it('returns default message for number', async () => {
      expect(getErrorMessage(404)).toBe('An unknown error occurred');
    });
  });

  describe('categorizeError', async () => {
    describe('NETWORK errors', async () => {
      it('categorizes "network request failed"', async () => {
        expect(categorizeError(new Error('Network request failed'))).toBe(ErrorCategory.NETWORK);
      });

      it('categorizes "failed to fetch"', async () => {
        expect(categorizeError(new Error('Failed to fetch'))).toBe(ErrorCategory.NETWORK);
      });

      it('categorizes timeout errors', async () => {
        expect(categorizeError(new Error('Request timeout'))).toBe(ErrorCategory.NETWORK);
      });

      it('categorizes connection errors', async () => {
        expect(categorizeError(new Error('Connection refused'))).toBe(ErrorCategory.NETWORK);
      });
    });

    describe('AUTH errors', async () => {
      it('categorizes JWT expired', async () => {
        expect(categorizeError(new Error('JWT expired'))).toBe(ErrorCategory.AUTH);
      });

      it('categorizes token errors', async () => {
        expect(categorizeError(new Error('Invalid token'))).toBe(ErrorCategory.AUTH);
      });

      it('categorizes login errors', async () => {
        expect(categorizeError(new Error('Login failed'))).toBe(ErrorCategory.AUTH);
      });

      it('categorizes credential errors', async () => {
        expect(categorizeError(new Error('Invalid credentials'))).toBe(ErrorCategory.AUTH);
      });

      it('categorizes password errors', async () => {
        expect(categorizeError(new Error('Incorrect password'))).toBe(ErrorCategory.AUTH);
      });

      it('categorizes email errors', async () => {
        expect(categorizeError(new Error('Email not verified'))).toBe(ErrorCategory.AUTH);
      });

      it('categorizes session errors', async () => {
        expect(categorizeError(new Error('Session expired'))).toBe(ErrorCategory.AUTH);
      });

      it('categorizes sign in errors', async () => {
        expect(categorizeError(new Error('Please sign in'))).toBe(ErrorCategory.AUTH);
      });

      it('categorizes authenticated errors', async () => {
        expect(categorizeError(new Error('Not authenticated'))).toBe(ErrorCategory.AUTH);
      });
    });

    describe('VALIDATION errors', async () => {
      it('categorizes invalid input', async () => {
        expect(categorizeError(new Error('Invalid input'))).toBe(ErrorCategory.VALIDATION);
      });

      it('categorizes required field errors', async () => {
        expect(categorizeError(new Error('Field is required'))).toBe(ErrorCategory.VALIDATION);
      });

      it('categorizes validation errors', async () => {
        expect(categorizeError(new Error('Validation failed'))).toBe(ErrorCategory.VALIDATION);
      });
    });

    describe('CRITICAL errors', async () => {
      it('categorizes memory errors', async () => {
        expect(categorizeError(new Error('Out of memory'))).toBe(ErrorCategory.CRITICAL);
      });

      it('categorizes crash errors', async () => {
        expect(categorizeError(new Error('App crash detected'))).toBe(ErrorCategory.CRITICAL);
      });

      it('categorizes fatal errors', async () => {
        expect(categorizeError(new Error('Fatal error'))).toBe(ErrorCategory.CRITICAL);
      });
    });

    describe('API errors', async () => {
      it('categorizes row not found', async () => {
        expect(categorizeError(new Error('Row not found'))).toBe(ErrorCategory.API);
      });

      it('categorizes permission denied', async () => {
        expect(categorizeError(new Error('Permission denied'))).toBe(ErrorCategory.API);
      });

      it('categorizes foreign key violations', async () => {
        expect(categorizeError(new Error('Foreign key violation'))).toBe(ErrorCategory.API);
      });

      it('categorizes unique violations', async () => {
        expect(categorizeError(new Error('Unique constraint violation'))).toBe(ErrorCategory.API);
      });
    });

    describe('UNKNOWN errors', async () => {
      it('categorizes unrecognized errors as UNKNOWN', async () => {
        expect(categorizeError(new Error('Something happened'))).toBe(ErrorCategory.UNKNOWN);
      });

      it('categorizes empty errors as UNKNOWN', async () => {
        expect(categorizeError(new Error(''))).toBe(ErrorCategory.UNKNOWN);
      });
    });
  });

  describe('getUserFriendlyMessage', async () => {
    describe('specific error patterns', async () => {
      it('returns friendly message for network request failed', async () => {
        expect(getUserFriendlyMessage(new Error('Network request failed'))).toBe(
          'Unable to connect. Please check your internet.'
        );
      });

      it('returns friendly message for failed to fetch', async () => {
        expect(getUserFriendlyMessage(new Error('Failed to fetch'))).toBe(
          'Unable to connect. Please check your internet.'
        );
      });

      it('returns friendly message for invalid login credentials', async () => {
        expect(getUserFriendlyMessage(new Error('Invalid login credentials'))).toBe(
          'Incorrect email or password.'
        );
      });

      it('returns friendly message for JWT expired', async () => {
        expect(getUserFriendlyMessage(new Error('JWT expired'))).toBe(
          'Your session has expired. Please sign in again.'
        );
      });

      it('returns friendly message for email not confirmed', async () => {
        expect(getUserFriendlyMessage(new Error('Email not confirmed'))).toBe(
          'Please verify your email before signing in.'
        );
      });

      it('returns friendly message for row not found', async () => {
        expect(getUserFriendlyMessage(new Error('Row not found'))).toBe(
          'The requested item was not found.'
        );
      });

      it('returns friendly message for permission denied', async () => {
        expect(getUserFriendlyMessage(new Error('Permission denied'))).toBe(
          'You do not have permission to perform this action.'
        );
      });

      it('returns friendly message for timeout', async () => {
        expect(getUserFriendlyMessage(new Error('Request timeout'))).toBe(
          'Request timed out. Please try again.'
        );
      });
    });

    describe('fallback messages by category', async () => {
      it('returns network fallback for unrecognized network error', async () => {
        expect(getUserFriendlyMessage(new Error('Connection lost suddenly'))).toBe(
          'Unable to connect. Please check your internet.'
        );
      });

      it('returns auth fallback for unrecognized auth error', async () => {
        expect(getUserFriendlyMessage(new Error('Token verification failed'))).toBe(
          'Authentication failed. Please try again.'
        );
      });

      it('returns validation fallback for unrecognized validation error', async () => {
        expect(getUserFriendlyMessage(new Error('Invalid format provided'))).toBe(
          'Please check your input and try again.'
        );
      });

      it('returns critical fallback for unrecognized critical error', async () => {
        expect(getUserFriendlyMessage(new Error('Memory allocation failed'))).toBe(
          'A critical error occurred. Please restart the app.'
        );
      });

      it('returns API fallback for unrecognized API error', async () => {
        expect(getUserFriendlyMessage(new Error('Constraint check failed'))).toBe(
          'Unable to complete request. Please try again.'
        );
      });

      it('returns default fallback for unknown errors', async () => {
        expect(getUserFriendlyMessage(new Error('Something weird happened'))).toBe(
          'Something went wrong. Please try again.'
        );
      });
    });
  });

  describe('requiresReauth', async () => {
    it('returns true for JWT expired', async () => {
      expect(requiresReauth(new Error('JWT expired'))).toBe(true);
    });

    it('returns true for JWT malformed', async () => {
      expect(requiresReauth(new Error('JWT malformed'))).toBe(true);
    });

    it('returns true for refresh_token_not_found', async () => {
      expect(requiresReauth(new Error('refresh_token_not_found'))).toBe(true);
    });

    it('returns true for session expired', async () => {
      expect(requiresReauth(new Error('Session expired'))).toBe(true);
    });

    it('returns true for not authenticated', async () => {
      expect(requiresReauth(new Error('User is not authenticated'))).toBe(true);
    });

    it('returns false for regular errors', async () => {
      expect(requiresReauth(new Error('Network failed'))).toBe(false);
    });

    it('returns false for invalid credentials', async () => {
      expect(requiresReauth(new Error('Invalid credentials'))).toBe(false);
    });
  });
});
