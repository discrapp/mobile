import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { handleError } from '@/lib/errorHandler';

export interface DiscIdentification {
  manufacturer: string | null;
  mold: string | null;
  confidence: number;
  raw_text: string;
  flight_numbers: {
    speed: number | null;
    glide: number | null;
    turn: number | null;
    fade: number | null;
  } | null;
  plastic: string | null;
  color: string | null;
}

export interface CatalogMatch {
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

export interface IdentificationResult {
  identification: DiscIdentification;
  catalog_match: CatalogMatch | null;
  similar_matches: CatalogMatch[];
  processing_time_ms: number;
  log_id: string | null;
}

interface UseDiscIdentificationResult {
  identify: (imageUri: string) => Promise<IdentificationResult | null>;
  isLoading: boolean;
  error: string | null;
  result: IdentificationResult | null;
  reset: () => void;
}

/**
 * Hook for identifying discs from photos using AI.
 * Calls the identify-disc-from-photo edge function.
 */
export function useDiscIdentification(): UseDiscIdentificationResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IdentificationResult | null>(null);

  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);
  // Track current AbortController for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Abort any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const reset = useCallback(() => {
    if (isMountedRef.current) {
      setIsLoading(false);
      setError(null);
      setResult(null);
    }
  }, []);

  const identify = useCallback(async (imageUri: string): Promise<IdentificationResult | null> => {
    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
      setResult(null);
    }

    try {
      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (isMountedRef.current) {
          setError('You must be signed in to identify discs');
        }
        return null;
      }

      // Fetch the image and convert to blob
      const response = await fetch(imageUri, { signal: abortController.signal });
      const blob = await response.blob();

      // Check if aborted after image fetch
      if (abortController.signal.aborted || !isMountedRef.current) {
        return null;
      }

      // Create form data with the image
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: blob.type || 'image/jpeg',
        name: 'disc-photo.jpg',
      } as unknown as Blob);

      // Call the identify-disc-from-photo endpoint
      const apiResponse = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/identify-disc-from-photo`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
          signal: abortController.signal,
        }
      );

      // Check if aborted after API call
      if (abortController.signal.aborted || !isMountedRef.current) {
        return null;
      }

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        const errorMessage = data.details || data.error || 'Failed to identify disc';
        console.error('AI identification API error:', apiResponse.status, errorMessage, data);
        if (isMountedRef.current) {
          setError(errorMessage);
        }
        return null;
      }

      const identificationResult: IdentificationResult = {
        identification: data.identification,
        catalog_match: data.catalog_match,
        similar_matches: data.similar_matches || [],
        processing_time_ms: data.processing_time_ms,
        log_id: data.log_id || null,
      };

      if (isMountedRef.current) {
        setResult(identificationResult);
      }
      return identificationResult;
    } catch (err) {
      // Handle AbortError gracefully - don't set error state
      if (err instanceof Error && err.name === 'AbortError') {
        return null;
      }

      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
      handleError(err, { operation: 'identify-disc-from-photo' });
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  return {
    identify,
    isLoading,
    error,
    result,
    reset,
  };
}
