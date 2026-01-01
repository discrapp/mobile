/**
 * Tests for ApiError class - custom error for API operations
 */

import { ApiError, ApiErrorCode, isApiError } from '@/services/ApiError';

describe('ApiError', () => {
  describe('constructor', () => {
    it('creates an error with message and default values', () => {
      const error = new ApiError('Test error message');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.message).toBe('Test error message');
      expect(error.code).toBe(ApiErrorCode.UNKNOWN);
      expect(error.statusCode).toBeUndefined();
      expect(error.operation).toBeUndefined();
    });

    it('creates an error with custom code', () => {
      const error = new ApiError('Network failed', {
        code: ApiErrorCode.NETWORK,
      });

      expect(error.message).toBe('Network failed');
      expect(error.code).toBe(ApiErrorCode.NETWORK);
    });

    it('creates an error with status code', () => {
      const error = new ApiError('Not found', {
        code: ApiErrorCode.NOT_FOUND,
        statusCode: 404,
      });

      expect(error.statusCode).toBe(404);
    });

    it('creates an error with operation context', () => {
      const error = new ApiError('Failed to fetch discs', {
        code: ApiErrorCode.API,
        operation: 'fetch-discs',
      });

      expect(error.operation).toBe('fetch-discs');
    });

    it('creates an error with original error', () => {
      const originalError = new Error('Original error');
      const error = new ApiError('Wrapped error', {
        originalError,
      });

      expect(error.originalError).toBe(originalError);
    });

    it('preserves the error name', () => {
      const error = new ApiError('Test');
      expect(error.name).toBe('ApiError');
    });
  });

  describe('error codes', () => {
    it('defines all expected error codes', () => {
      expect(ApiErrorCode.NETWORK).toBe('NETWORK');
      expect(ApiErrorCode.AUTH).toBe('AUTH');
      expect(ApiErrorCode.SESSION_EXPIRED).toBe('SESSION_EXPIRED');
      expect(ApiErrorCode.NOT_FOUND).toBe('NOT_FOUND');
      expect(ApiErrorCode.VALIDATION).toBe('VALIDATION');
      expect(ApiErrorCode.PERMISSION_DENIED).toBe('PERMISSION_DENIED');
      expect(ApiErrorCode.API).toBe('API');
      expect(ApiErrorCode.UNKNOWN).toBe('UNKNOWN');
    });
  });

  describe('isNetworkError', () => {
    it('returns true for network errors', () => {
      const error = new ApiError('Network failed', {
        code: ApiErrorCode.NETWORK,
      });
      expect(error.isNetworkError()).toBe(true);
    });

    it('returns false for non-network errors', () => {
      const error = new ApiError('Auth failed', { code: ApiErrorCode.AUTH });
      expect(error.isNetworkError()).toBe(false);
    });
  });

  describe('isAuthError', () => {
    it('returns true for auth errors', () => {
      const error = new ApiError('Auth failed', { code: ApiErrorCode.AUTH });
      expect(error.isAuthError()).toBe(true);
    });

    it('returns true for session expired errors', () => {
      const error = new ApiError('Session expired', {
        code: ApiErrorCode.SESSION_EXPIRED,
      });
      expect(error.isAuthError()).toBe(true);
    });

    it('returns false for non-auth errors', () => {
      const error = new ApiError('Not found', { code: ApiErrorCode.NOT_FOUND });
      expect(error.isAuthError()).toBe(false);
    });
  });

  describe('requiresReauth', () => {
    it('returns true for session expired errors', () => {
      const error = new ApiError('Session expired', {
        code: ApiErrorCode.SESSION_EXPIRED,
      });
      expect(error.requiresReauth()).toBe(true);
    });

    it('returns false for regular auth errors', () => {
      const error = new ApiError('Auth failed', { code: ApiErrorCode.AUTH });
      expect(error.requiresReauth()).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('serializes the error to JSON', () => {
      const error = new ApiError('Test error', {
        code: ApiErrorCode.API,
        statusCode: 500,
        operation: 'test-operation',
      });

      const json = error.toJSON();

      expect(json).toEqual({
        name: 'ApiError',
        message: 'Test error',
        code: 'API',
        statusCode: 500,
        operation: 'test-operation',
      });
    });
  });
});

describe('isApiError', () => {
  it('returns true for ApiError instances', () => {
    const error = new ApiError('Test');
    expect(isApiError(error)).toBe(true);
  });

  it('returns false for regular Error instances', () => {
    const error = new Error('Test');
    expect(isApiError(error)).toBe(false);
  });

  it('returns false for non-error values', () => {
    expect(isApiError(null)).toBe(false);
    expect(isApiError(undefined)).toBe(false);
    expect(isApiError('string')).toBe(false);
    expect(isApiError(42)).toBe(false);
    expect(isApiError({})).toBe(false);
  });
});
