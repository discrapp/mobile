import { useState, useCallback, useRef } from 'react';

export interface CatalogDisc {
  id: string;
  manufacturer: string;
  mold: string;
  category: string | null;
  speed: number | null;
  glide: number | null;
  turn: number | null;
  fade: number | null;
  stability: string | null;
}

interface SearchResponse {
  results: CatalogDisc[];
  count: number;
  query: string;
  limit: number;
}

interface UseDiscCatalogSearchResult {
  results: CatalogDisc[];
  loading: boolean;
  error: string | null;
  search: (query: string) => void;
  clearResults: () => void;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

/**
 * Hook for searching the disc catalog with debouncing.
 * Used for autocomplete when users type in the mold field.
 */
export function useDiscCatalogSearch(): UseDiscCatalogSearchResult {
  const [results, setResults] = useState<CatalogDisc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback((query: string) => {
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear results if query is too short
    if (!query || query.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);

    // Debounce the API call
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const url = `${SUPABASE_URL}/functions/v1/search-disc-catalog?q=${encodeURIComponent(query)}&limit=10`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data: SearchResponse = await response.json();
        setResults(data.results);
        setError(null);
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('Disc catalog search error:', err);
        setError('Failed to search disc catalog');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    results,
    loading,
    error,
    search,
    clearResults,
  };
}
