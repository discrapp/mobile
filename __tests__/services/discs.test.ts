/**
 * Tests for disc service - CRUD operations for disc management
 */

import { discService } from '@/services/discs';
import { apiRequest } from '@/services/baseService';
import { ApiError, ApiErrorCode } from '@/services/ApiError';

// Mock baseService
jest.mock('@/services/baseService', () => ({
  apiRequest: jest.fn(),
}));

// Mock Sentry
jest.mock('@/lib/sentry', () => ({
  Sentry: {
    captureException: jest.fn(),
  },
  captureError: jest.fn(),
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

// Helper to create a valid disc mock
function createMockDisc(overrides: Partial<{
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
}> = {}) {
  return {
    id: 'disc-1',
    name: 'Destroyer',
    owner_id: 'user-123',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    ...overrides,
  };
}

describe('discService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('fetches all discs for the current user', async () => {
      const mockDiscs = [
        createMockDisc({ id: 'disc-1', name: 'Destroyer', brand: 'Innova' }),
        createMockDisc({ id: 'disc-2', name: 'Buzzz', brand: 'Discraft' }),
      ];
      mockApiRequest.mockResolvedValueOnce(mockDiscs);

      const result = await discService.getAll();

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/discs', {
        method: 'GET',
        operation: 'get-discs',
      });
      expect(result).toEqual(mockDiscs);
    });

    it('propagates errors from apiRequest', async () => {
      const error = new ApiError('Not authenticated', {
        code: ApiErrorCode.AUTH,
      });
      mockApiRequest.mockRejectedValueOnce(error);

      await expect(discService.getAll()).rejects.toThrow(error);
    });
  });

  describe('getById', () => {
    it('fetches a single disc by ID', async () => {
      const mockDisc = createMockDisc({
        id: 'disc-1',
        name: 'Destroyer',
        brand: 'Innova',
      });
      mockApiRequest.mockResolvedValueOnce(mockDisc);

      const result = await discService.getById('disc-1');

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/discs/disc-1', {
        method: 'GET',
        operation: 'get-disc',
      });
      expect(result).toEqual(mockDisc);
    });

    it('returns null for non-existent disc', async () => {
      const error = new ApiError('Not found', {
        code: ApiErrorCode.NOT_FOUND,
        statusCode: 404,
      });
      mockApiRequest.mockRejectedValueOnce(error);

      const result = await discService.getById('non-existent');

      expect(result).toBeNull();
    });

    it('propagates non-404 errors', async () => {
      const error = new ApiError('Server error', {
        code: ApiErrorCode.API,
        statusCode: 500,
      });
      mockApiRequest.mockRejectedValueOnce(error);

      await expect(discService.getById('disc-1')).rejects.toThrow(error);
    });
  });

  describe('create', () => {
    it('creates a new disc', async () => {
      const discData = { name: 'Destroyer', brand: 'Innova', weight: 175 };
      const createdDisc = createMockDisc({
        id: 'new-disc',
        name: 'Destroyer',
        brand: 'Innova',
        weight: 175,
      });
      mockApiRequest.mockResolvedValueOnce(createdDisc);

      const result = await discService.create(discData);

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/discs', {
        method: 'POST',
        body: discData,
        operation: 'create-disc',
      });
      expect(result).toEqual(createdDisc);
    });
  });

  describe('update', () => {
    it('updates an existing disc', async () => {
      const updates = { name: 'Updated Name' };
      const updatedDisc = createMockDisc({
        id: 'disc-1',
        name: 'Updated Name',
        brand: 'Innova',
      });
      mockApiRequest.mockResolvedValueOnce(updatedDisc);

      const result = await discService.update('disc-1', updates);

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/discs/disc-1', {
        method: 'PATCH',
        body: updates,
        operation: 'update-disc',
      });
      expect(result).toEqual(updatedDisc);
    });
  });

  describe('delete', () => {
    it('deletes a disc', async () => {
      mockApiRequest.mockResolvedValueOnce({ success: true });

      await discService.delete('disc-1');

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/discs/disc-1', {
        method: 'DELETE',
        operation: 'delete-disc',
      });
    });
  });

  describe('linkQrCode', () => {
    it('links a QR code to a disc', async () => {
      const linkedDisc = createMockDisc({
        id: 'disc-1',
        name: 'Destroyer',
        qr_code_id: 'qr-123',
      });
      mockApiRequest.mockResolvedValueOnce(linkedDisc);

      const result = await discService.linkQrCode('disc-1', 'qr-123');

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/discs/disc-1/qr', {
        method: 'POST',
        body: { qr_code_id: 'qr-123' },
        operation: 'link-qr-code',
      });
      expect(result).toEqual(linkedDisc);
    });
  });

  describe('unlinkQrCode', () => {
    it('unlinks a QR code from a disc', async () => {
      const unlinkedDisc = createMockDisc({
        id: 'disc-1',
        name: 'Destroyer',
        qr_code_id: null,
      });
      mockApiRequest.mockResolvedValueOnce(unlinkedDisc);

      const result = await discService.unlinkQrCode('disc-1');

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/discs/disc-1/qr', {
        method: 'DELETE',
        operation: 'unlink-qr-code',
      });
      expect(result).toEqual(unlinkedDisc);
    });
  });

  describe('uploadPhoto', () => {
    it('uploads a photo for a disc', async () => {
      const photoData = { uri: 'file://photo.jpg', type: 'image/jpeg' };
      const updatedDisc = createMockDisc({
        id: 'disc-1',
        name: 'Destroyer',
        photo_url: 'https://storage/photo.jpg',
      });
      mockApiRequest.mockResolvedValueOnce(updatedDisc);

      const result = await discService.uploadPhoto('disc-1', photoData);

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/discs/disc-1/photo', {
        method: 'POST',
        body: photoData,
        operation: 'upload-disc-photo',
      });
      expect(result).toEqual(updatedDisc);
    });
  });
});
