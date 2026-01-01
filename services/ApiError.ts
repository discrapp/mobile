/**
 * Custom error class for API operations
 * Provides structured error information for consistent error handling
 */

export enum ApiErrorCode {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION = 'VALIDATION',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  API = 'API',
  UNKNOWN = 'UNKNOWN',
}

export interface ApiErrorOptions {
  code?: ApiErrorCode;
  statusCode?: number;
  operation?: string;
  originalError?: Error;
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly statusCode?: number;
  readonly operation?: string;
  readonly originalError?: Error;

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = options.code ?? ApiErrorCode.UNKNOWN;
    this.statusCode = options.statusCode;
    this.operation = options.operation;
    this.originalError = options.originalError;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Check if this is a network-related error
   */
  isNetworkError(): boolean {
    return this.code === ApiErrorCode.NETWORK;
  }

  /**
   * Check if this is an authentication-related error
   */
  isAuthError(): boolean {
    return this.code === ApiErrorCode.AUTH || this.code === ApiErrorCode.SESSION_EXPIRED;
  }

  /**
   * Check if this error requires the user to re-authenticate
   */
  requiresReauth(): boolean {
    return this.code === ApiErrorCode.SESSION_EXPIRED;
  }

  /**
   * Serialize the error to a JSON-compatible object
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      operation: this.operation,
    };
  }
}

/**
 * Type guard to check if an unknown value is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
