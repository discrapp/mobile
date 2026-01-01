/**
 * Tests for offline queue service
 * TDD: These tests are written FIRST before implementation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  OfflineQueueService,
  QueuedAction,
  ActionType,
  QUEUE_STORAGE_KEY,
} from '@/services/offlineQueue';

// AsyncStorage is already mocked in jest.setup.js

describe('OfflineQueueService', () => {
  let queueService: OfflineQueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    queueService = new OfflineQueueService();
  });

  describe('enqueue', () => {
    it('adds an action to the queue', async () => {
      const action: Omit<QueuedAction, 'id' | 'createdAt' | 'attempts'> = {
        type: 'UPDATE_DISC',
        payload: { discId: '123', name: 'Updated Disc' },
      };

      const queuedAction = await queueService.enqueue(action);

      expect(queuedAction.id).toBeDefined();
      expect(queuedAction.type).toBe('UPDATE_DISC');
      expect(queuedAction.payload).toEqual(action.payload);
      expect(queuedAction.createdAt).toBeDefined();
      expect(queuedAction.attempts).toBe(0);
    });

    it('persists the queue to AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await queueService.enqueue({
        type: 'UPDATE_DISC',
        payload: { discId: '123' },
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        QUEUE_STORAGE_KEY,
        expect.any(String)
      );
    });

    it('appends to existing queue', async () => {
      const existingQueue: QueuedAction[] = [
        {
          id: 'existing-1',
          type: 'UPDATE_DISC',
          payload: { discId: '111' },
          createdAt: Date.now() - 1000,
          attempts: 0,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(existingQueue)
      );

      await queueService.enqueue({
        type: 'CREATE_DISC',
        payload: { name: 'New Disc' },
      });

      const setItemCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const savedQueue = JSON.parse(setItemCall[1]);
      expect(savedQueue).toHaveLength(2);
      expect(savedQueue[0].id).toBe('existing-1');
    });

    it('handles AsyncStorage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      // Should not throw
      await expect(
        queueService.enqueue({
          type: 'UPDATE_DISC',
          payload: { discId: '123' },
        })
      ).resolves.toBeDefined();
    });
  });

  describe('dequeue', () => {
    it('returns null when queue is empty', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const action = await queueService.dequeue();

      expect(action).toBeNull();
    });

    it('returns and removes the first action from the queue', async () => {
      const queue: QueuedAction[] = [
        {
          id: 'action-1',
          type: 'UPDATE_DISC',
          payload: { discId: '111' },
          createdAt: Date.now() - 2000,
          attempts: 0,
        },
        {
          id: 'action-2',
          type: 'CREATE_DISC',
          payload: { name: 'New' },
          createdAt: Date.now() - 1000,
          attempts: 0,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(queue)
      );

      const action = await queueService.dequeue();

      expect(action?.id).toBe('action-1');

      // Verify queue was updated without the first action
      const setItemCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const savedQueue = JSON.parse(setItemCall[1]);
      expect(savedQueue).toHaveLength(1);
      expect(savedQueue[0].id).toBe('action-2');
    });
  });

  describe('peek', () => {
    it('returns null when queue is empty', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const action = await queueService.peek();

      expect(action).toBeNull();
    });

    it('returns the first action without removing it', async () => {
      const queue: QueuedAction[] = [
        {
          id: 'action-1',
          type: 'UPDATE_DISC',
          payload: { discId: '111' },
          createdAt: Date.now(),
          attempts: 0,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(queue)
      );

      const action = await queueService.peek();

      expect(action?.id).toBe('action-1');
      // Should not call setItem since we're just peeking
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('getAll', () => {
    it('returns empty array when queue is empty', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const actions = await queueService.getAll();

      expect(actions).toEqual([]);
    });

    it('returns all queued actions', async () => {
      const queue: QueuedAction[] = [
        {
          id: 'action-1',
          type: 'UPDATE_DISC',
          payload: {},
          createdAt: Date.now(),
          attempts: 0,
        },
        {
          id: 'action-2',
          type: 'CREATE_DISC',
          payload: {},
          createdAt: Date.now(),
          attempts: 0,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(queue)
      );

      const actions = await queueService.getAll();

      expect(actions).toHaveLength(2);
    });
  });

  describe('remove', () => {
    it('removes a specific action by id', async () => {
      const queue: QueuedAction[] = [
        {
          id: 'action-1',
          type: 'UPDATE_DISC',
          payload: {},
          createdAt: Date.now(),
          attempts: 0,
        },
        {
          id: 'action-2',
          type: 'CREATE_DISC',
          payload: {},
          createdAt: Date.now(),
          attempts: 0,
        },
        {
          id: 'action-3',
          type: 'DELETE_DISC',
          payload: {},
          createdAt: Date.now(),
          attempts: 0,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(queue)
      );

      await queueService.remove('action-2');

      const setItemCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const savedQueue = JSON.parse(setItemCall[1]);
      expect(savedQueue).toHaveLength(2);
      expect(savedQueue.find((a: QueuedAction) => a.id === 'action-2')).toBeUndefined();
    });

    it('does nothing when action not found', async () => {
      const queue: QueuedAction[] = [
        {
          id: 'action-1',
          type: 'UPDATE_DISC',
          payload: {},
          createdAt: Date.now(),
          attempts: 0,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(queue)
      );

      await queueService.remove('non-existent');

      // Queue should remain unchanged
      const setItemCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const savedQueue = JSON.parse(setItemCall[1]);
      expect(savedQueue).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('removes all actions from the queue', async () => {
      await queueService.clear();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(QUEUE_STORAGE_KEY);
    });
  });

  describe('size', () => {
    it('returns 0 when queue is empty', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const size = await queueService.size();

      expect(size).toBe(0);
    });

    it('returns the number of queued actions', async () => {
      const queue: QueuedAction[] = [
        { id: '1', type: 'UPDATE_DISC', payload: {}, createdAt: Date.now(), attempts: 0 },
        { id: '2', type: 'CREATE_DISC', payload: {}, createdAt: Date.now(), attempts: 0 },
        { id: '3', type: 'DELETE_DISC', payload: {}, createdAt: Date.now(), attempts: 0 },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(queue)
      );

      const size = await queueService.size();

      expect(size).toBe(3);
    });
  });

  describe('incrementAttempts', () => {
    it('increments attempt count for an action', async () => {
      const queue: QueuedAction[] = [
        {
          id: 'action-1',
          type: 'UPDATE_DISC',
          payload: {},
          createdAt: Date.now(),
          attempts: 0,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(queue)
      );

      await queueService.incrementAttempts('action-1');

      const setItemCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const savedQueue = JSON.parse(setItemCall[1]);
      expect(savedQueue[0].attempts).toBe(1);
    });

    it('does nothing when action not found', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));

      // Should not throw
      await expect(
        queueService.incrementAttempts('non-existent')
      ).resolves.not.toThrow();
    });
  });

  describe('getFailedActions', () => {
    it('returns actions that have exceeded max attempts', async () => {
      const queue: QueuedAction[] = [
        { id: '1', type: 'UPDATE_DISC', payload: {}, createdAt: Date.now(), attempts: 0 },
        { id: '2', type: 'CREATE_DISC', payload: {}, createdAt: Date.now(), attempts: 3 },
        { id: '3', type: 'DELETE_DISC', payload: {}, createdAt: Date.now(), attempts: 5 },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(queue)
      );

      const failed = await queueService.getFailedActions(3);

      expect(failed).toHaveLength(2);
      expect(failed.map((a) => a.id)).toEqual(['2', '3']);
    });

    it('returns empty array when no failed actions', async () => {
      const queue: QueuedAction[] = [
        { id: '1', type: 'UPDATE_DISC', payload: {}, createdAt: Date.now(), attempts: 0 },
        { id: '2', type: 'CREATE_DISC', payload: {}, createdAt: Date.now(), attempts: 1 },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(queue)
      );

      const failed = await queueService.getFailedActions(3);

      expect(failed).toHaveLength(0);
    });
  });
});

describe('ActionType', () => {
  it('includes UPDATE_DISC', () => {
    const action: ActionType = 'UPDATE_DISC';
    expect(action).toBe('UPDATE_DISC');
  });

  it('includes CREATE_DISC', () => {
    const action: ActionType = 'CREATE_DISC';
    expect(action).toBe('CREATE_DISC');
  });

  it('includes DELETE_DISC', () => {
    const action: ActionType = 'DELETE_DISC';
    expect(action).toBe('DELETE_DISC');
  });

  it('includes REPORT_FOUND', () => {
    const action: ActionType = 'REPORT_FOUND';
    expect(action).toBe('REPORT_FOUND');
  });
});
