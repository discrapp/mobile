import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { handleError } from '@/lib/errorHandler';

export interface FlightNumbers {
  speed: number;
  glide: number;
  turn: number;
  fade: number;
}

export interface RecommendedDisc {
  id: string;
  manufacturer: string;
  mold: string;
  category: string | null;
  flight_numbers: FlightNumbers | null;
  stability: string | null;
}

export interface DiscRecommendation {
  disc: RecommendedDisc;
  reason: string;
  gap_type: 'speed_range' | 'stability' | 'category';
  priority: number;
  purchase_url: string;
}

export interface BrandPreference {
  manufacturer: string;
  count: number;
}

export interface PlasticPreference {
  plastic: string;
  count: number;
}

export interface SpeedGap {
  from: number;
  to: number;
}

export interface StabilityByCategory {
  category: string;
  understable: number;
  stable: number;
  overstable: number;
}

export interface BagAnalysis {
  total_discs: number;
  brand_preferences: BrandPreference[];
  plastic_preferences: PlasticPreference[];
  speed_coverage: {
    min: number;
    max: number;
    gaps: SpeedGap[];
  };
  stability_by_category: StabilityByCategory[];
  identified_gaps: string[];
}

export interface DiscRecommendationResult {
  recommendations: DiscRecommendation[];
  bag_analysis: BagAnalysis;
  confidence: number;
  processing_time_ms: number;
  log_id: string | null;
}

interface UseDiscRecommendationsResult {
  getRecommendations: (count: 1 | 3 | 5) => Promise<DiscRecommendationResult | null>;
  isLoading: boolean;
  error: string | null;
  result: DiscRecommendationResult | null;
  reset: () => void;
}

/**
 * Hook for getting AI-powered disc recommendations to fill bag gaps.
 * Calls the get-disc-recommendations edge function.
 */
export function useDiscRecommendations(): UseDiscRecommendationsResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiscRecommendationResult | null>(null);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setResult(null);
  }, []);

  const getRecommendations = useCallback(
    async (count: 1 | 3 | 5): Promise<DiscRecommendationResult | null> => {
      setIsLoading(true);
      setError(null);
      setResult(null);

      try {
        // Get session for authentication
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setError('You must be signed in to get recommendations');
          return null;
        }

        // Call the get-disc-recommendations endpoint
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-disc-recommendations`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ count }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data.details || data.error || 'Failed to get recommendations';
          console.error('Disc recommendations API error:', response.status, errorMessage, data);
          setError(errorMessage);
          return null;
        }

        const recommendationResult: DiscRecommendationResult = {
          recommendations: data.recommendations,
          bag_analysis: data.bag_analysis,
          confidence: data.confidence,
          processing_time_ms: data.processing_time_ms,
          log_id: data.log_id || null,
        };

        setResult(recommendationResult);
        return recommendationResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        handleError(err, { operation: 'get-disc-recommendations' });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    getRecommendations,
    isLoading,
    error,
    result,
    reset,
  };
}
