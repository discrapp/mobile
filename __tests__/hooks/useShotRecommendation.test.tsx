import { renderHook, waitFor, act } from '@testing-library/react-native';

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

import { useShotRecommendation } from '@/hooks/useShotRecommendation';
import { handleError } from '@/lib/errorHandler';

describe('useShotRecommendation', () => {
  const mockSession = {
    access_token: 'test-token',
    user: { id: 'user-123' },
  };

  const mockRecommendationResponse = {
    recommendation: {
      disc: {
        id: 'disc-1',
        name: 'Destroyer',
        manufacturer: 'Innova',
        flight_numbers: {
          speed: 12,
          glide: 5,
          turn: -1,
          fade: 3,
        },
      },
      throw_type: 'hyzer',
      power_percentage: 85,
      line_description: 'Aim left of center, let disc fade to basket.',
    },
    terrain_analysis: {
      estimated_distance_ft: 285,
      elevation_change: 'flat',
      obstacles: 'Tree line on right',
      fairway_shape: 'straight',
    },
    alternatives: [
      {
        disc: { id: 'disc-2', name: 'Wraith', manufacturer: 'Innova' },
        throw_type: 'flat',
        reason: 'More glide for uphill finish',
      },
    ],
    confidence: 0.85,
    processing_time_ms: 1200,
    log_id: 'log-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });
    (global.fetch as jest.Mock).mockReset();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useShotRecommendation());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
  });

  it('returns error when not authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useShotRecommendation());

    await act(async () => {
      const recommendation = await result.current.getRecommendation('file://test-image.jpg');
      expect(recommendation).toBeNull();
    });

    expect(result.current.error).toBe('You must be signed in to get shot recommendations');
    expect(result.current.isLoading).toBe(false);
  });

  it('sets loading state during request', async () => {
    // Create a promise we can control
    let resolveImageFetch: (value: Response) => void;
    const imagePromise = new Promise<Response>((resolve) => {
      resolveImageFetch = resolve;
    });

    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => imagePromise)
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRecommendationResponse),
        })
      );

    const { result } = renderHook(() => useShotRecommendation());

    // Start the request
    act(() => {
      result.current.getRecommendation('file://test-image.jpg');
    });

    // Should be loading
    expect(result.current.isLoading).toBe(true);

    // Resolve the image fetch
    await act(async () => {
      resolveImageFetch!({
        blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
      } as Response);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('successfully returns recommendation', async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({
          blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRecommendationResponse),
        })
      );

    const { result } = renderHook(() => useShotRecommendation());

    let recommendation: typeof mockRecommendationResponse | null = null;
    await act(async () => {
      recommendation = await result.current.getRecommendation('file://test-image.jpg');
    });

    expect(recommendation).toEqual(mockRecommendationResponse);
    expect(result.current.result).toEqual(mockRecommendationResponse);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('handles API error response', async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({
          blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'No discs in bag' }),
        })
      );

    const { result } = renderHook(() => useShotRecommendation());

    await act(async () => {
      const recommendation = await result.current.getRecommendation('file://test-image.jpg');
      expect(recommendation).toBeNull();
    });

    expect(result.current.error).toBe('No discs in bag');
    expect(result.current.isLoading).toBe(false);
  });

  it('handles API error with details', async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({
          blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 502,
          json: () =>
            Promise.resolve({
              error: 'AI recommendation failed',
              details: 'Claude API returned 500',
            }),
        })
      );

    const { result } = renderHook(() => useShotRecommendation());

    await act(async () => {
      await result.current.getRecommendation('file://test-image.jpg');
    });

    expect(result.current.error).toBe('Claude API returned 500');
  });

  it('handles network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useShotRecommendation());

    await act(async () => {
      const recommendation = await result.current.getRecommendation('file://test-image.jpg');
      expect(recommendation).toBeNull();
    });

    expect(result.current.error).toBe('Network error');
    expect(handleError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ operation: 'get-shot-recommendation' })
    );
  });

  it('calls correct API endpoint with auth header', async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({
          blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRecommendationResponse),
        })
      );

    const { result } = renderHook(() => useShotRecommendation());

    await act(async () => {
      await result.current.getRecommendation('file://test-image.jpg');
    });

    // Second call is the API call
    const apiCall = (global.fetch as jest.Mock).mock.calls[1];
    expect(apiCall[0]).toContain('/functions/v1/get-shot-recommendation');
    expect(apiCall[1].method).toBe('POST');
    expect(apiCall[1].headers.Authorization).toBe('Bearer test-token');
  });

  it('reset clears all state', async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({
          blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRecommendationResponse),
        })
      );

    const { result } = renderHook(() => useShotRecommendation());

    // Get a recommendation first
    await act(async () => {
      await result.current.getRecommendation('file://test-image.jpg');
    });

    expect(result.current.result).not.toBeNull();

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('clears previous result when starting new request', async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({
          blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRecommendationResponse),
        })
      );

    const { result } = renderHook(() => useShotRecommendation());

    // First request
    await act(async () => {
      await result.current.getRecommendation('file://test-image.jpg');
    });

    expect(result.current.result).not.toBeNull();

    // Start second request
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({
          blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
        })
      )
      .mockImplementationOnce(
        () =>
          new Promise(() => {
            // Never resolve
          })
      );

    act(() => {
      result.current.getRecommendation('file://another-image.jpg');
    });

    // Previous result should be cleared while loading
    expect(result.current.result).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('handles 503 service unavailable', async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({
          blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 503,
          json: () => Promise.resolve({ error: 'AI recommendation not configured' }),
        })
      );

    const { result } = renderHook(() => useShotRecommendation());

    await act(async () => {
      await result.current.getRecommendation('file://test-image.jpg');
    });

    expect(result.current.error).toBe('AI recommendation not configured');
  });
});
