/**
 * Disc service - CRUD operations for disc management
 */

import { apiRequest } from '@/services/baseService';
import { ApiError, ApiErrorCode, isApiError } from '@/services/ApiError';

export interface Disc {
  id: string;
  name: string;
  brand?: string;
  weight?: number;
  color?: string;
  photo_url?: string;
  qr_code_id?: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDiscData {
  name: string;
  brand?: string;
  weight?: number;
  color?: string;
}

export interface UpdateDiscData {
  name?: string;
  brand?: string;
  weight?: number;
  color?: string;
}

export interface PhotoData {
  uri: string;
  type: string;
}

export const discService = {
  /**
   * Get all discs for the current user
   */
  async getAll(): Promise<Disc[]> {
    return apiRequest<Disc[]>('/functions/v1/discs', {
      method: 'GET',
      operation: 'get-discs',
    });
  },

  /**
   * Get a single disc by ID
   * Returns null if the disc is not found
   */
  async getById(id: string): Promise<Disc | null> {
    try {
      return await apiRequest<Disc>(`/functions/v1/discs/${id}`, {
        method: 'GET',
        operation: 'get-disc',
      });
    } catch (error) {
      if (isApiError(error) && error.code === ApiErrorCode.NOT_FOUND) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Create a new disc
   */
  async create(data: CreateDiscData): Promise<Disc> {
    return apiRequest<Disc>('/functions/v1/discs', {
      method: 'POST',
      body: data,
      operation: 'create-disc',
    });
  },

  /**
   * Update an existing disc
   */
  async update(id: string, data: UpdateDiscData): Promise<Disc> {
    return apiRequest<Disc>(`/functions/v1/discs/${id}`, {
      method: 'PATCH',
      body: data,
      operation: 'update-disc',
    });
  },

  /**
   * Delete a disc
   */
  async delete(id: string): Promise<void> {
    await apiRequest(`/functions/v1/discs/${id}`, {
      method: 'DELETE',
      operation: 'delete-disc',
    });
  },

  /**
   * Link a QR code to a disc
   */
  async linkQrCode(discId: string, qrCodeId: string): Promise<Disc> {
    return apiRequest<Disc>(`/functions/v1/discs/${discId}/qr`, {
      method: 'POST',
      body: { qr_code_id: qrCodeId },
      operation: 'link-qr-code',
    });
  },

  /**
   * Unlink a QR code from a disc
   */
  async unlinkQrCode(discId: string): Promise<Disc> {
    return apiRequest<Disc>(`/functions/v1/discs/${discId}/qr`, {
      method: 'DELETE',
      operation: 'unlink-qr-code',
    });
  },

  /**
   * Upload a photo for a disc
   */
  async uploadPhoto(discId: string, photoData: PhotoData): Promise<Disc> {
    return apiRequest<Disc>(`/functions/v1/discs/${discId}/photo`, {
      method: 'POST',
      body: photoData,
      operation: 'upload-disc-photo',
    });
  },
};
