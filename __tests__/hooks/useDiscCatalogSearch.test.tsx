import { renderHook, act, waitFor } from '@testing-library/react-native';

// Mock fetch
global.fetch = jest.fn();

// Store original env value
const originalSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

// Set up test env
beforeAll(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
});

afterAll(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
});

import { useDiscCatalogSearch, CatalogDisc } from '@/hooks/useDiscCatalogSearch';

describe('useDiscCatalogSearch', () => {
  const mockSearchResults: CatalogDisc[] = [
    {
      id: 'disc-1',
      manufacturer: 'Innova',
      mold: 'Destroyer',
      category: 'Distance Driver',
      speed: 12,
      glide: 5,
      turn: -1,
      fade: 3,
      stability: 'overstable',
    },
    {
      id: 'disc-2',
      manufacturer: 'Innova',
      mold: 'Destroyerrr', // Typo variant
      category: 'Distance Driver',
      speed: 12,
      glide: 5,
      turn: -1,
      fade: 3,
      stability: 'overstable',
    },
  ];

  const mockSearchResponse = {
    results: mockSearchResults,
    count: 2,
    query: 'destroyer',
    limit: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (global.fetch as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() => useDiscCatalogSearch());

      expect(result.current.results).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.search).toBe('function');
      expect(typeof result.current.clearResults).toBe('function');
    });
  });

  describe('search query validation', () => {
    it('clears results when query is empty', () => {
      const { result } = renderHook(() => useDiscCatalogSearch());

      act(() => {
        result.current.search('');
      });

      expect(result.current.results).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('clears results when query is too short (less than 2 characters)', () => {
      const { result } = renderHook(() => useDiscCatalogSearch());

      act(() => {
        result.current.search('a');
      });

      expect(result.current.results).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('does not search with exactly 1 character', () => {
      const { result } = renderHook(() => useDiscCatalogSearch());

      act(() => {
        result.current.search('d');
      });

      jest.advanceTimersByTime(500);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('starts search with 2+ characters', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      const { result } = renderHook(() => useDiscCatalogSearch());

      act(() => {
        result.current.search('de');
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('debouncing', () => {
    it('debounces search calls', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      const { result } = renderHook(() => useDiscCatalogSearch());

      // Type quickly
      act(() => {
        result.current.search('de');
      });
      act(() => {
        result.current.search('des');
      });
      act(() => {
        result.current.search('dest');
      });
      act(() => {
        result.current.search('destr');
      });

      // Advance timer but not past debounce threshold
      await act(async () => {
        jest.advanceTimersByTime(200);
      });

      // No fetch calls yet
      expect(global.fetch).not.toHaveBeenCalled();

      // Advance past debounce threshold
      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Should only search for the last query
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=destr'),
        expect.any(Object)
      );
    });

    it('clears pending debounce when query becomes too short', async () => {
      const { result } = renderHook(() => useDiscCatalogSearch());

      act(() => {
        result.current.search('dest');
      });

      // Before debounce completes, clear the query
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      act(() => {
        result.current.search('d'); // Too short
      });

      // Wait for debounce time to pass
      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      // No fetch should have been made
      expect(global.fetch).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(false);
    });
  });

  describe('successful search', () => {
    it('returns search results on success', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      const { result } = renderHook(() => useDiscCatalogSearch());

      act(() => {
        result.current.search('destroyer');
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.results).toEqual(mockSearchResults);
      expect(result.current.error).toBeNull();
    });

    it('calls correct API endpoint with query parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      const { result } = renderHook(() => useDiscCatalogSearch());

      act(() => {
        result.current.search('destroyer');
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const url = fetchCall[0];

      // Check URL structure (env var is read at module load, so we check parts)
      expect(url).toContain('/functions/v1/search-disc-catalog');
      expect(url).toContain('q=destroyer');
      expect(url).toContain('limit=10');
      expect(fetchCall[1]).toEqual({
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: expect.any(AbortSignal),
      });
    });

    it('encodes special characters in query', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [], count: 0, query: 'disc & disc', limit: 10 }),
      });

      const { result } = renderHook(() => useDiscCatalogSearch());

      act(() => {
        result.current.search('disc & disc');
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const url = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(url).toContain('q=disc%20%26%20disc');
    });

    it('handles empty results', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [],
            count: 0,
            query: 'nonexistent',
            limit: 10,
          }),
      });

      const { result } = renderHook(() => useDiscCatalogSearch());

      act(() => {
        result.current.search('nonexistent');
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.results).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('loading state', () => {
    it('sets loading to true when search starts', () => {
      const { result } = renderHook(() => useDiscCatalogSearch());

      act(() => {
        result.current.search('destroyer');
      });

      expect(result.current.loading).toBe(true);
    });

    it('sets loading to false when search completes', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      const { result } = renderHook(() => useDiscCatalogSearch());

      act(() => {
        result.current.search('destroyer');
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('sets loading to false when search fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useDiscCatalogSearch());

      act(() => {
        result.current.search('destroyer');
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('sets error on API failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useDiscCatalogSearch());

      act(() => {
        result.current.search('destroyer');
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to search disc catalog');
      });

      expect(result.current.results).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    it('handles network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useDiscCatalogSearch());

      act(() => {
        result.current.search('destroyer');
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to search disc catalog');
      });

      expect(result.current.results).toEqual([]);
    });

    it('clears error on successful search after error', async () => {
      // First request fails
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useDiscCatalogSearch());

      act(() => {
        result.current.search('destroyer');
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Second request succeeds
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      act(() => {
        result.current.search('different');
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });

      expect(result.current.results).toEqual(mockSearchResults);
    });
  });

  describe('request cancellation', () => {
    it('ignores aborted requests', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      (global.fetch as jest.Mock).mockRejectedValue(abortError);

      const { result } = renderHook(() => useDiscCatalogSearch());

      act(() => {
        result.current.search('destroyer');
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      // Wait a bit more to ensure the error handler ran
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // AbortError should be ignored, no error set
      expect(result.current.error).toBeNull();
    });

    it('cancels previous request when new search starts', async () => {
      let firstFetchController: AbortController | null = null;

      (global.fetch as jest.Mock).mockImplementation((url, options) => {
        if (url.includes('first')) {
          firstFetchController = { signal: options.signal } as AbortController;
          return new Promise((_, reject) => {
            options.signal.addEventListener('abort', () => {
              const abortError = new Error('Aborted');
              abortError.name = 'AbortError';
              reject(abortError);
            });
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSearchResponse),
        });
      });

      const { result } = renderHook(() => useDiscCatalogSearch());

      // Start first search
      act(() => {
        result.current.search('first');
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      // Start second search before first completes
      act(() => {
        result.current.search('second');
      });

      // The abort should have been triggered
      expect(firstFetchController?.signal?.aborted).toBe(true);
    });
  });

  describe('clearResults', () => {
    it('clears results and error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      const { result } = renderHook(() => useDiscCatalogSearch());

      // First get some results
      act(() => {
        result.current.search('destroyer');
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.results.length).toBeGreaterThan(0);
      });

      // Now clear
      act(() => {
        result.current.clearResults();
      });

      expect(result.current.results).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('cancels pending debounce', async () => {
      const { result } = renderHook(() => useDiscCatalogSearch());

      act(() => {
        result.current.search('destroyer');
      });

      // Clear before debounce completes
      act(() => {
        result.current.clearResults();
      });

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      // No fetch should have been made
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('aborts in-flight request', async () => {
      let fetchController: AbortController | null = null;

      (global.fetch as jest.Mock).mockImplementation((_, options) => {
        fetchController = { signal: options.signal } as AbortController;
        return new Promise(() => {
          // Never resolve
        });
      });

      const { result } = renderHook(() => useDiscCatalogSearch());

      act(() => {
        result.current.search('destroyer');
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      // Clear while request is in flight
      act(() => {
        result.current.clearResults();
      });

      expect(fetchController?.signal?.aborted).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles discs with null flight numbers', async () => {
      const discWithNulls: CatalogDisc = {
        id: 'disc-3',
        manufacturer: 'Dynamic Discs',
        mold: 'Warden',
        category: 'Putter',
        speed: null,
        glide: null,
        turn: null,
        fade: null,
        stability: null,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [discWithNulls],
            count: 1,
            query: 'warden',
            limit: 10,
          }),
      });

      const { result } = renderHook(() => useDiscCatalogSearch());

      act(() => {
        result.current.search('warden');
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.results).toEqual([discWithNulls]);
      });
    });

    it('handles rapid successive searches correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      const { result } = renderHook(() => useDiscCatalogSearch());

      // Rapid typing simulation
      for (let i = 1; i <= 10; i++) {
        act(() => {
          result.current.search('d'.repeat(i));
        });
      }

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should only have made one fetch call
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('maintains function reference stability', () => {
      const { result, rerender } = renderHook(() => useDiscCatalogSearch());

      const initialSearch = result.current.search;
      const initialClearResults = result.current.clearResults;

      rerender({});

      expect(result.current.search).toBe(initialSearch);
      expect(result.current.clearResults).toBe(initialClearResults);
    });
  });
});
