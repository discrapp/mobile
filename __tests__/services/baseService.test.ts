/**
 * Tests for base service utilities
 */

import { getSession, apiRequest, createApiError } from '@/services/baseService';
import { ApiError, ApiErrorCode } from '@/services/ApiError';
import { supabase } from '@/lib/supabase';

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('getSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the session when authenticated', async () => {
    const mockSession = {
      access_token: 'test-token',
      user: { id: 'user-123', email: 'test@example.com' },
    };
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
    });

    const session = await getSession();

    expect(session).toEqual(mockSession);
  });

  it('throws ApiError with SESSION_EXPIRED when no session', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });

    await expect(getSession()).rejects.toThrow(ApiError);
    await expect(getSession()).rejects.toMatchObject({
      code: ApiErrorCode.SESSION_EXPIRED,
      message: 'Not authenticated',
    });
  });

  it('throws ApiError with AUTH when getSession fails', async () => {
    (supabase.auth.getSession as jest.Mock).mockRejectedValue(
      new Error('Auth service unavailable')
    );

    await expect(getSession()).rejects.toThrow(ApiError);
    await expect(getSession()).rejects.toMatchObject({
      code: ApiErrorCode.AUTH,
    });
  });
});

describe('apiRequest', () => {
  const mockSession = {
    access_token: 'test-token',
    user: { id: 'user-123' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
    });
  });

  it('makes a GET request with authorization header', async () => {
    const mockData = { id: '123', name: 'Test' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const result = await apiRequest('/functions/v1/test-endpoint', {
      method: 'GET',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/test-endpoint'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
    expect(result).toEqual(mockData);
  });

  it('makes a POST request with JSON body', async () => {
    const mockData = { success: true };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const body = { name: 'New Item' };
    await apiRequest('/functions/v1/create', {
      method: 'POST',
      body,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(body),
      })
    );
  });

  it('handles DELETE requests', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ deleted: true }),
    });

    await apiRequest('/functions/v1/delete-item', {
      method: 'DELETE',
      body: { id: '123' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'DELETE',
      })
    );
  });

  it('throws ApiError with NOT_FOUND for 404 responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
    });

    await expect(
      apiRequest('/functions/v1/missing', { method: 'GET' })
    ).rejects.toMatchObject({
      code: ApiErrorCode.NOT_FOUND,
      statusCode: 404,
    });
  });

  it('throws ApiError with AUTH for 401 responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    });

    await expect(
      apiRequest('/functions/v1/protected', { method: 'GET' })
    ).rejects.toMatchObject({
      code: ApiErrorCode.AUTH,
      statusCode: 401,
    });
  });

  it('throws ApiError with PERMISSION_DENIED for 403 responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Forbidden' }),
    });

    await expect(
      apiRequest('/functions/v1/admin-only', { method: 'GET' })
    ).rejects.toMatchObject({
      code: ApiErrorCode.PERMISSION_DENIED,
      statusCode: 403,
    });
  });

  it('throws ApiError with VALIDATION for 400 responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid input' }),
    });

    await expect(
      apiRequest('/functions/v1/create', { method: 'POST', body: {} })
    ).rejects.toMatchObject({
      code: ApiErrorCode.VALIDATION,
      statusCode: 400,
    });
  });

  it('throws ApiError with API for 500 responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    await expect(
      apiRequest('/functions/v1/broken', { method: 'GET' })
    ).rejects.toMatchObject({
      code: ApiErrorCode.API,
      statusCode: 500,
    });
  });

  it('throws ApiError with NETWORK on network failures', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network request failed'));

    await expect(
      apiRequest('/functions/v1/test', { method: 'GET' })
    ).rejects.toMatchObject({
      code: ApiErrorCode.NETWORK,
    });
  });

  it('includes operation in error when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    await expect(
      apiRequest('/functions/v1/discs', {
        method: 'GET',
        operation: 'fetch-discs',
      })
    ).rejects.toMatchObject({
      operation: 'fetch-discs',
    });
  });

  it('uses error message from response when available', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Custom error message from server' }),
    });

    await expect(
      apiRequest('/functions/v1/test', { method: 'POST', body: {} })
    ).rejects.toThrow('Custom error message from server');
  });

  it('handles non-JSON error responses gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('Not JSON');
      },
    });

    await expect(
      apiRequest('/functions/v1/test', { method: 'GET' })
    ).rejects.toMatchObject({
      code: ApiErrorCode.API,
    });
  });

  it('does not require auth when skipAuth is true', async () => {
    const mockData = { public: true };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const result = await apiRequest('/functions/v1/public', {
      method: 'GET',
      skipAuth: true,
    });

    expect(supabase.auth.getSession).not.toHaveBeenCalled();
    expect(result).toEqual(mockData);
  });
});

describe('createApiError', () => {
  it('creates ApiError from fetch response', async () => {
    const response = {
      status: 404,
      json: async () => ({ error: 'Not found' }),
    } as Response;

    const error = await createApiError(response, 'test-op');

    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe(ApiErrorCode.NOT_FOUND);
    expect(error.operation).toBe('test-op');
    expect(error.message).toBe('Not found');
  });

  it('uses default message when response has no error field', async () => {
    const response = {
      status: 500,
      json: async () => ({}),
    } as Response;

    const error = await createApiError(response);

    expect(error.message).toBe('Request failed');
  });

  it('handles json parsing errors', async () => {
    const response = {
      status: 500,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    } as unknown as Response;

    const error = await createApiError(response);

    expect(error.message).toBe('Request failed');
  });
});
