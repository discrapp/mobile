/**
 * Tests for API response runtime validation
 * Following TDD - these tests are written BEFORE implementation
 */

import { z } from 'zod';
import {
  discSchema,
  discArraySchema,
  recoveryEventSchema,
  recoveryEventArraySchema,
  recoveryMessageSchema,
  recoveryMessageArraySchema,
  userProfileSchema,
  validateApiResponse,
  ValidationError,
  isValidationError,
  apiRequestValidated,
} from '@/services/apiValidation';

// Mock Sentry
jest.mock('@/lib/sentry', () => ({
  Sentry: {
    captureException: jest.fn(),
    withScope: jest.fn((callback) => callback({ setExtras: jest.fn() })),
  },
  captureError: jest.fn(),
}));

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

describe('API Response Schemas', async () => {
  describe('discSchema', async () => {
    it('validates a complete disc object', async () => {
      const validDisc = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Destroyer',
        brand: 'Innova',
        weight: 175,
        color: 'Red',
        photo_url: 'https://example.com/photo.jpg',
        qr_code_id: 'qr-123',
        owner_id: 'user-456',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      };

      const result = discSchema.safeParse(validDisc);
      expect(result.success).toBe(true);
    });

    it('validates a minimal disc object with required fields only', async () => {
      const minimalDisc = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Destroyer',
        owner_id: 'user-456',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      };

      const result = discSchema.safeParse(minimalDisc);
      expect(result.success).toBe(true);
    });

    it('allows null for qr_code_id', async () => {
      const disc = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Destroyer',
        qr_code_id: null,
        owner_id: 'user-456',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      };

      const result = discSchema.safeParse(disc);
      expect(result.success).toBe(true);
    });

    it('rejects missing required id field', async () => {
      const invalidDisc = {
        name: 'Destroyer',
        owner_id: 'user-456',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      };

      const result = discSchema.safeParse(invalidDisc);
      expect(result.success).toBe(false);
    });

    it('rejects missing required name field', async () => {
      const invalidDisc = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        owner_id: 'user-456',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      };

      const result = discSchema.safeParse(invalidDisc);
      expect(result.success).toBe(false);
    });

    it('rejects invalid weight type', async () => {
      const invalidDisc = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Destroyer',
        weight: 'not-a-number',
        owner_id: 'user-456',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      };

      const result = discSchema.safeParse(invalidDisc);
      expect(result.success).toBe(false);
    });
  });

  describe('discArraySchema', async () => {
    it('validates an array of discs', async () => {
      const discs = [
        {
          id: '1',
          name: 'Destroyer',
          owner_id: 'user-1',
          created_at: '2024-01-15T10:30:00Z',
          updated_at: '2024-01-15T10:30:00Z',
        },
        {
          id: '2',
          name: 'Wraith',
          owner_id: 'user-1',
          created_at: '2024-01-15T10:30:00Z',
          updated_at: '2024-01-15T10:30:00Z',
        },
      ];

      const result = discArraySchema.safeParse(discs);
      expect(result.success).toBe(true);
    });

    it('validates an empty array', async () => {
      const result = discArraySchema.safeParse([]);
      expect(result.success).toBe(true);
    });

    it('rejects array with invalid disc', async () => {
      const discs = [
        {
          id: '1',
          name: 'Destroyer',
          owner_id: 'user-1',
          created_at: '2024-01-15T10:30:00Z',
          updated_at: '2024-01-15T10:30:00Z',
        },
        {
          id: '2',
          // missing name
          owner_id: 'user-1',
          created_at: '2024-01-15T10:30:00Z',
          updated_at: '2024-01-15T10:30:00Z',
        },
      ];

      const result = discArraySchema.safeParse(discs);
      expect(result.success).toBe(false);
    });
  });

  describe('recoveryEventSchema', async () => {
    it('validates a complete recovery event', async () => {
      const event = {
        id: 'event-123',
        disc_id: 'disc-456',
        status: 'pending',
        finder_id: 'user-789',
        owner_id: 'user-111',
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
        scheduled_time: '2024-01-20T14:00:00Z',
        message: 'Found your disc!',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      };

      const result = recoveryEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('validates a minimal recovery event', async () => {
      const event = {
        id: 'event-123',
        disc_id: 'disc-456',
        status: 'pending',
        owner_id: 'user-111',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      };

      const result = recoveryEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('rejects missing required status', async () => {
      const event = {
        id: 'event-123',
        disc_id: 'disc-456',
        owner_id: 'user-111',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      };

      const result = recoveryEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });

    it('validates location with latitude and longitude', async () => {
      const event = {
        id: 'event-123',
        disc_id: 'disc-456',
        status: 'pending',
        owner_id: 'user-111',
        location: {
          latitude: -90,
          longitude: 180,
        },
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      };

      const result = recoveryEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  describe('recoveryMessageSchema', async () => {
    it('validates a recovery message', async () => {
      const message = {
        id: 'msg-123',
        content: 'Hello, I found your disc!',
        sender_id: 'user-456',
        created_at: '2024-01-15T10:30:00Z',
      };

      const result = recoveryMessageSchema.safeParse(message);
      expect(result.success).toBe(true);
    });

    it('rejects missing content', async () => {
      const message = {
        id: 'msg-123',
        sender_id: 'user-456',
        created_at: '2024-01-15T10:30:00Z',
      };

      const result = recoveryMessageSchema.safeParse(message);
      expect(result.success).toBe(false);
    });
  });

  describe('userProfileSchema', async () => {
    it('validates a complete user profile', async () => {
      const profile = {
        id: 'user-123',
        email: 'test@example.com',
        display_name: 'John Doe',
        avatar_url: 'https://example.com/avatar.jpg',
        phone: '+1234567890',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      };

      const result = userProfileSchema.safeParse(profile);
      expect(result.success).toBe(true);
    });

    it('validates a minimal user profile', async () => {
      const profile = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      };

      const result = userProfileSchema.safeParse(profile);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email format', async () => {
      const profile = {
        id: 'user-123',
        email: 'not-an-email',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      };

      const result = userProfileSchema.safeParse(profile);
      expect(result.success).toBe(false);
    });
  });
});

describe('validateApiResponse', async () => {
  const { captureError } = require('@/lib/sentry');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns parsed data when validation succeeds', async () => {
    const data = {
      id: '123',
      name: 'Test Disc',
      owner_id: 'user-1',
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-15T10:30:00Z',
    };

    const result = validateApiResponse(data, discSchema, 'get-disc');
    expect(result).toEqual(data);
  });

  it('throws ValidationError when validation fails', async () => {
    const invalidData = {
      id: '123',
      // missing name
      owner_id: 'user-1',
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-15T10:30:00Z',
    };

    expect(() => {
      validateApiResponse(invalidData, discSchema, 'get-disc');
    }).toThrow(ValidationError);
  });

  it('logs validation errors to Sentry', async () => {
    const invalidData = {
      id: '123',
      owner_id: 'user-1',
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-15T10:30:00Z',
    };

    try {
      validateApiResponse(invalidData, discSchema, 'get-disc');
    } catch {
      // Expected to throw
    }

    expect(captureError).toHaveBeenCalled();
  });

  it('includes operation name in ValidationError', async () => {
    const invalidData = { invalid: 'data' };

    try {
      validateApiResponse(invalidData, discSchema, 'fetch-disc');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).operation).toBe('fetch-disc');
    }
  });

  it('includes raw data in ValidationError for debugging', async () => {
    const invalidData = { id: '123', extra: 'field' };

    try {
      validateApiResponse(invalidData, discSchema, 'test-op');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).rawData).toEqual(invalidData);
    }
  });

  it('includes Zod issues in ValidationError', async () => {
    const invalidData = {
      id: '123',
      owner_id: 'user-1',
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-15T10:30:00Z',
    };

    try {
      validateApiResponse(invalidData, discSchema, 'test-op');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).issues).toBeDefined();
      expect((error as ValidationError).issues.length).toBeGreaterThan(0);
    }
  });

  it('works with array schemas', async () => {
    const validArray = [
      {
        id: '1',
        name: 'Disc 1',
        owner_id: 'user-1',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      },
    ];

    const result = validateApiResponse(validArray, discArraySchema, 'get-discs');
    expect(result).toEqual(validArray);
  });
});

