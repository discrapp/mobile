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

import {
  useDiscIdentification,
  DiscIdentification,
  CatalogMatch,
  IdentificationResult,
} from '@/hooks/useDiscIdentification';
import { handleError } from '@/lib/errorHandler';

describe('useDiscIdentification', () => {
  const mockSession = {
    access_token: 'test-token',
    user: { id: 'user-123' },
  };

  const mockIdentification: DiscIdentification = {
    manufacturer: 'Innova',
    mold: 'Destroyer',
    confidence: 0.92,
    raw_text: 'INNOVA DESTROYER 12 5 -1 3',
    flight_numbers: {
      speed: 12,
      glide: 5,
      turn: -1,
      fade: 3,
    },
    plastic: 'Star',
    color: 'blue',
  };

  const mockCatalogMatch: CatalogMatch = {
    id: 'catalog-1',
    manufacturer: 'Innova',
    mold: 'Destroyer',
    category: 'Distance Driver',
    speed: 12,
    glide: 5,
    turn: -1,
    fade: 3,
    stability: 'overstable',
  };

  const mockSimilarMatches: CatalogMatch[] = [
    {
      id: 'catalog-2',
      manufacturer: 'Innova',
      mold: 'Wraith',
      category: 'Distance Driver',
      speed: 11,
      glide: 5,
      turn: -1,
      fade: 3,
      stability: 'overstable',
    },
  ];

  const mockIdentificationResponse = {
    identification: mockIdentification,
    catalog_match: mockCatalogMatch,
    similar_matches: mockSimilarMatches,
    processing_time_ms: 1500,
    log_id: 'log-123',
  };

  const testImageUri = 'file://test-disc-photo.jpg';

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });
    (global.fetch as jest.Mock).mockReset();
  });

  describe('initialization', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() => useDiscIdentification());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.result).toBeNull();
      expect(typeof result.current.identify).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('authentication', () => {
    it('returns error when not authenticated', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { result } = renderHook(() => useDiscIdentification());

      await act(async () => {
        const identification = await result.current.identify(testImageUri);
        expect(identification).toBeNull();
      });

      expect(result.current.error).toBe('You must be signed in to identify discs');
      expect(result.current.isLoading).toBe(false);
    });

    it('includes authorization header with session token', async () => {
      (global.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockIdentificationResponse),
          })
        );

      const { result } = renderHook(() => useDiscIdentification());

      await act(async () => {
        await result.current.identify(testImageUri);
      });

      // Second call is the API call
      const apiCall = (global.fetch as jest.Mock).mock.calls[1];
      expect(apiCall[1].headers.Authorization).toBe('Bearer test-token');
    });
  });

  describe('loading state', () => {
    it('sets loading to true during identification', async () => {
      // Create a controlled promise
      let resolveImageFetch: (value: Response) => void;
      const imagePromise = new Promise<Response>((resolve) => {
        resolveImageFetch = resolve;
      });

      (global.fetch as jest.Mock)
        .mockImplementationOnce(() => imagePromise)
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockIdentificationResponse),
          })
        );

      const { result } = renderHook(() => useDiscIdentification());

      // Start the request
      act(() => {
        result.current.identify(testImageUri);
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

    it('sets loading to false after successful identification', async () => {
      (global.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockIdentificationResponse),
          })
        );

      const { result } = renderHook(() => useDiscIdentification());

      await act(async () => {
        await result.current.identify(testImageUri);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('sets loading to false after failed identification', async () => {
      (global.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Server error' }),
          })
        );

      const { result } = renderHook(() => useDiscIdentification());

      await act(async () => {
        await result.current.identify(testImageUri);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('successful identification', () => {
    it('returns identification result on success', async () => {
      (global.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockIdentificationResponse),
          })
        );

      const { result } = renderHook(() => useDiscIdentification());

      let returnedResult: IdentificationResult | null = null;
      await act(async () => {
        returnedResult = await result.current.identify(testImageUri);
      });

      const expectedResult: IdentificationResult = {
        identification: mockIdentification,
        catalog_match: mockCatalogMatch,
        similar_matches: mockSimilarMatches,
        processing_time_ms: 1500,
        log_id: 'log-123',
      };

      expect(returnedResult).toEqual(expectedResult);
      expect(result.current.result).toEqual(expectedResult);
      expect(result.current.error).toBeNull();
    });

    it('calls correct API endpoint', async () => {
      (global.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockIdentificationResponse),
          })
        );

      const { result } = renderHook(() => useDiscIdentification());

      await act(async () => {
        await result.current.identify(testImageUri);
      });

      // Second call is the API call
      const apiCall = (global.fetch as jest.Mock).mock.calls[1];
      expect(apiCall[0]).toContain('/functions/v1/identify-disc-from-photo');
      expect(apiCall[1].method).toBe('POST');
    });

    it('sends image as FormData', async () => {
      (global.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockIdentificationResponse),
          })
        );

      const { result } = renderHook(() => useDiscIdentification());

      await act(async () => {
        await result.current.identify(testImageUri);
      });

      const apiCall = (global.fetch as jest.Mock).mock.calls[1];
      expect(apiCall[1].body).toBeInstanceOf(FormData);
    });

    it('handles response without similar_matches', async () => {
      const responseWithoutSimilar = {
        ...mockIdentificationResponse,
        similar_matches: undefined,
      };

      (global.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(responseWithoutSimilar),
          })
        );

      const { result } = renderHook(() => useDiscIdentification());

      await act(async () => {
        await result.current.identify(testImageUri);
      });

      expect(result.current.result?.similar_matches).toEqual([]);
    });

    it('handles response without log_id', async () => {
      const responseWithoutLogId = {
        ...mockIdentificationResponse,
        log_id: undefined,
      };

      (global.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(responseWithoutLogId),
          })
        );

      const { result } = renderHook(() => useDiscIdentification());

      await act(async () => {
        await result.current.identify(testImageUri);
      });

      expect(result.current.result?.log_id).toBeNull();
    });

    it('handles null catalog_match', async () => {
      const responseWithNullMatch = {
        ...mockIdentificationResponse,
        catalog_match: null,
      };

      (global.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(responseWithNullMatch),
          })
        );

      const { result } = renderHook(() => useDiscIdentification());

      await act(async () => {
        await result.current.identify(testImageUri);
      });

      expect(result.current.result?.catalog_match).toBeNull();
    });
  });

  describe('error handling', () => {
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
            json: () => Promise.resolve({ error: 'Invalid image format' }),
          })
        );

      const { result } = renderHook(() => useDiscIdentification());

      await act(async () => {
        const identification = await result.current.identify(testImageUri);
        expect(identification).toBeNull();
      });

      expect(result.current.error).toBe('Invalid image format');
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
                error: 'AI identification failed',
                details: 'Vision API rate limit exceeded',
              }),
          })
        );

      const { result } = renderHook(() => useDiscIdentification());

      await act(async () => {
        await result.current.identify(testImageUri);
      });

      // Should use details if available
      expect(result.current.error).toBe('Vision API rate limit exceeded');
    });

    it('handles network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useDiscIdentification());

      await act(async () => {
        const identification = await result.current.identify(testImageUri);
        expect(identification).toBeNull();
      });

      expect(result.current.error).toBe('Network error');
      expect(handleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ operation: 'identify-disc-from-photo' })
      );
    });

    it('handles image fetch errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Failed to fetch image'));

      const { result } = renderHook(() => useDiscIdentification());

      await act(async () => {
        const identification = await result.current.identify(testImageUri);
        expect(identification).toBeNull();
      });

      expect(result.current.error).toBe('Failed to fetch image');
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
            json: () => Promise.resolve({ error: 'AI identification not configured' }),
          })
        );

      const { result } = renderHook(() => useDiscIdentification());

      await act(async () => {
        await result.current.identify(testImageUri);
      });

      expect(result.current.error).toBe('AI identification not configured');
    });

    it('falls back to default error message when no error details', async () => {
      (global.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({}),
          })
        );

      const { result } = renderHook(() => useDiscIdentification());

      await act(async () => {
        await result.current.identify(testImageUri);
      });

      expect(result.current.error).toBe('Failed to identify disc');
    });
  });

  describe('reset', () => {
    it('clears all state', async () => {
      (global.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockIdentificationResponse),
          })
        );

      const { result } = renderHook(() => useDiscIdentification());

      // First get an identification result
      await act(async () => {
        await result.current.identify(testImageUri);
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

    it('clears error state after failed identification', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useDiscIdentification());

      await act(async () => {
        await result.current.identify(testImageUri);
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('state clearing on new request', () => {
    it('clears previous result when starting new identification', async () => {
      (global.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockIdentificationResponse),
          })
        );

      const { result } = renderHook(() => useDiscIdentification());

      // First identification
      await act(async () => {
        await result.current.identify(testImageUri);
      });

      expect(result.current.result).not.toBeNull();

      // Start second identification (never resolves)
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
        result.current.identify('file://another-disc.jpg');
      });

      // Previous result should be cleared
      expect(result.current.result).toBeNull();
      expect(result.current.isLoading).toBe(true);
    });

    it('clears previous error when starting new identification', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useDiscIdentification());

      await act(async () => {
        await result.current.identify(testImageUri);
      });

      expect(result.current.error).not.toBeNull();

      // Start second identification
      (global.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockIdentificationResponse),
          })
        );

      await act(async () => {
        await result.current.identify('file://another-disc.jpg');
      });

      expect(result.current.error).toBeNull();
      expect(result.current.result).not.toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles identification with partial flight numbers', async () => {
      const partialFlightNumbers = {
        ...mockIdentificationResponse,
        identification: {
          ...mockIdentification,
          flight_numbers: {
            speed: 12,
            glide: null,
            turn: null,
            fade: 3,
          },
        },
      };

      (global.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(partialFlightNumbers),
          })
        );

      const { result } = renderHook(() => useDiscIdentification());

      await act(async () => {
        await result.current.identify(testImageUri);
      });

      expect(result.current.result?.identification.flight_numbers?.speed).toBe(12);
      expect(result.current.result?.identification.flight_numbers?.glide).toBeNull();
    });

    it('handles identification with null flight_numbers', async () => {
      const nullFlightNumbers = {
        ...mockIdentificationResponse,
        identification: {
          ...mockIdentification,
          flight_numbers: null,
        },
      };

      (global.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(nullFlightNumbers),
          })
        );

      const { result } = renderHook(() => useDiscIdentification());

      await act(async () => {
        await result.current.identify(testImageUri);
      });

      expect(result.current.result?.identification.flight_numbers).toBeNull();
    });

    it('handles low confidence identification', async () => {
      const lowConfidence = {
        ...mockIdentificationResponse,
        identification: {
          ...mockIdentification,
          confidence: 0.35,
          manufacturer: null,
          mold: null,
        },
      };

      (global.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(lowConfidence),
          })
        );

      const { result } = renderHook(() => useDiscIdentification());

      await act(async () => {
        await result.current.identify(testImageUri);
      });

      expect(result.current.result?.identification.confidence).toBe(0.35);
      expect(result.current.result?.identification.manufacturer).toBeNull();
    });

    it('handles non-Error exceptions', async () => {
      (global.fetch as jest.Mock).mockRejectedValue('String error');

      const { result } = renderHook(() => useDiscIdentification());

      await act(async () => {
        await result.current.identify(testImageUri);
      });

      expect(result.current.error).toBe('An error occurred');
    });

    it('maintains function reference stability', () => {
      const { result, rerender } = renderHook(() => useDiscIdentification());

      const initialIdentify = result.current.identify;
      const initialReset = result.current.reset;

      rerender({});

      expect(result.current.identify).toBe(initialIdentify);
      expect(result.current.reset).toBe(initialReset);
    });
  });

  describe('abort and cleanup', () => {
    it('handles AbortError gracefully without setting error state', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      (global.fetch as jest.Mock).mockRejectedValue(abortError);

      const { result } = renderHook(() => useDiscIdentification());

      await act(async () => {
        await result.current.identify(testImageUri);
      });

      // AbortError should not set an error message
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('does not update state after unmount', async () => {
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      // Create a delayed promise to simulate slow network
      let resolveImageFetch: (value: Response) => void;
      const imagePromise = new Promise<Response>((resolve) => {
        resolveImageFetch = resolve;
      });

      (global.fetch as jest.Mock).mockImplementation(() => imagePromise);

      const { result, unmount } = renderHook(() => useDiscIdentification());

      // Start the request
      act(() => {
        result.current.identify(testImageUri);
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Unmount before the promise resolves
      unmount();

      // Now resolve the image fetch after unmount
      resolveImageFetch!({
        blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
      } as Response);

      // Wait a tick to ensure async operations complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // Check that no warnings about state updates on unmounted components
      const stateUpdateWarning = consoleWarn.mock.calls.find(
        call => call[0]?.includes?.('state update on an unmounted')
      ) || consoleError.mock.calls.find(
        call => call[0]?.includes?.('state update on an unmounted') ||
               call[0]?.includes?.("Can't perform a React state update")
      );

      expect(stateUpdateWarning).toBeUndefined();

      consoleWarn.mockRestore();
      consoleError.mockRestore();
    });
  });
});
