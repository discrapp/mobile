/**
 * Tests for recovery service - Recovery event operations
 */

import { recoveryService } from '../../services/recovery';
import { ApiError, ApiErrorCode } from '../../services/ApiError';
import * as baseService from '../../services/baseService';

// Mock the base service
jest.mock('../../services/baseService');

const mockApiRequest = baseService.apiRequest as jest.MockedFunction<
  typeof baseService.apiRequest
>;

describe('recoveryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDetails', () => {
    it('fetches recovery details by ID', async () => {
      const mockRecovery = {
        id: 'recovery-1',
        status: 'found',
        disc: { id: 'disc-1', name: 'Destroyer' },
        owner: { id: 'owner-1', display_name: 'John' },
        finder: { id: 'finder-1', display_name: 'Jane' },
      };
      mockApiRequest.mockResolvedValueOnce(mockRecovery);

      const result = await recoveryService.getDetails('recovery-1');

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/functions/v1/get-recovery-details?id=recovery-1',
        {
          method: 'GET',
          operation: 'get-recovery-details',
        }
      );
      expect(result).toEqual(mockRecovery);
    });

    it('propagates API errors', async () => {
      const error = new ApiError('Recovery not found', { code: ApiErrorCode.NOT_FOUND });
      mockApiRequest.mockRejectedValueOnce(error);

      await expect(recoveryService.getDetails('non-existent')).rejects.toThrow(error);
    });
  });

  describe('acceptMeetup', () => {
    it('accepts a meetup proposal', async () => {
      mockApiRequest.mockResolvedValueOnce({ success: true });

      await recoveryService.acceptMeetup('proposal-1');

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/accept-meetup', {
        method: 'POST',
        body: { proposal_id: 'proposal-1' },
        operation: 'accept-meetup',
      });
    });
  });

  describe('proposeMeetup', () => {
    it('proposes a new meetup', async () => {
      const proposal = {
        recoveryEventId: 'recovery-1',
        locationName: 'Central Park',
        latitude: 40.785091,
        longitude: -73.968285,
        proposedDatetime: '2024-01-15T14:00:00Z',
        message: 'Meet at the fountain',
      };
      mockApiRequest.mockResolvedValueOnce({ id: 'proposal-new' });

      const result = await recoveryService.proposeMeetup(proposal);

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/propose-meetup', {
        method: 'POST',
        body: {
          recovery_event_id: proposal.recoveryEventId,
          location_name: proposal.locationName,
          latitude: proposal.latitude,
          longitude: proposal.longitude,
          proposed_datetime: proposal.proposedDatetime,
          message: proposal.message,
        },
        operation: 'propose-meetup',
      });
      expect(result).toEqual({ id: 'proposal-new' });
    });
  });

  describe('completeRecovery', () => {
    it('marks a recovery as complete', async () => {
      mockApiRequest.mockResolvedValueOnce({ success: true });

      await recoveryService.completeRecovery('recovery-1');

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/complete-recovery', {
        method: 'POST',
        body: { recovery_event_id: 'recovery-1' },
        operation: 'complete-recovery',
      });
    });
  });

  describe('surrenderDisc', () => {
    it('surrenders a disc to the finder', async () => {
      mockApiRequest.mockResolvedValueOnce({ success: true });

      await recoveryService.surrenderDisc('recovery-1');

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/surrender-disc', {
        method: 'POST',
        body: { recovery_event_id: 'recovery-1' },
        operation: 'surrender-disc',
      });
    });
  });

  describe('markRetrieved', () => {
    it('marks a dropped-off disc as retrieved', async () => {
      mockApiRequest.mockResolvedValueOnce({ success: true });

      await recoveryService.markRetrieved('recovery-1');

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/mark-disc-retrieved', {
        method: 'POST',
        body: { recovery_event_id: 'recovery-1' },
        operation: 'mark-retrieved',
      });
    });
  });

  describe('relinquishDisc', () => {
    it('relinquishes a dropped-off disc to the finder', async () => {
      mockApiRequest.mockResolvedValueOnce({ success: true });

      await recoveryService.relinquishDisc('recovery-1');

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/relinquish-disc', {
        method: 'POST',
        body: { recovery_event_id: 'recovery-1' },
        operation: 'relinquish-disc',
      });
    });
  });

  describe('abandonDisc', () => {
    it('abandons a dropped-off disc', async () => {
      mockApiRequest.mockResolvedValueOnce({ success: true });

      await recoveryService.abandonDisc('recovery-1');

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/abandon-disc', {
        method: 'POST',
        body: { recovery_event_id: 'recovery-1' },
        operation: 'abandon-disc',
      });
    });
  });

  describe('markRewardPaid', () => {
    it('marks the reward as paid/received', async () => {
      mockApiRequest.mockResolvedValueOnce({ success: true });

      await recoveryService.markRewardPaid('recovery-1');

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/mark-reward-paid', {
        method: 'POST',
        body: { recovery_event_id: 'recovery-1' },
        operation: 'mark-reward-paid',
      });
    });
  });

  describe('createDropOff', () => {
    it('creates a drop-off for a recovery', async () => {
      const dropOff = {
        recoveryEventId: 'recovery-1',
        photoBase64: 'base64data...',
        latitude: 40.785091,
        longitude: -73.968285,
        locationNotes: 'Under the blue bench',
      };
      mockApiRequest.mockResolvedValueOnce({ id: 'dropoff-new' });

      const result = await recoveryService.createDropOff(dropOff);

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/drop-off-disc', {
        method: 'POST',
        body: {
          recovery_event_id: dropOff.recoveryEventId,
          photo_base64: dropOff.photoBase64,
          latitude: dropOff.latitude,
          longitude: dropOff.longitude,
          location_notes: dropOff.locationNotes,
        },
        operation: 'drop-off-disc',
      });
      expect(result).toEqual({ id: 'dropoff-new' });
    });
  });

  describe('sendRewardPayment', () => {
    it('initiates a Stripe payment for the reward', async () => {
      const checkoutUrl = 'https://checkout.stripe.com/session/xyz';
      mockApiRequest.mockResolvedValueOnce({ checkout_url: checkoutUrl });

      const result = await recoveryService.sendRewardPayment('recovery-1');

      expect(mockApiRequest).toHaveBeenCalledWith('/functions/v1/send-reward-payment', {
        method: 'POST',
        body: { recovery_event_id: 'recovery-1' },
        operation: 'send-reward-payment',
      });
      expect(result).toEqual({ checkout_url: checkoutUrl });
    });
  });
});
