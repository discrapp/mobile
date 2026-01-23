import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { handleError } from '@/lib/errorHandler';

interface DismissResult {
  success: boolean;
  message?: string;
  dismissed?: {
    id: string;
    disc_catalog_id: string;
    dismissed_at: string;
  };
}

interface UseDismissRecommendationResult {
  dismissDisc: (discCatalogId: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for dismissing disc recommendations so they won't be suggested again.
 * Calls the dismiss-disc-recommendation edge function.
 */
export function useDismissRecommendation(): UseDismissRecommendationResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dismissDisc = useCallback(async (discCatalogId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Get session for authentication
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be signed in to dismiss recommendations');
        return false;
      }

      // Call the dismiss-disc-recommendation endpoint
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/dismiss-disc-recommendation`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ disc_catalog_id: discCatalogId }),
        }
      );

      const data: DismissResult = await response.json();

      if (!response.ok) {
        const errorMessage = (data as { error?: string }).error || 'Failed to dismiss recommendation';
        console.error('Dismiss recommendation API error:', response.status, errorMessage);
        setError(errorMessage);
        return false;
      }

      // Success (including "already dismissed" case)
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      handleError(err, { operation: 'dismiss-disc-recommendation' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    dismissDisc,
    isLoading,
    error,
  };
}
