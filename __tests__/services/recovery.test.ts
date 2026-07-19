/**
 * Tests for recovery service - operations for disc recovery flow
 */

import { recoveryService } from '@/services/recovery';
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

// Helper to create a valid recovery event mock
function createMockRecoveryEvent(
  overrides: Partial<{
    id: string;
    disc_id: string;
    status: string;
    finder_id?: string;
    owner_id: string;
    location?: { latitude: number; longitude: number };
    scheduled_time?: string;
    message?: string;
    created_at: string;
    updated_at: string;
  }> = {}
) {
  return {
    id: 'event-1',
    disc_id: 'disc-1',
    status: 'pending',
    owner_id: 'user-1',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    ...overrides,
  };
}

// Helper to create a valid recovery message mock
function createMockRecoveryMessage(
  overrides: Partial<{
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
  }> = {}
) {
  return {
    id: 'msg-1',
    content: 'Hello!',
    sender_id: 'user-1',
    created_at: '2024-01-15T10:30:00Z',
    ...overrides,
  };
}

describe('recoveryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDetails', () => {
    it('fetches recovery event details', async () => {
      const mockEvent = createMockRecoveryEvent({
        id: 'event-1',
        finder_id: 'user-2',
      });
      mockApiRequest.mockResolvedValueOnce(mockEvent);

      const result = await recoveryService.getDetails('event-1');

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/functions/v1/recovery/event-1',
        {
          method: 'GET',
          operation: 'get-recovery-details',
        }
      );
      expect(result).toEqual(mockEvent);
    });

    it('returns null for non-existent event', async () => {
      const error = new ApiError('Not found', {
        code: ApiErrorCode.NOT_FOUND,
        statusCode: 404,
      });
      mockApiRequest.mockRejectedValueOnce(error);

      const result = await recoveryService.getDetails('non-existent');

      expect(result).toBeNull();
    });

    it('propagates non-404 errors', async () => {
      const error = new ApiError('Server error', {
        code: ApiErrorCode.API,
        statusCode: 500,
      });
      mockApiRequest.mockRejectedValueOnce(error);

      await expect(recoveryService.getDetails('event-1')).rejects.toThrow(
        error
      );
    });
  });

  describe('getActiveEvents', () => {
    it('fetches all active recovery events for user', async () => {
      const mockEvents = [
        createMockRecoveryEvent({ id: 'event-1', status: 'pending' }),
        createMockRecoveryEvent({ id: 'event-2', status: 'meetup_scheduled' }),
      ];
      mockApiRequest.mockResolvedValueOnce(mockEvents);

      const result = await recoveryService.getActiveEvents();

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/functions/v1/recovery/active',
        {
          method: 'GET',
          operation: 'get-active-recovery-events',
        }
      );
      expect(result).toEqual(mockEvents);
    });
  });

  describe('reportFound', () => {
    it('reports a disc as found via QR code scan', async () => {
      const mockEvent = createMockRecoveryEvent({
        location: { latitude: 40.7128, longitude: -74.006 },
      });
      mockApiRequest.mockResolvedValueOnce(mockEvent);

      const result = await recoveryService.reportFound('qr-123', {
        latitude: 40.7128,
        longitude: -74.006,
      });

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/functions/v1/recovery/report',
        {
          method: 'POST',
          body: {
            qr_code_id: 'qr-123',
            location: { latitude: 40.7128, longitude: -74.006 },
          },
          operation: 'report-disc-found',
        }
      );
      expect(result).toEqual(mockEvent);
    });

    it('reports a disc as found without location', async () => {
      const mockEvent = createMockRecoveryEvent();
      mockApiRequest.mockResolvedValueOnce(mockEvent);

      await recoveryService.reportFound('qr-123');

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/functions/v1/recovery/report',
        {
          method: 'POST',
          body: { qr_code_id: 'qr-123' },
          operation: 'report-disc-found',
        }
      );
    });
  });

  describe('proposeMeetup', () => {
    it('proposes a meetup for disc recovery', async () => {
      const meetupData = {
        location: { latitude: 40.7128, longitude: -74.006 },
        scheduled_time: '2024-01-15T10:00:00Z',
        message: 'Can meet at the park',
      };
      const mockEvent = createMockRecoveryEvent({
        status: 'meetup_proposed',
        ...meetupData,
      });
      mockApiRequest.mockResolvedValueOnce(mockEvent);

      const result = await recoveryService.proposeMeetup('event-1', meetupData);

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/functions/v1/recovery/event-1/meetup',
        {
          method: 'POST',
          body: meetupData,
          operation: 'propose-meetup',
        }
      );
      expect(result).toEqual(mockEvent);
    });
  });

  describe('acceptMeetup', () => {
    it('accepts a proposed meetup', async () => {
      const mockEvent = createMockRecoveryEvent({ status: 'meetup_scheduled' });
      mockApiRequest.mockResolvedValueOnce(mockEvent);

      const result = await recoveryService.acceptMeetup('event-1');

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/functions/v1/recovery/event-1/accept',
        {
          method: 'POST',
          operation: 'accept-meetup',
        }
      );
      expect(result).toEqual(mockEvent);
    });
  });

  describe('declineMeetup', () => {
    it('declines a proposed meetup with reason', async () => {
      const mockEvent = createMockRecoveryEvent({ status: 'meetup_declined' });
      mockApiRequest.mockResolvedValueOnce(mockEvent);

      const result = await recoveryService.declineMeetup(
        'event-1',
        'Not available at that time'
      );

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/functions/v1/recovery/event-1/decline',
        {
          method: 'POST',
          body: { reason: 'Not available at that time' },
          operation: 'decline-meetup',
        }
      );
      expect(result).toEqual(mockEvent);
    });

    it('declines a proposed meetup without reason', async () => {
      const mockEvent = createMockRecoveryEvent({ status: 'meetup_declined' });
      mockApiRequest.mockResolvedValueOnce(mockEvent);

      await recoveryService.declineMeetup('event-1');

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/functions/v1/recovery/event-1/decline',
        {
          method: 'POST',
          body: {},
          operation: 'decline-meetup',
        }
      );
    });
  });

  describe('completeRecovery', () => {
    it('marks the recovery as complete', async () => {
      const mockEvent = createMockRecoveryEvent({ status: 'completed' });
      mockApiRequest.mockResolvedValueOnce(mockEvent);

      const result = await recoveryService.completeRecovery('event-1');

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/functions/v1/recovery/event-1/complete',
        {
          method: 'POST',
          operation: 'complete-recovery',
        }
      );
      expect(result).toEqual(mockEvent);
    });
  });

  describe('cancelRecovery', () => {
    it('cancels the recovery event with reason', async () => {
      const mockEvent = createMockRecoveryEvent({ status: 'cancelled' });
      mockApiRequest.mockResolvedValueOnce(mockEvent);

      const result = await recoveryService.cancelRecovery(
        'event-1',
        'Disc was never lost'
      );

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/functions/v1/recovery/event-1/cancel',
        {
          method: 'POST',
          body: { reason: 'Disc was never lost' },
          operation: 'cancel-recovery',
        }
      );
      expect(result).toEqual(mockEvent);
    });

    it('cancels the recovery event without reason', async () => {
      const mockEvent = createMockRecoveryEvent({ status: 'cancelled' });
      mockApiRequest.mockResolvedValueOnce(mockEvent);

      await recoveryService.cancelRecovery('event-1');

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/functions/v1/recovery/event-1/cancel',
        {
          method: 'POST',
          body: {},
          operation: 'cancel-recovery',
        }
      );
    });
  });

  describe('sendMessage', () => {
    it('sends a message in the recovery chat', async () => {
      const mockMessage = createMockRecoveryMessage({ content: 'Hello!' });
      mockApiRequest.mockResolvedValueOnce(mockMessage);

      const result = await recoveryService.sendMessage('event-1', 'Hello!');

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/functions/v1/recovery/event-1/messages',
        {
          method: 'POST',
          body: { content: 'Hello!' },
          operation: 'send-recovery-message',
        }
      );
      expect(result).toEqual(mockMessage);
    });
  });

  describe('getMessages', () => {
    it('fetches all messages for a recovery event', async () => {
      const mockMessages = [
        createMockRecoveryMessage({ id: 'msg-1', content: 'Hi' }),
        createMockRecoveryMessage({
          id: 'msg-2',
          content: 'Hello',
          sender_id: 'user-2',
        }),
      ];
      mockApiRequest.mockResolvedValueOnce(mockMessages);

      const result = await recoveryService.getMessages('event-1');

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/functions/v1/recovery/event-1/messages',
        {
          method: 'GET',
          operation: 'get-recovery-messages',
        }
      );
      expect(result).toEqual(mockMessages);
    });
  });
});
