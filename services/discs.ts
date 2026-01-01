/**
 * Disc service - CRUD operations for discs
 */

import { apiRequest } from './baseService';
import { ApiError, ApiErrorCode } from './ApiError';

export interface FlightNumbers {
  speed: number | null;
  glide: number | null;
  turn: number | null;
  fade: number | null;
}

export interface DiscPhoto {
  id: string;
  storage_path: string;
  photo_uuid: string;
  photo_url?: string;
  created_at: string;
}

export interface QRCodeInfo {
  id: string;
  short_code: string;
  status: string;
}

export interface ActiveRecovery {
  id: string;
  status: string;
  finder_id: string;
  found_at: string;
}

export interface Disc {
  id: string;
  name: string;
  manufacturer?: string;
  mold?: string;
  category?: string;
  plastic?: string;
  weight?: number;
  color?: string;
  flight_numbers: FlightNumbers;
  reward_amount?: string;
  notes?: string;
  created_at: string;
  photos: DiscPhoto[];
  qr_code_id?: string;
  qr_code?: QRCodeInfo;
  active_recovery?: ActiveRecovery | null;
  was_surrendered?: boolean;
  surrendered_at?: string | null;
  ai_identification_log_id?: string | null;
}

export interface CreateDiscInput {
  name?: string;
  manufacturer?: string;
  mold?: string;
  category?: string;
  plastic?: string;
  weight?: number;
  color?: string;
  flight_numbers?: Partial<FlightNumbers>;
  reward_amount?: string;
  notes?: string;
}

export interface UpdateDiscInput {
  name?: string;
  manufacturer?: string;
  mold?: string;
  category?: string;
  plastic?: string;
  weight?: number;
  color?: string;
  flight_numbers?: Partial<FlightNumbers>;
  reward_amount?: string;
  notes?: string;
}

/**
 * Disc service for managing disc CRUD operations
 */
export const discService = {
  /**
   * Get all discs for the authenticated user
   */
  async getAll(): Promise<Disc[]> {
    return apiRequest<Disc[]>('/functions/v1/get-user-discs', {
      method: 'GET',
      operation: 'fetch-discs',
    });
  },

  /**
   * Get a specific disc by ID
   * @throws {ApiError} if disc is not found
   */
  async getById(discId: string): Promise<Disc> {
    const discs = await this.getAll();
    const disc = discs.find((d) => d.id === discId);

    if (!disc) {
      throw new ApiError('Disc not found', {
        code: ApiErrorCode.NOT_FOUND,
        operation: 'get-disc-by-id',
      });
    }

    return disc;
  },

  /**
   * Create a new disc
   */
  async create(input: CreateDiscInput): Promise<Disc> {
    return apiRequest<Disc>('/functions/v1/create-disc', {
      method: 'POST',
      body: input as Record<string, unknown>,
      operation: 'create-disc',
    });
  },

  /**
   * Update an existing disc
   */
  async update(discId: string, updates: UpdateDiscInput): Promise<Disc> {
    return apiRequest<Disc>('/functions/v1/update-disc', {
      method: 'POST',
      body: { disc_id: discId, ...updates } as Record<string, unknown>,
      operation: 'update-disc',
    });
  },

  /**
   * Delete a disc by ID
   */
  async delete(discId: string): Promise<void> {
    await apiRequest('/functions/v1/delete-disc', {
      method: 'DELETE',
      body: { disc_id: discId },
      operation: 'delete-disc',
    });
  },

  /**
   * Link a QR code to a disc
   */
  async linkQrCode(discId: string, qrCode: string): Promise<void> {
    await apiRequest('/functions/v1/link-qr-to-disc', {
      method: 'POST',
      body: { disc_id: discId, qr_code: qrCode },
      operation: 'link-qr-code',
    });
  },

  /**
   * Unlink a QR code from a disc
   */
  async unlinkQrCode(discId: string): Promise<void> {
    await apiRequest('/functions/v1/unlink-qr-code', {
      method: 'POST',
      body: { disc_id: discId },
      operation: 'unlink-qr-code',
    });
  },
};
