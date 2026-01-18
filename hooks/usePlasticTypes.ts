import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

export interface PlasticType {
  id: string;
  manufacturer: string;
  plastic_name: string;
  display_order: number;
  status: string;
}

interface PlasticTypesResponse {
  plastics: PlasticType[];
  grouped: Record<string, string[]>;
  count: number;
  manufacturer: string | null;
}

interface UsePlasticTypesResult {
  plastics: string[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  submitPlastic: (manufacturer: string, plasticName: string) => Promise<boolean>;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

// Cache for plastic types by manufacturer
const plasticCache = new Map<string, { plastics: string[]; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Merge two arrays and remove duplicates (case-insensitive)
 */
function mergeAndDedupe(official: string[], custom: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  // Add official plastics first (they're already in order)
  for (const p of official) {
    const key = p.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(p);
    }
  }

  // Add custom plastics that aren't already in the list
  for (const p of custom) {
    const key = p.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(p);
    }
  }

  return result;
}

/**
 * Hook for fetching plastic types by manufacturer.
 * Results are cached to avoid repeated API calls.
 *
 * @param manufacturer - The manufacturer to filter by (case-insensitive)
 * @param userPlastics - Optional array of user's custom plastics from their discs
 */
export function usePlasticTypes(
  manufacturer: string | undefined,
  userPlastics: string[] = []
): UsePlasticTypesResult {
  // Store official plastics from API separately
  const [officialPlastics, setOfficialPlastics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoize userPlastics to avoid infinite loops
  const userPlasticsKey = useMemo(() => userPlastics.join('|'), [userPlastics]);

  // Merge official and user plastics
  const plastics = useMemo(() => {
    const customList = userPlasticsKey ? userPlasticsKey.split('|').filter(Boolean) : [];
    return mergeAndDedupe(officialPlastics, customList);
  }, [officialPlastics, userPlasticsKey]);

  const fetchPlastics = useCallback(async () => {
    // If no manufacturer, return empty
    if (!manufacturer?.trim()) {
      setOfficialPlastics([]);
      setLoading(false);
      return;
    }

    const cacheKey = manufacturer.toLowerCase();

    // Check cache
    const cached = plasticCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      setOfficialPlastics(cached.plastics);
      setLoading(false);
      return;
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Get session for auth (to include user's pending submissions)
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const url = `${SUPABASE_URL}/functions/v1/get-plastic-types?manufacturer=${encodeURIComponent(manufacturer)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch plastic types');
      }

      const data: PlasticTypesResponse = await response.json();

      // Extract plastic names from response
      const fetchedPlastics = data.plastics.map((p) => p.plastic_name);

      // Cache the official plastics
      plasticCache.set(cacheKey, {
        plastics: fetchedPlastics,
        timestamp: Date.now(),
      });

      setOfficialPlastics(fetchedPlastics);
      setError(null);
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('Plastic types fetch error:', err);
      setError('Failed to load plastic types');
      setOfficialPlastics([]);
    } finally {
      setLoading(false);
    }
  }, [manufacturer]);

  // Fetch on mount and when manufacturer changes
  useEffect(() => {
    fetchPlastics();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPlastics]);

  const submitPlastic = useCallback(
    async (mfr: string, plasticName: string): Promise<boolean> => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          setError('Must be signed in to submit plastic types');
          return false;
        }

        const response = await fetch(`${SUPABASE_URL}/functions/v1/submit-plastic-type`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            manufacturer: mfr,
            plastic_name: plasticName,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          if (response.status === 409) {
            // Already exists - not an error, just info
            return true;
          }
          throw new Error(data.error || 'Failed to submit plastic type');
        }

        // Invalidate cache for this manufacturer
        plasticCache.delete(mfr.toLowerCase());

        // Refetch to include the new pending submission
        await fetchPlastics();

        return true;
      } catch (err) {
        console.error('Submit plastic type error:', err);
        setError('Failed to submit plastic type');
        return false;
      }
    },
    [fetchPlastics]
  );

  return {
    plastics,
    loading,
    error,
    refetch: fetchPlastics,
    submitPlastic,
  };
}
