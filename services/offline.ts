/**
 * Offline detection service
 * Provides network state monitoring and offline detection
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

/**
 * Simplified network state
 */
export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
}

/**
 * Listener function for network state changes
 */
export type NetworkListener = (state: NetworkState) => void;

/**
 * Options for waitForOnline
 */
export interface WaitForOnlineOptions {
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Offline detection service
 * Monitors network connectivity and provides utilities for offline-first apps
 */
export class OfflineService {
  private unsubscribers: Array<() => void> = [];

  /**
   * Check if the device is currently online
   * Returns true only if connected AND internet is reachable
   */
  async isOnline(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      // When isInternetReachable is null (unknown), assume online if connected
      if (state.isInternetReachable === null) {
        return state.isConnected === true;
      }
      return state.isConnected === true && state.isInternetReachable === true;
    } catch {
      // If we can't determine network state, assume offline
      return false;
    }
  }

  /**
   * Get the current network state
   */
  async getNetworkState(): Promise<NetworkState> {
    try {
      const state = await NetInfo.fetch();
      return {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type,
      };
    } catch {
      return {
        isConnected: false,
        isInternetReachable: false,
        type: 'unknown',
      };
    }
  }

  /**
   * Subscribe to network state changes
   * Returns an unsubscribe function
   */
  subscribe(listener: NetworkListener): () => void {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      listener({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type,
      });
    });

    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Remove all network listeners
   */
  cleanup(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
  }

  /**
   * Wait until the device is online
   * Resolves immediately if already online, otherwise waits for connection
   */
  async waitForOnline(options?: WaitForOnlineOptions): Promise<void> {
    const isCurrentlyOnline = await this.isOnline();
    if (isCurrentlyOnline) {
      return;
    }

    return new Promise((resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
        const isOnline =
          state.isConnected === true && state.isInternetReachable === true;

        if (isOnline) {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          unsubscribe();
          resolve();
        }
      });

      if (options?.timeout) {
        timeoutId = setTimeout(() => {
          unsubscribe();
          reject(new Error('Timeout waiting for online'));
        }, options.timeout);
      }
    });
  }
}

/**
 * Default offline service instance
 */
export const offlineService = new OfflineService();
