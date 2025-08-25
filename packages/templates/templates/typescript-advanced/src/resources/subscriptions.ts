/**
 * Resource subscription management for {{serverName}}
 * Implements MCP resource subscription pattern with change notifications
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  ResourceListChangedNotificationSchema,
  ResourceUpdatedNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { logger } from '../utils/logger.js';

/**
 * Subscription tracking
 */
interface Subscription {
  uri: string;
  clientId: string;
  subscribedAt: Date;
}

/**
 * Resource state tracking for change detection
 */
interface ResourceState {
  uri: string;
  version: number;
  lastModified: Date;
  content: unknown;
}

/**
 * Subscription manager class
 */
export class SubscriptionManager {
  private subscriptions: Map<string, Set<string>> = new Map(); // uri -> Set<clientId>
  private resourceStates: Map<string, ResourceState> = new Map();
  private server: Server | null = null;

  /**
   * Initialize the subscription manager with a server instance
   */
  initialize(server: Server): void {
    this.server = server;
    this.registerHandlers(server);
    logger.info('Resource subscription manager initialized');
  }

  /**
   * Register subscription-related request handlers
   */
  private registerHandlers(server: Server): void {
    // Handle subscription requests
    server.setRequestHandler(SubscribeRequestSchema, async (request) => {
      const { uri } = request.params;
      const clientId = request.meta?.clientId || 'default';

      this.subscribe(uri, clientId);

      return {
        meta: {
          subscriptionId: `${clientId}:${uri}`,
        },
      };
    });

    // Handle unsubscription requests
    server.setRequestHandler(UnsubscribeRequestSchema, async (request) => {
      const { uri } = request.params;
      const clientId = request.meta?.clientId || 'default';

      this.unsubscribe(uri, clientId);

      return {};
    });
  }

  /**
   * Subscribe a client to a resource
   */
  subscribe(uri: string, clientId: string): void {
    if (!this.subscriptions.has(uri)) {
      this.subscriptions.set(uri, new Set());
    }

    this.subscriptions.get(uri)!.add(clientId);
    logger.info(`Client ${clientId} subscribed to resource ${uri}`);

    // Initialize resource state if not exists
    if (!this.resourceStates.has(uri)) {
      this.resourceStates.set(uri, {
        uri,
        version: 1,
        lastModified: new Date(),
        content: null,
      });
    }
  }

  /**
   * Unsubscribe a client from a resource
   */
  unsubscribe(uri: string, clientId: string): void {
    const subscribers = this.subscriptions.get(uri);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.subscriptions.delete(uri);
      }
      logger.info(`Client ${clientId} unsubscribed from resource ${uri}`);
    }
  }

  /**
   * Check if a resource has subscribers
   */
  hasSubscribers(uri: string): boolean {
    return this.subscriptions.has(uri) && this.subscriptions.get(uri)!.size > 0;
  }

  /**
   * Get all subscribers for a resource
   */
  getSubscribers(uri: string): string[] {
    const subscribers = this.subscriptions.get(uri);
    return subscribers ? Array.from(subscribers) : [];
  }

  /**
   * Notify subscribers of a resource update
   */
  async notifyResourceUpdate(uri: string, newContent: unknown): Promise<void> {
    if (!this.server) {
      logger.warn('Server not initialized, cannot send notifications');
      return;
    }

    const state = this.resourceStates.get(uri);
    if (!state) {
      logger.warn(`No state tracked for resource ${uri}`);
      return;
    }

    // Update resource state
    state.version++;
    state.lastModified = new Date();
    state.content = newContent;

    // Notify all subscribers
    const subscribers = this.getSubscribers(uri);
    if (subscribers.length === 0) {
      return;
    }

    logger.info(`Notifying ${subscribers.length} subscribers of update to ${uri}`);

    // Send resource update notification
    await this.server.notification({
      method: 'notifications/resources/updated',
      params: {
        uri,
        meta: {
          version: state.version,
          lastModified: state.lastModified.toISOString(),
        },
      },
    });
  }

  /**
   * Notify subscribers when the list of available resources changes
   */
  async notifyResourceListChanged(): Promise<void> {
    if (!this.server) {
      logger.warn('Server not initialized, cannot send notifications');
      return;
    }

    logger.info('Notifying clients of resource list change');

    // Send resource list changed notification
    await this.server.notification({
      method: 'notifications/resources/list_changed',
      params: {},
    });
  }

  /**
   * Get subscription statistics
   */
  getStats(): {
    totalSubscriptions: number;
    uniqueResources: number;
    uniqueClients: number;
  } {
    let totalSubscriptions = 0;
    const uniqueClients = new Set<string>();

    for (const subscribers of this.subscriptions.values()) {
      totalSubscriptions += subscribers.size;
      subscribers.forEach((clientId) => uniqueClients.add(clientId));
    }

    return {
      totalSubscriptions,
      uniqueResources: this.subscriptions.size,
      uniqueClients: uniqueClients.size,
    };
  }

  /**
   * Clear all subscriptions (useful for cleanup)
   */
  clearAll(): void {
    this.subscriptions.clear();
    this.resourceStates.clear();
    logger.info('All subscriptions cleared');
  }
}

// Global subscription manager instance
export const subscriptionManager = new SubscriptionManager();

/**
 * Example usage in a resource that supports subscriptions
 */
export function createSubscribableResource(uri: string, initialContent: unknown) {
  return {
    uri,
    content: initialContent,

    /**
     * Update the resource and notify subscribers
     */
    async update(newContent: unknown): Promise<void> {
      // Update the actual resource content (implementation-specific)
      this.content = newContent;

      // Notify subscribers of the change
      await subscriptionManager.notifyResourceUpdate(uri, newContent);
    },

    /**
     * Check if this resource has active subscribers
     */
    hasSubscribers(): boolean {
      return subscriptionManager.hasSubscribers(uri);
    },
  };
}
