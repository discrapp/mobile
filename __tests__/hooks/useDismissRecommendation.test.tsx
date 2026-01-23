import { renderHook, act } from '@testing-library/react-native';

// Mock Supabase
const mockGetSession = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

// Mock error handler
jest.mock('@/lib/errorHandler', () => ({
  handleError: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

import { useDismissRecommendation } from '@/hooks/useDismissRecommendation';
import { handleError } from '@/lib/errorHandler';

describe('useDismissRecommendation', () => {
  const mockSession = {
    access_token: 'test-token',
    user: { id: 'user-123' },
  };

  const mockDismissResponse = {
    success: true,
    dismissed: {
      id: 'dismiss-123',
      disc_catalog_id: 'catalog-456',
      dismissed_at: '2024-01-15T12:00:00Z',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });
    (global.fetch as jest.Mock).mockReset();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useDismissRecommendation());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns error when not authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useDismissRecommendation());

    await act(async () => {
      const success = await result.current.dismissDisc('catalog-456');
      expect(success).toBe(false);
    });

    expect(result.current.error).toBe('You must be signed in to dismiss recommendations');
    expect(result.current.isLoading).toBe(false);
  });

  it('sets loading state during request', async () => {
    let resolveRequest: (value: Response) => void;
    const requestPromise = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });

    (global.fetch as jest.Mock).mockImplementationOnce(() => requestPromise);

    const { result } = renderHook(() => useDismissRecommendation());

    // Start the request
    act(() => {
      result.current.dismissDisc('catalog-456');
    });

    // Should be loading
    expect(result.current.isLoading).toBe(true);

    // Resolve the request
    await act(async () => {
      resolveRequest!({
        ok: true,
        json: () => Promise.resolve(mockDismissResponse),
      } as Response);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('successfully dismisses a disc', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDismissResponse),
      })
    );

    const { result } = renderHook(() => useDismissRecommendation());

    await act(async () => {
      const success = await result.current.dismissDisc('catalog-456');
      expect(success).toBe(true);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('handles already dismissed disc gracefully', async () => {
    const alreadyDismissedResponse = {
      success: true,
      message: 'Disc already dismissed',
    };

    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(alreadyDismissedResponse),
      })
    );

    const { result } = renderHook(() => useDismissRecommendation());

    await act(async () => {
      const success = await result.current.dismissDisc('catalog-456');
      expect(success).toBe(true);
    });

    expect(result.current.error).toBeNull();
  });

  it('handles API error response', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Disc not found in catalog' }),
      })
    );

    const { result } = renderHook(() => useDismissRecommendation());

    await act(async () => {
      const success = await result.current.dismissDisc('nonexistent-disc');
      expect(success).toBe(false);
    });

    expect(result.current.error).toBe('Disc not found in catalog');
    expect(result.current.isLoading).toBe(false);
  });

  it('handles network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDismissRecommendation());

    await act(async () => {
      const success = await result.current.dismissDisc('catalog-456');
      expect(success).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(handleError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ operation: 'dismiss-disc-recommendation' })
    );
  });

  it('calls correct API endpoint with auth header and disc_catalog_id', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDismissResponse),
      })
    );

    const { result } = renderHook(() => useDismissRecommendation());

    await act(async () => {
      await result.current.dismissDisc('catalog-456');
    });

    const apiCall = (global.fetch as jest.Mock).mock.calls[0];
    expect(apiCall[0]).toContain('/functions/v1/dismiss-disc-recommendation');
    expect(apiCall[1].method).toBe('POST');
    expect(apiCall[1].headers.Authorization).toBe('Bearer test-token');
    expect(apiCall[1].headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(apiCall[1].body)).toEqual({ disc_catalog_id: 'catalog-456' });
  });

  it('handles 400 bad request error', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'disc_catalog_id is required' }),
      })
    );

    const { result } = renderHook(() => useDismissRecommendation());

    await act(async () => {
      const success = await result.current.dismissDisc('');
      expect(success).toBe(false);
    });

    expect(result.current.error).toBe('disc_catalog_id is required');
  });

  it('handles 500 server error', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Failed to dismiss recommendation' }),
      })
    );

    const { result } = renderHook(() => useDismissRecommendation());

    await act(async () => {
      const success = await result.current.dismissDisc('catalog-456');
      expect(success).toBe(false);
    });

    expect(result.current.error).toBe('Failed to dismiss recommendation');
  });

  it('clears error on new request', async () => {
    // First request fails
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Disc not found' }),
      })
    );

    const { result } = renderHook(() => useDismissRecommendation());

    await act(async () => {
      await result.current.dismissDisc('bad-id');
    });

    expect(result.current.error).toBe('Disc not found');

    // Second request succeeds
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDismissResponse),
      })
    );

    await act(async () => {
      await result.current.dismissDisc('catalog-456');
    });

    // Error should be cleared
    expect(result.current.error).toBeNull();
  });
});
