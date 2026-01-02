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

import { useDiscRecommendations } from '@/hooks/useDiscRecommendations';
import { handleError } from '@/lib/errorHandler';

describe('useDiscRecommendations', () => {
  const mockSession = {
    access_token: 'test-token',
    user: { id: 'user-123' },
  };

  const mockRecommendationResponse = {
    recommendations: [
      {
        disc: {
          id: 'catalog-1',
          manufacturer: 'Innova',
          mold: 'Leopard',
          category: 'Fairway Driver',
          flight_numbers: {
            speed: 6,
            glide: 5,
            turn: -2,
            fade: 1,
          },
          stability: 'Understable',
        },
        reason: 'Your bag lacks an understable fairway driver for turnover shots.',
        gap_type: 'stability',
        priority: 1,
        purchase_url: 'https://infinitediscs.com/search?s=Innova%20Leopard&aff=test',
      },
    ],
    bag_analysis: {
      total_discs: 5,
      brand_preferences: [
        { manufacturer: 'Innova', count: 3 },
        { manufacturer: 'Discraft', count: 2 },
      ],
      plastic_preferences: [
        { plastic: 'Star', count: 3 },
        { plastic: 'Z', count: 2 },
      ],
      speed_coverage: {
        min: 5,
        max: 12,
        gaps: [],
      },
      stability_by_category: [
        { category: 'Distance Driver', understable: 0, stable: 1, overstable: 1 },
        { category: 'Midrange', understable: 1, stable: 1, overstable: 0 },
      ],
      identified_gaps: ['No understable Fairway Driver'],
    },
    confidence: 0.85,
    processing_time_ms: 1500,
    log_id: 'log-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });
    (global.fetch as jest.Mock).mockReset();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useDiscRecommendations());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
  });

  it('returns error when not authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useDiscRecommendations());

    await act(async () => {
      const recommendations = await result.current.getRecommendations(1);
      expect(recommendations).toBeNull();
    });

    expect(result.current.error).toBe('You must be signed in to get recommendations');
    expect(result.current.isLoading).toBe(false);
  });

  it('sets loading state during request', async () => {
    let resolveRequest: (value: Response) => void;
    const requestPromise = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });

    (global.fetch as jest.Mock).mockImplementationOnce(() => requestPromise);

    const { result } = renderHook(() => useDiscRecommendations());

    // Start the request
    act(() => {
      result.current.getRecommendations(1);
    });

    // Should be loading
    expect(result.current.isLoading).toBe(true);

    // Resolve the request
    await act(async () => {
      resolveRequest!({
        ok: true,
        json: () => Promise.resolve(mockRecommendationResponse),
      } as Response);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('successfully returns 1 recommendation', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockRecommendationResponse),
      })
    );

    const { result } = renderHook(() => useDiscRecommendations());

    await act(async () => {
      const recommendations = await result.current.getRecommendations(1);
      expect(recommendations).not.toBeNull();
    });

    expect(result.current.result).toEqual(mockRecommendationResponse);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('successfully returns 3 recommendations', async () => {
    const threeRecResponse = {
      ...mockRecommendationResponse,
      recommendations: [
        mockRecommendationResponse.recommendations[0],
        { ...mockRecommendationResponse.recommendations[0], priority: 2 },
        { ...mockRecommendationResponse.recommendations[0], priority: 3 },
      ],
    };

    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(threeRecResponse),
      })
    );

    const { result } = renderHook(() => useDiscRecommendations());

    await act(async () => {
      await result.current.getRecommendations(3);
    });

    expect(result.current.result?.recommendations).toHaveLength(3);
  });

  it('successfully returns 5 recommendations', async () => {
    const fiveRecResponse = {
      ...mockRecommendationResponse,
      recommendations: Array(5)
        .fill(null)
        .map((_, i) => ({
          ...mockRecommendationResponse.recommendations[0],
          priority: i + 1,
        })),
    };

    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(fiveRecResponse),
      })
    );

    const { result } = renderHook(() => useDiscRecommendations());

    await act(async () => {
      await result.current.getRecommendations(5);
    });

    expect(result.current.result?.recommendations).toHaveLength(5);
  });

  it('handles API error response', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'No discs in bag. Add discs to get recommendations.' }),
      })
    );

    const { result } = renderHook(() => useDiscRecommendations());

    await act(async () => {
      const recommendations = await result.current.getRecommendations(1);
      expect(recommendations).toBeNull();
    });

    expect(result.current.error).toBe('No discs in bag. Add discs to get recommendations.');
    expect(result.current.isLoading).toBe(false);
  });

  it('handles API error with details', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 502,
        json: () =>
          Promise.resolve({
            error: 'AI recommendations failed',
            details: 'Claude API returned 500',
          }),
      })
    );

    const { result } = renderHook(() => useDiscRecommendations());

    await act(async () => {
      await result.current.getRecommendations(1);
    });

    expect(result.current.error).toBe('Claude API returned 500');
  });

  it('handles network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDiscRecommendations());

    await act(async () => {
      const recommendations = await result.current.getRecommendations(1);
      expect(recommendations).toBeNull();
    });

    expect(result.current.error).toBe('Network error');
    expect(handleError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ operation: 'get-disc-recommendations' })
    );
  });

  it('calls correct API endpoint with auth header and count', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockRecommendationResponse),
      })
    );

    const { result } = renderHook(() => useDiscRecommendations());

    await act(async () => {
      await result.current.getRecommendations(3);
    });

    const apiCall = (global.fetch as jest.Mock).mock.calls[0];
    expect(apiCall[0]).toContain('/functions/v1/get-disc-recommendations');
    expect(apiCall[1].method).toBe('POST');
    expect(apiCall[1].headers.Authorization).toBe('Bearer test-token');
    expect(apiCall[1].headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(apiCall[1].body)).toEqual({ count: 3 });
  });

  it('reset clears all state', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockRecommendationResponse),
      })
    );

    const { result } = renderHook(() => useDiscRecommendations());

    // Get recommendations first
    await act(async () => {
      await result.current.getRecommendations(1);
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
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockRecommendationResponse),
      })
    );

    const { result } = renderHook(() => useDiscRecommendations());

    // First request
    await act(async () => {
      await result.current.getRecommendations(1);
    });

    expect(result.current.result).not.toBeNull();

    // Start second request (never resolve)
    (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));

    act(() => {
      result.current.getRecommendations(3);
    });

    // Previous result should be cleared while loading
    expect(result.current.result).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('handles 503 service unavailable', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ error: 'AI recommendations not configured' }),
      })
    );

    const { result } = renderHook(() => useDiscRecommendations());

    await act(async () => {
      await result.current.getRecommendations(1);
    });

    expect(result.current.error).toBe('AI recommendations not configured');
  });

  it('includes bag_analysis in result', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockRecommendationResponse),
      })
    );

    const { result } = renderHook(() => useDiscRecommendations());

    await act(async () => {
      await result.current.getRecommendations(1);
    });

    expect(result.current.result?.bag_analysis).toBeDefined();
    expect(result.current.result?.bag_analysis.total_discs).toBe(5);
    expect(result.current.result?.bag_analysis.brand_preferences).toHaveLength(2);
    expect(result.current.result?.bag_analysis.identified_gaps).toContain('No understable Fairway Driver');
  });

  it('includes purchase_url in recommendations', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockRecommendationResponse),
      })
    );

    const { result } = renderHook(() => useDiscRecommendations());

    await act(async () => {
      await result.current.getRecommendations(1);
    });

    expect(result.current.result?.recommendations[0].purchase_url).toContain('infinitediscs.com');
  });

  it('includes confidence and processing_time_ms in result', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockRecommendationResponse),
      })
    );

    const { result } = renderHook(() => useDiscRecommendations());

    await act(async () => {
      await result.current.getRecommendations(1);
    });

    expect(result.current.result?.confidence).toBe(0.85);
    expect(result.current.result?.processing_time_ms).toBe(1500);
    expect(result.current.result?.log_id).toBe('log-123');
  });
});
