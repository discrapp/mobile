/**
 * Recovery service - operations for disc recovery flow
 */

import { apiRequest } from '@/services/baseService';
import { ApiErrorCode, isApiError } from '@/services/ApiError';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface RecoveryEvent {
  id: string;
  disc_id: string;
  status: string;
  finder_id?: string;
  owner_id: string;
  location?: Location;
  scheduled_time?: string;
  message?: string;
  created_at: string;
  updated_at: string;
}

export interface MeetupData {
  location: Location;
  scheduled_time: string;
  message?: string;
}

export interface RecoveryMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

export const recoveryService = {
  /**
   * Get recovery event details by ID
   * Returns null if the event is not found
   */
  async getDetails(eventId: string): Promise<RecoveryEvent | null> {
    try {
      return await apiRequest<RecoveryEvent>(`/functions/v1/recovery/${eventId}`, {
        method: 'GET',
        operation: 'get-recovery-details',
      });
    } catch (error) {
      if (isApiError(error) && error.code === ApiErrorCode.NOT_FOUND) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Get all active recovery events for the current user
   */
  async getActiveEvents(): Promise<RecoveryEvent[]> {
    return apiRequest<RecoveryEvent[]>('/functions/v1/recovery/active', {
      method: 'GET',
      operation: 'get-active-recovery-events',
    });
  },

  /**
   * Report a disc as found via QR code scan
   */
  async reportFound(qrCodeId: string, location?: Location): Promise<RecoveryEvent> {
    const body: { qr_code_id: string; location?: Location } = { qr_code_id: qrCodeId };
    if (location) {
      body.location = location;
    }

    return apiRequest<RecoveryEvent>('/functions/v1/recovery/report', {
      method: 'POST',
      body,
      operation: 'report-disc-found',
    });
  },

  /**
   * Propose a meetup for disc recovery
   */
  async proposeMeetup(eventId: string, meetupData: MeetupData): Promise<RecoveryEvent> {
    return apiRequest<RecoveryEvent>(`/functions/v1/recovery/${eventId}/meetup`, {
      method: 'POST',
      body: meetupData,
      operation: 'propose-meetup',
    });
  },

  /**
   * Accept a proposed meetup
   */
  async acceptMeetup(eventId: string): Promise<RecoveryEvent> {
    return apiRequest<RecoveryEvent>(`/functions/v1/recovery/${eventId}/accept`, {
      method: 'POST',
      operation: 'accept-meetup',
    });
  },

  /**
   * Decline a proposed meetup
   */
  async declineMeetup(eventId: string, reason?: string): Promise<RecoveryEvent> {
    const body: { reason?: string } = {};
    if (reason) {
      body.reason = reason;
    }

    return apiRequest<RecoveryEvent>(`/functions/v1/recovery/${eventId}/decline`, {
      method: 'POST',
      body,
      operation: 'decline-meetup',
    });
  },

  /**
   * Mark the recovery as complete
   */
  async completeRecovery(eventId: string): Promise<RecoveryEvent> {
    return apiRequest<RecoveryEvent>(`/functions/v1/recovery/${eventId}/complete`, {
      method: 'POST',
      operation: 'complete-recovery',
    });
  },

  /**
   * Cancel the recovery event
   */
  async cancelRecovery(eventId: string, reason?: string): Promise<RecoveryEvent> {
    const body: { reason?: string } = {};
    if (reason) {
      body.reason = reason;
    }

    return apiRequest<RecoveryEvent>(`/functions/v1/recovery/${eventId}/cancel`, {
      method: 'POST',
      body,
      operation: 'cancel-recovery',
    });
  },

  /**
   * Send a message in the recovery chat
   */
  async sendMessage(eventId: string, content: string): Promise<RecoveryMessage> {
    return apiRequest<RecoveryMessage>(`/functions/v1/recovery/${eventId}/messages`, {
      method: 'POST',
      body: { content },
      operation: 'send-recovery-message',
    });
  },

  /**
   * Get all messages for a recovery event
   */
  async getMessages(eventId: string): Promise<RecoveryMessage[]> {
    return apiRequest<RecoveryMessage[]>(`/functions/v1/recovery/${eventId}/messages`, {
      method: 'GET',
      operation: 'get-recovery-messages',
    });
  },
};
