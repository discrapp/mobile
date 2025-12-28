import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { handleError } from '@/lib/errorHandler';

export interface DiscInfo {
  id: string;
  name: string | null;
  manufacturer: string | null;
  flight_numbers: {
    speed: number | null;
    glide: number | null;
    turn: number | null;
    fade: number | null;
  } | null;
}

export interface ShotRecommendation {
  disc: DiscInfo | null;
  throw_type: 'hyzer' | 'flat' | 'anhyzer';
  power_percentage: number;
  line_description: string;
}

export interface TerrainAnalysis {
  estimated_distance_ft: number;
  elevation_change: 'uphill' | 'downhill' | 'flat';
  obstacles: string;
  fairway_shape: 'straight' | 'dogleg_left' | 'dogleg_right' | 'open';
}

export interface AlternativeRecommendation {
  disc: Partial<DiscInfo>;
  throw_type: string;
  reason: string;
}

export interface ShotRecommendationResult {
  recommendation: ShotRecommendation;
  terrain_analysis: TerrainAnalysis;
  alternatives: AlternativeRecommendation[];
  confidence: number;
  processing_time_ms: number;
  log_id: string | null;
}

interface UseShotRecommendationResult {
  getRecommendation: (imageUri: string) => Promise<ShotRecommendationResult | null>;
  isLoading: boolean;
  error: string | null;
  result: ShotRecommendationResult | null;
  reset: () => void;
}

/**
 * Hook for getting AI-powered shot recommendations from hole photos.
 * Calls the get-shot-recommendation edge function.
 */
export function useShotRecommendation(): UseShotRecommendationResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShotRecommendationResult | null>(null);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setResult(null);
  }, []);

  const getRecommendation = useCallback(
    async (imageUri: string): Promise<ShotRecommendationResult | null> => {
      setIsLoading(true);
      setError(null);
      setResult(null);

      try {
        // Get session for authentication
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setError('You must be signed in to get shot recommendations');
          return null;
        }

        // Fetch the image and convert to blob
        const response = await fetch(imageUri);
        const blob = await response.blob();

        // Create form data with the image
        const formData = new FormData();
        formData.append('image', {
          uri: imageUri,
          type: blob.type || 'image/jpeg',
          name: 'hole-photo.jpg',
        } as unknown as Blob);

        // Call the get-shot-recommendation endpoint
        const apiResponse = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-shot-recommendation`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: formData,
          }
        );

        const data = await apiResponse.json();

        if (!apiResponse.ok) {
          const errorMessage = data.details || data.error || 'Failed to get shot recommendation';
          console.error('Shot recommendation API error:', apiResponse.status, errorMessage, data);
          setError(errorMessage);
          return null;
        }

        const recommendationResult: ShotRecommendationResult = {
          recommendation: data.recommendation,
          terrain_analysis: data.terrain_analysis,
          alternatives: data.alternatives || [],
          confidence: data.confidence,
          processing_time_ms: data.processing_time_ms,
          log_id: data.log_id || null,
        };

        setResult(recommendationResult);
        return recommendationResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        handleError(err, { operation: 'get-shot-recommendation' });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    getRecommendation,
    isLoading,
    error,
    result,
    reset,
  };
}