describe('ValidationError', async () => {
  it('creates error with all properties', async () => {
    const issues = [{ path: ['name'], message: 'Required' }];
    const rawData = { id: '123' };

    const error = new ValidationError(
      'Validation failed',
      'test-operation',
      issues as z.ZodIssue[],
      rawData
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Validation failed');
    expect(error.operation).toBe('test-operation');
    expect(error.issues).toEqual(issues);
    expect(error.rawData).toEqual(rawData);
  });

  it('serializes to JSON correctly', async () => {
    const issues = [{ path: ['name'], message: 'Required' }];
    const error = new ValidationError(
      'Validation failed',
      'test-op',
      issues as z.ZodIssue[],
      { id: '123' }
    );

    const json = error.toJSON();
    expect(json.name).toBe('ValidationError');
    expect(json.message).toBe('Validation failed');
    expect(json.operation).toBe('test-op');
    expect(json.issues).toEqual(issues);
  });
});

describe('isValidationError', async () => {
  it('returns true for ValidationError instances', async () => {
    const error = new ValidationError('test', 'op', [], {});
    expect(isValidationError(error)).toBe(true);
  });

  it('returns false for regular Error instances', async () => {
    const error = new Error('test');
    expect(isValidationError(error)).toBe(false);
  });

  it('returns false for non-error values', async () => {
    expect(isValidationError(null)).toBe(false);
    expect(isValidationError(undefined)).toBe(false);
    expect(isValidationError('string')).toBe(false);
    expect(isValidationError({})).toBe(false);
  });
});

describe('apiRequestValidated', async () => {
  const { supabase } = require('@/lib/supabase');

  // Mock fetch globally
  const mockFetch = jest.fn();
  global.fetch = mockFetch;

  const mockSession = {
    access_token: 'test-token',
    user: { id: 'user-123' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
    });
  });

  it('returns validated data when API response is valid', async () => {
    const mockDisc = {
      id: '123',
      name: 'Destroyer',
      owner_id: 'user-1',
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-15T10:30:00Z',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDisc,
    });

    const result = await apiRequestValidated(
      '/functions/v1/discs/123',
      { method: 'GET', operation: 'get-disc' },
      discSchema
    );

    expect(result).toEqual(mockDisc);
  });

  it('throws ValidationError when API response is invalid', async () => {
    const invalidDisc = {
      id: '123',
      // missing required name field
      owner_id: 'user-1',
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-15T10:30:00Z',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => invalidDisc,
    });

    await expect(
      apiRequestValidated(
        '/functions/v1/discs/123',
        { method: 'GET', operation: 'get-disc' },
        discSchema
      )
    ).rejects.toThrow(ValidationError);
  });

  it('validates array responses correctly', async () => {
    const mockDiscs = [
      {
        id: '1',
        name: 'Destroyer',
        owner_id: 'user-1',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      },
      {
        id: '2',
        name: 'Wraith',
        owner_id: 'user-1',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDiscs,
    });

    const result = await apiRequestValidated(
      '/functions/v1/discs',
      { method: 'GET', operation: 'get-discs' },
      discArraySchema
    );

    expect(result).toEqual(mockDiscs);
    expect(result).toHaveLength(2);
  });
});
