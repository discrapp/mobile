import { renderHook, waitFor } from '@testing-library/react-native';

// Mock fetch
global.fetch = jest.fn();

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      }),
    },
  },
}));

// Store original env value
const originalSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

// Set up test env
beforeAll(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
});

afterAll(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
});

import { usePlasticTypes, PlasticType } from '@/hooks/usePlasticTypes';

describe('usePlasticTypes', () => {
  const mockPlastics: PlasticType[] = [
    { id: 'pt-1', manufacturer: 'Innova', plastic_name: 'Star', display_order: 1, status: 'official' },
    { id: 'pt-2', manufacturer: 'Innova', plastic_name: 'Champion', display_order: 2, status: 'official' },
    { id: 'pt-3', manufacturer: 'Innova', plastic_name: 'DX', display_order: 3, status: 'official' },
  ];

  const mockResponse = {
    plastics: mockPlastics,
    grouped: { Innova: ['Star', 'Champion', 'DX'] },
    count: 3,
    manufacturer: 'Innova',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  it('returns empty plastics when no manufacturer provided', () => {
    const { result } = renderHook(() => usePlasticTypes(undefined));

    expect(result.current.plastics).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches plastic types when manufacturer is provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { result } = renderHook(() => usePlasticTypes('Innova'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plastics).toEqual(['Star', 'Champion', 'DX']);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch error gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    // Use a different manufacturer to avoid cache from other tests
    const { result } = renderHook(() => usePlasticTypes('ErrorTest'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load plastic types');
    expect(result.current.plastics).toEqual([]);
  });

  it('merges user custom plastics with official plastics', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const userPlastics = ['Custom Swirl', 'My Plastic'];
    const { result } = renderHook(() => usePlasticTypes('Innova', userPlastics));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Official plastics first, then user plastics
    expect(result.current.plastics).toEqual(['Star', 'Champion', 'DX', 'Custom Swirl', 'My Plastic']);
  });

  it('dedupes user plastics that match official plastics', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    // User has 'star' (lowercase) which should match 'Star'
    const userPlastics = ['star', 'Custom Plastic'];
    const { result } = renderHook(() => usePlasticTypes('Innova', userPlastics));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // 'star' should be deduped (case-insensitive match with 'Star')
    expect(result.current.plastics).toEqual(['Star', 'Champion', 'DX', 'Custom Plastic']);
  });

  it('provides refetch and submitPlastic functions', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { result } = renderHook(() => usePlasticTypes('Innova'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
    expect(typeof result.current.submitPlastic).toBe('function');
  });
});
