/**
 * Base service utilities for making API requests
 */

import { supabase } from '@/lib/supabase';
import { ApiError, ApiErrorCode } from '@/services/ApiError';
import type { Session } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

export interface ApiRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown>;
  operation?: string;
  skipAuth?: boolean;
}

/**
 * Get the current authenticated session
 * @throws {ApiError} if not authenticated
 */
export async function getSession(): Promise<Session> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new ApiError('Not authenticated', {
        code: ApiErrorCode.SESSION_EXPIRED,
      });
    }

    return session;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Authentication failed', {
      code: ApiErrorCode.AUTH,
      originalError: error instanceof Error ? error : undefined,
    });
  }
}

/**
 * Determine the ApiErrorCode based on HTTP status code
 */
function getErrorCodeFromStatus(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return ApiErrorCode.VALIDATION;
    case 401:
      return ApiErrorCode.AUTH;
    case 403:
      return ApiErrorCode.PERMISSION_DENIED;
    case 404:
      return ApiErrorCode.NOT_FOUND;
    default:
      return ApiErrorCode.API;
  }
}

/**
 * Create an ApiError from a failed fetch response
 */
export async function createApiError(
  response: Response,
  operation?: string
): Promise<ApiError> {
  let message = 'Request failed';

  try {
    const data = await response.json();
    if (data.error) {
      message = data.error;
    }
  } catch {
    // If we can't parse JSON, use the default message
  }

  return new ApiError(message, {
    code: getErrorCodeFromStatus(response.status),
    statusCode: response.status,
    operation,
  });
}

/**
 * Make an authenticated API request to Supabase Edge Functions
 * @throws {ApiError} on failure
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions
): Promise<T> {
  const { method, body, operation, skipAuth } = options;

  const headers: Record<string, string> = {};

  // Add auth header if not skipped
  if (!skipAuth) {
    const session = await getSession();
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  // Add content-type for requests with body
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const url = `${SUPABASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw await createApiError(response, operation);
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network or other errors
    const message = error instanceof Error ? error.message : 'Network request failed';
    const isNetworkError =
      message.toLowerCase().includes('network') ||
      message.toLowerCase().includes('failed to fetch');

    throw new ApiError(message, {
      code: isNetworkError ? ApiErrorCode.NETWORK : ApiErrorCode.UNKNOWN,
      operation,
      originalError: error instanceof Error ? error : undefined,
    });
  }
}
