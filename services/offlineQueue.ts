/**
 * Offline queue service
 * Queues actions performed offline for later synchronization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const QUEUE_STORAGE_KEY = '@discr/offline_queue';

/**
 * Supported action types for offline queue
 */
export type ActionType =
  | 'UPDATE_DISC'
  | 'CREATE_DISC'
  | 'DELETE_DISC'
  | 'REPORT_FOUND'
  | 'CLAIM_DISC'
  | 'UPDATE_PROFILE';

/**
 * Queued action structure
 */
export interface QueuedAction {
  id: string;
  type: ActionType;
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
}

/**
 * Generate a unique ID for queued actions
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Offline queue service for managing actions performed while offline
 */
export class OfflineQueueService {
  private storageKey: string;

  constructor(storageKey?: string) {
    this.storageKey = storageKey ?? QUEUE_STORAGE_KEY;
  }

  /**
   * Get the current queue from storage
   */
  private async getQueue(): Promise<QueuedAction[]> {
    try {
      const stored = await AsyncStorage.getItem(this.storageKey);
      if (!stored) {
        return [];
      }
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  /**
   * Save the queue to storage
   */
  private async saveQueue(queue: QueuedAction[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(queue));
    } catch {
      // Silently fail - best effort
    }
  }

  /**
   * Add an action to the queue
   */
  async enqueue(
    action: Omit<QueuedAction, 'id' | 'createdAt' | 'attempts'>
  ): Promise<QueuedAction> {
    const queuedAction: QueuedAction = {
      ...action,
      id: generateId(),
      createdAt: Date.now(),
      attempts: 0,
    };

    const queue = await this.getQueue();
    queue.push(queuedAction);
    await this.saveQueue(queue);

    return queuedAction;
  }

  /**
   * Remove and return the first action from the queue
   */
  async dequeue(): Promise<QueuedAction | null> {
    const queue = await this.getQueue();
    if (queue.length === 0) {
      return null;
    }

    const [first, ...rest] = queue;
    await this.saveQueue(rest);
    return first;
  }

  /**
   * Return the first action without removing it
   */
  async peek(): Promise<QueuedAction | null> {
    const queue = await this.getQueue();
    return queue[0] ?? null;
  }

  /**
   * Get all queued actions
   */
  async getAll(): Promise<QueuedAction[]> {
    return this.getQueue();
  }

  /**
   * Remove a specific action by ID
   */
  async remove(actionId: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter((action) => action.id !== actionId);
    await this.saveQueue(filtered);
  }

  /**
   * Clear all actions from the queue
   */
  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.storageKey);
    } catch {
      // Silently fail
    }
  }

  /**
   * Get the number of queued actions
   */
  async size(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  /**
   * Increment the attempt count for an action
   */
  async incrementAttempts(actionId: string): Promise<void> {
    const queue = await this.getQueue();
    const updated = queue.map((action) =>
      action.id === actionId
        ? { ...action, attempts: action.attempts + 1 }
        : action
    );
    await this.saveQueue(updated);
  }

  /**
   * Get actions that have exceeded the maximum attempts
   */
  async getFailedActions(maxAttempts: number): Promise<QueuedAction[]> {
    const queue = await this.getQueue();
    return queue.filter((action) => action.attempts >= maxAttempts);
  }
}

/**
 * Default offline queue service instance
 */
export const offlineQueueService = new OfflineQueueService();
