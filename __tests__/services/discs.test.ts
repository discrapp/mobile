/**
 * Tests for disc service - CRUD operations for discs
 */

import { discService } from '../../services/discs';
import { ApiError, ApiErrorCode } from '../../services/ApiError';
import * as baseService from '../../services/baseService';

// Mock the base service
jest.mock('../../services/baseService');

const mockApiRequest = baseService.apiRequest as jest.MockedFunction<
  typeof baseService.apiRequest
>;

describe('discService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('fetches all discs for the authenticated user', async () => {
      const mockDiscs = [
        { id: 'disc-1', name: 'Destroyer', manufacturer: 'Innova' },
        { id: 'disc-2', name: 'Buzzz', manufacturer: 'Discraft' },
      ];
      mockApiRequest.mockResolvedValueOnce(mockDiscs);

      const result = await discService.getAll();

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/get-user-discs', {
        method: 'GET',
        operation: 'fetch-discs',
      });
      expect(result).toEqual(mockDiscs);
    });

    it('propagates API errors', async () => {
      const error = new ApiError('Server error', { code: ApiErrorCode.API });
      mockApiRequest.mockRejectedValueOnce(error);

      await expect(discService.getAll()).rejects.toThrow(error);
    });
  });

  describe('getById', () => {
    it('fetches a specific disc by ID', async () => {
      const mockDiscs = [
        { id: 'disc-1', name: 'Destroyer', manufacturer: 'Innova' },
        { id: 'disc-2', name: 'Buzzz', manufacturer: 'Discraft' },
      ];
      mockApiRequest.mockResolvedValueOnce(mockDiscs);

      const result = await discService.getById('disc-1');

      expect(result).toEqual(mockDiscs[0]);
    });

    it('throws NOT_FOUND when disc does not exist', async () => {
      mockApiRequest.mockResolvedValueOnce([]);

      await expect(discService.getById('non-existent')).rejects.toMatchObject({
        code: ApiErrorCode.NOT_FOUND,
        message: 'Disc not found',
      });
    });
  });

  describe('create', () => {
    it('creates a new disc', async () => {
      const newDisc = {
        name: 'My Destroyer',
        manufacturer: 'Innova',
        mold: 'Destroyer',
        plastic: 'Star',
        color: 'Blue',
        weight: 175,
      };
      const createdDisc = { id: 'disc-new', ...newDisc };
      mockApiRequest.mockResolvedValueOnce(createdDisc);

      const result = await discService.create(newDisc);

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/create-disc', {
        method: 'POST',
        body: newDisc,
        operation: 'create-disc',
      });
      expect(result).toEqual(createdDisc);
    });

    it('handles validation errors', async () => {
      const error = new ApiError('Invalid input', { code: ApiErrorCode.VALIDATION });
      mockApiRequest.mockRejectedValueOnce(error);

      await expect(discService.create({ name: '' })).rejects.toThrow(error);
    });
  });

  describe('update', () => {
    it('updates an existing disc', async () => {
      const discId = 'disc-1';
      const updates = { name: 'Updated Destroyer', color: 'Red' };
      const updatedDisc = { id: discId, ...updates };
      mockApiRequest.mockResolvedValueOnce(updatedDisc);

      const result = await discService.update(discId, updates);

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/update-disc', {
        method: 'POST',
        body: { disc_id: discId, ...updates },
        operation: 'update-disc',
      });
      expect(result).toEqual(updatedDisc);
    });
  });

  describe('delete', () => {
    it('deletes a disc by ID', async () => {
      const discId = 'disc-1';
      mockApiRequest.mockResolvedValueOnce({ success: true });

      await discService.delete(discId);

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/delete-disc', {
        method: 'DELETE',
        body: { disc_id: discId },
        operation: 'delete-disc',
      });
    });

    it('propagates errors when deletion fails', async () => {
      const error = new ApiError('Disc has active recovery', { code: ApiErrorCode.API });
      mockApiRequest.mockRejectedValueOnce(error);

      await expect(discService.delete('disc-1')).rejects.toThrow(error);
    });
  });

  describe('linkQrCode', () => {
    it('links a QR code to a disc', async () => {
      const discId = 'disc-1';
      const qrCode = 'ABC123';
      mockApiRequest.mockResolvedValueOnce({ success: true });

      await discService.linkQrCode(discId, qrCode);

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/link-qr-to-disc', {
        method: 'POST',
        body: { disc_id: discId, qr_code: qrCode },
        operation: 'link-qr-code',
      });
    });
  });

  describe('unlinkQrCode', () => {
    it('unlinks a QR code from a disc', async () => {
      const discId = 'disc-1';
      mockApiRequest.mockResolvedValueOnce({ success: true });

      await discService.unlinkQrCode(discId);

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/unlink-qr-code', {
        method: 'POST',
        body: { disc_id: discId },
        operation: 'unlink-qr-code',
      });
    });
  });
});
