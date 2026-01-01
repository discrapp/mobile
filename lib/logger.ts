/**
 * Development-only logger utility
 *
 * This utility provides logging functions that only output in development mode.
 * In production builds (__DEV__ === false), all logging is silently suppressed.
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * logger.debug('Fetching data...', { userId: '123' });
 * logger.info('Operation completed successfully');
 * logger.warn('Deprecated API usage detected');
 * logger.error('Failed to fetch data', error);
 * ```
 */

type LogContext = Record<string, unknown>;

/**
 * Formats a log message with optional context
 */
function formatMessage(message: string, context?: LogContext): string {
  if (context && Object.keys(context).length > 0) {
    return `${message} ${JSON.stringify(context, null, 2)}`;
  }
  return message;
}

/**
 * Development-only logger
 * All methods are no-ops in production builds
 */
export const logger = {
  /**
   * Log debug information (only in development)
   */
  debug: (message: string, context?: LogContext): void => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[DEBUG] ${formatMessage(message, context)}`);
    }
  },

  /**
   * Log informational messages (only in development)
   */
  info: (message: string, context?: LogContext): void => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[INFO] ${formatMessage(message, context)}`);
    }
  },

  /**
   * Log warnings (only in development)
   */
  warn: (message: string, context?: LogContext): void => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(`[WARN] ${formatMessage(message, context)}`);
    }
  },

  /**
   * Log errors (only in development)
   * Note: For production error tracking, use handleError() from @/lib/errorHandler
   * which reports to Sentry and shows appropriate UI feedback.
   */
  error: (message: string, error?: unknown, context?: LogContext): void => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error(`[ERROR] ${formatMessage(message, context)}`, error);
    }
  },
};
