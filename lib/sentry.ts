import * as Sentry from '@sentry/react-native';

/**
 * Initialize Sentry error tracking.
 * Only initializes if EXPO_PUBLIC_SENTRY_DSN is set.
 * Safe to call multiple times - will only initialize once.
 */
export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    console.log('Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn,
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.2, // 20% of transactions for performance monitoring
    debug: __DEV__,
  });
}

/**
 * Capture an error and send to Sentry.
 * @param error - The error to capture
 * @param context - Optional context to attach to the error
 */
export function captureError(
  error: Error | unknown,
  context?: Record<string, unknown>
): void {
  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Set the current user context for error tracking.
 * @param userId - The user's ID
 * @param email - Optional email address
 */
export function setUserContext(userId: string, email?: string): void {
  Sentry.setUser({
    id: userId,
    email,
  });
}

/**
 * Clear the user context (e.g., on sign out).
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

// Re-export Sentry for direct access if needed
export { Sentry };
