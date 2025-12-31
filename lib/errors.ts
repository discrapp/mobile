/**
 * Error categorization and user-friendly message mapping
 */

export enum ErrorCategory {
  NETWORK = 'NETWORK',
  API = 'API',
  AUTH = 'AUTH',
  CRITICAL = 'CRITICAL',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Map of error patterns to user-friendly messages
 */
const errorMessages: Record<string, string> = {
  // Network errors
  'network request failed': 'Unable to connect. Please check your internet.',
  'failed to fetch': 'Unable to connect. Please check your internet.',
  'networkerror': 'Unable to connect. Please check your internet.',
  'timeout': 'Request timed out. Please try again.',

  // Auth errors - Use generic messages to prevent email enumeration
  'invalid login credentials': 'Incorrect email or password.',
  'email not confirmed': 'Please verify your email before signing in.',
  'jwt expired': 'Your session has expired. Please sign in again.',
  'jwt malformed': 'Your session has expired. Please sign in again.',
  'refresh_token_not_found': 'Your session has expired. Please sign in again.',
  'user not found': 'Incorrect email or password.', // Generic to prevent email enumeration
  'email already registered': 'Unable to create account. Please try again.', // Generic to prevent email enumeration
  'password is too weak': 'Password must be at least 8 characters.',

  // API errors
  'row not found': 'The requested item was not found.',
  'permission denied': 'You do not have permission to perform this action.',
  'foreign key violation': 'This operation cannot be completed.',
  'unique violation': 'This item already exists.',

  // Critical errors
  'out of memory': 'The app ran out of memory. Please restart.',
};

/**
 * Categorize an error based on its message and type
 */
export function categorizeError(error: Error | unknown): ErrorCategory {
  const message = getErrorMessage(error).toLowerCase();

  // Network errors
  if (
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('timeout') ||
    message.includes('connection')
  ) {
    return ErrorCategory.NETWORK;
  }

  // Auth errors
  if (
    message.includes('jwt') ||
    message.includes('token') ||
    message.includes('login') ||
    message.includes('credentials') ||
    message.includes('password') ||
    message.includes('email') ||
    message.includes('session') ||
    message.includes('sign in') ||
    message.includes('authenticated')
  ) {
    return ErrorCategory.AUTH;
  }

  // Validation errors
  if (
    message.includes('invalid') ||
    message.includes('required') ||
    message.includes('validation')
  ) {
    return ErrorCategory.VALIDATION;
  }

  // Critical errors
  if (
    message.includes('memory') ||
    message.includes('crash') ||
    message.includes('fatal')
  ) {
    return ErrorCategory.CRITICAL;
  }

  // API errors (Supabase/PostgreSQL)
  if (
    message.includes('row') ||
    message.includes('permission') ||
    message.includes('foreign key') ||
    message.includes('unique') ||
    message.includes('constraint')
  ) {
    return ErrorCategory.API;
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Extract a string message from any error type
 */
export function getErrorMessage(error: Error | unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'An unknown error occurred';
}

/**
 * Get a user-friendly message for an error
 */
export function getUserFriendlyMessage(error: Error | unknown): string {
  const message = getErrorMessage(error).toLowerCase();

  // Check for matching patterns
  for (const [pattern, friendlyMessage] of Object.entries(errorMessages)) {
    if (message.includes(pattern.toLowerCase())) {
      return friendlyMessage;
    }
  }

  // Default messages by category
  const category = categorizeError(error);
  switch (category) {
    case ErrorCategory.NETWORK:
      return 'Unable to connect. Please check your internet.';
    case ErrorCategory.AUTH:
      return 'Authentication failed. Please try again.';
    case ErrorCategory.VALIDATION:
      return 'Please check your input and try again.';
    case ErrorCategory.CRITICAL:
      return 'A critical error occurred. Please restart the app.';
    case ErrorCategory.API:
      return 'Unable to complete request. Please try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

/**
 * Check if an error requires the user to re-authenticate
 */
export function requiresReauth(error: Error | unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes('jwt expired') ||
    message.includes('jwt malformed') ||
    message.includes('refresh_token_not_found') ||
    message.includes('session expired') ||
    message.includes('not authenticated')
  );
}
