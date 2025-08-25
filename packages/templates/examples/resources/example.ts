/**
 * Resource and Subscription Examples
 * 
 * This example demonstrates how to create dynamic MCP resources with
 * subscription support for real-time updates.
 */

import { EventEmitter } from 'events';
import type { Resource, ResourceContent } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../../templates/typescript-advanced/src/utils/logger.js';

/**
 * System metrics data structure
 */
interface SystemMetrics {
  timestamp: string;
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    total: number;
    used: number;
    available: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    available: number;
    percentage: number;
  };
  uptime: number;
}

/**
 * File change event structure
 */
interface FileChangeEvent {
  path: string;
  event: 'created' | 'modified' | 'deleted' | 'renamed';
  timestamp: string;
  size?: number;
  isDirectory: boolean;
}

/**
 * Data stream configuration
 */
interface StreamConfig {
  interval: number;
  dataType: 'random' | 'sequential' | 'sine-wave';
  maxPoints: number;
}

/**
 * System Monitor Resource
 * Provides real-time system metrics with subscription support
 */
export class SystemMonitorResource extends EventEmitter {
  private uri = 'system-monitor://metrics';
  private updateInterval: NodeJS.Timeout | null = null;
  private subscribers = new Set<string>();

  constructor(private intervalMs: number = 5000) {
    super();
    this.startMonitoring();
  }

  getResource(): Resource {
    return {
      uri: this.uri,
      name: 'System Metrics',
      description: 'Real-time system performance metrics',
      mimeType: 'application/json',
    };
  }

  async getContent(): Promise<ResourceContent> {
    const metrics = await this.gatherMetrics();
    
    return {
      contents: [{
        uri: this.uri,
        mimeType: 'application/json',
        text: JSON.stringify(metrics, null, 2),
      }],
    };
  }

  subscribe(clientId: string): void {
    this.subscribers.add(clientId);
    logger.info(`Client ${clientId} subscribed to system metrics`);
  }

  unsubscribe(clientId: string): void {
    this.subscribers.delete(clientId);
    logger.info(`Client ${clientId} unsubscribed from system metrics`);
  }

  private startMonitoring(): void {
    this.updateInterval = setInterval(async () => {
      if (this.subscribers.size > 0) {
        const metrics = await this.gatherMetrics();
        this.emit('update', {
          uri: this.uri,
          content: metrics,
          subscribers: Array.from(this.subscribers),
        });
      }
    }, this.intervalMs);
  }

  private async gatherMetrics(): Promise<SystemMetrics> {
    // Mock system metrics - in real implementation, use system APIs
    const now = new Date().toISOString();
    
    return {
      timestamp: now,
      cpu: {
        usage: Math.random() * 100,
        cores: 8,
        model: 'Intel Core i7-9750H',
      },
      memory: {
        total: 16 * 1024 * 1024 * 1024, // 16GB
        used: Math.random() * 8 * 1024 * 1024 * 1024, // Random usage up to 8GB
        available: 0, // Will be calculated
        percentage: 0, // Will be calculated
      },
      disk: {
        total: 512 * 1024 * 1024 * 1024, // 512GB
        used: Math.random() * 256 * 1024 * 1024 * 1024, // Random usage up to 256GB
        available: 0, // Will be calculated
        percentage: 0, // Will be calculated
      },
      uptime: process.uptime(),
    };
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.subscribers.clear();
    this.removeAllListeners();
  }
}

/**
 * File Watcher Resource
 * Monitors file system changes in a directory
 */
export class FileWatcherResource extends EventEmitter {
  private uri: string;
  private subscribers = new Set<string>();
  private changes: FileChangeEvent[] = [];
  private maxChanges = 100;

  constructor(private watchPath: string) {
    super();
    this.uri = `file-watcher://${encodeURIComponent(watchPath)}`;
    this.simulateFileChanges(); // Mock file changes for demo
  }

  getResource(): Resource {
    return {
      uri: this.uri,
      name: `File Watcher: ${this.watchPath}`,
      description: `Monitor file changes in ${this.watchPath}`,
      mimeType: 'application/json',
    };
  }

  async getContent(): Promise<ResourceContent> {
    return {
      contents: [{
        uri: this.uri,
        mimeType: 'application/json',
        text: JSON.stringify({
          watchPath: this.watchPath,
          recentChanges: this.changes.slice(-20), // Last 20 changes
          totalChanges: this.changes.length,
          lastUpdate: new Date().toISOString(),
        }, null, 2),
      }],
    };
  }

  subscribe(clientId: string): void {
    this.subscribers.add(clientId);
    logger.info(`Client ${clientId} subscribed to file watcher for ${this.watchPath}`);
  }

  unsubscribe(clientId: string): void {
    this.subscribers.delete(clientId);
    logger.info(`Client ${clientId} unsubscribed from file watcher`);
  }

  private simulateFileChanges(): void {
    // Simulate file changes for demonstration
    const events: FileChangeEvent['event'][] = ['created', 'modified', 'deleted'];
    const fileNames = ['document.txt', 'config.json', 'image.png', 'data.csv'];
    
    setInterval(() => {
      if (this.subscribers.size > 0) {
        const event: FileChangeEvent = {
          path: `${this.watchPath}/${fileNames[Math.floor(Math.random() * fileNames.length)]}`,
          event: events[Math.floor(Math.random() * events.length)],
          timestamp: new Date().toISOString(),
          size: Math.floor(Math.random() * 1024 * 1024), // Random size up to 1MB
          isDirectory: Math.random() < 0.2, // 20% chance of directory
        };

        this.changes.push(event);
        
        // Keep only the most recent changes
        if (this.changes.length > this.maxChanges) {
          this.changes = this.changes.slice(-this.maxChanges);
        }

        this.emit('update', {
          uri: this.uri,
          content: event,
          subscribers: Array.from(this.subscribers),
        });
      }
    }, 3000); // Every 3 seconds
  }

  destroy(): void {
    this.subscribers.clear();
    this.removeAllListeners();
  }
}

/**
 * Data Stream Resource
 * Provides configurable streaming data
 */
export class DataStreamResource extends EventEmitter {
  private uri: string;
  private subscribers = new Set<string>();
  private dataPoints: Array<{ timestamp: string; value: number }> = [];
  private streamInterval: NodeJS.Timeout | null = null;
  private sequenceCounter = 0;

  constructor(
    private streamId: string,
    private config: StreamConfig = {
      interval: 2000,
      dataType: 'random',
      maxPoints: 50,
    }
  ) {
    super();
    this.uri = `data-stream://${streamId}`;
    this.startStream();
  }

  getResource(): Resource {
    return {
      uri: this.uri,
      name: `Data Stream: ${this.streamId}`,
      description: `${this.config.dataType} data stream updating every ${this.config.interval}ms`,
      mimeType: 'application/json',
    };
  }

  async getContent(): Promise<ResourceContent> {
    return {
      contents: [{
        uri: this.uri,
        mimeType: 'application/json',
        text: JSON.stringify({
          streamId: this.streamId,
          config: this.config,
          dataPoints: this.dataPoints,
          stats: {
            totalPoints: this.dataPoints.length,
            latestValue: this.dataPoints[this.dataPoints.length - 1]?.value,
            average: this.dataPoints.length > 0 
              ? this.dataPoints.reduce((sum, point) => sum + point.value, 0) / this.dataPoints.length
              : 0,
          },
        }, null, 2),
      }],
    };
  }

  subscribe(clientId: string): void {
    this.subscribers.add(clientId);
    logger.info(`Client ${clientId} subscribed to data stream ${this.streamId}`);
  }

  unsubscribe(clientId: string): void {
    this.subscribers.delete(clientId);
    logger.info(`Client ${clientId} unsubscribed from data stream`);
  }

  updateConfig(newConfig: Partial<StreamConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart stream with new configuration
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
    }
    this.startStream();
    
    logger.info(`Data stream ${this.streamId} configuration updated`, this.config);
  }

  private startStream(): void {
    this.streamInterval = setInterval(() => {
      if (this.subscribers.size > 0) {
        const value = this.generateValue();
        const dataPoint = {
          timestamp: new Date().toISOString(),
          value,
        };

        this.dataPoints.push(dataPoint);
        
        // Keep only the most recent points
        if (this.dataPoints.length > this.config.maxPoints) {
          this.dataPoints = this.dataPoints.slice(-this.config.maxPoints);
        }

        this.emit('update', {
          uri: this.uri,
          content: dataPoint,
          subscribers: Array.from(this.subscribers),
        });
      }
    }, this.config.interval);
  }

  private generateValue(): number {
    switch (this.config.dataType) {
      case 'random':
        return Math.random() * 100;
        
      case 'sequential':
        return this.sequenceCounter++;
        
      case 'sine-wave':
        const time = Date.now() / 1000; // Convert to seconds
        return 50 + 30 * Math.sin(time / 10); // Sine wave with amplitude 30, offset 50
        
      default:
        return 0;
    }
  }

  destroy(): void {
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
      this.streamInterval = null;
    }
    this.subscribers.clear();
    this.removeAllListeners();
  }
}

/**
 * Resource Manager
 * Manages multiple resources and their subscriptions
 */
export class ResourceManager extends EventEmitter {
  private resources = new Map<string, SystemMonitorResource | FileWatcherResource | DataStreamResource>();
  private subscriptions = new Map<string, Set<string>>(); // URI -> Set of client IDs

  constructor() {
    super();
    this.setupDefaultResources();
  }

  private setupDefaultResources(): void {
    // Add system monitor
    const systemMonitor = new SystemMonitorResource();
    this.addResource(systemMonitor);

    // Add file watcher for current directory
    const fileWatcher = new FileWatcherResource(process.cwd());
    this.addResource(fileWatcher);

    // Add data streams
    const randomStream = new DataStreamResource('random-data', {
      interval: 2000,
      dataType: 'random',
      maxPoints: 50,
    });
    this.addResource(randomStream);

    const sineWaveStream = new DataStreamResource('sine-wave', {
      interval: 1000,
      dataType: 'sine-wave',
      maxPoints: 100,
    });
    this.addResource(sineWaveStream);
  }

  private addResource(resource: SystemMonitorResource | FileWatcherResource | DataStreamResource): void {
    const uri = resource.getResource().uri;
    this.resources.set(uri, resource);
    this.subscriptions.set(uri, new Set());

    // Listen for resource updates
    resource.on('update', (updateData) => {
      this.emit('resourceUpdate', {
        uri: updateData.uri,
        content: updateData.content,
        subscribers: Array.from(this.subscriptions.get(updateData.uri) || []),
      });
    });

    logger.info(`Added resource: ${uri}`);
  }

  getResources(): Resource[] {
    return Array.from(this.resources.values()).map(resource => resource.getResource());
  }

  async getResourceContent(uri: string): Promise<ResourceContent> {
    const resource = this.resources.get(uri);
    if (!resource) {
      throw new Error(`Resource not found: ${uri}`);
    }

    return resource.getContent();
  }

  subscribe(uri: string, clientId: string): void {
    const resource = this.resources.get(uri);
    if (!resource) {
      throw new Error(`Resource not found: ${uri}`);
    }

    const subscribers = this.subscriptions.get(uri) || new Set();
    subscribers.add(clientId);
    this.subscriptions.set(uri, subscribers);

    resource.subscribe(clientId);
    
    logger.info(`Subscribed client ${clientId} to resource ${uri}`);
  }

  unsubscribe(uri: string, clientId: string): void {
    const resource = this.resources.get(uri);
    if (!resource) {
      throw new Error(`Resource not found: ${uri}`);
    }

    const subscribers = this.subscriptions.get(uri);
    if (subscribers) {
      subscribers.delete(clientId);
    }

    resource.unsubscribe(clientId);
    
    logger.info(`Unsubscribed client ${clientId} from resource ${uri}`);
  }

  getSubscriptionStats(): {
    totalResources: number;
    totalSubscriptions: number;
    resourceStats: Array<{ uri: string; subscribers: number }>;
  } {
    const resourceStats = Array.from(this.subscriptions.entries()).map(([uri, subscribers]) => ({
      uri,
      subscribers: subscribers.size,
    }));

    const totalSubscriptions = resourceStats.reduce((total, stat) => total + stat.subscribers, 0);

    return {
      totalResources: this.resources.size,
      totalSubscriptions,
      resourceStats,
    };
  }

  destroy(): void {
    // Clean up all resources
    for (const resource of this.resources.values()) {
      resource.destroy();
    }
    this.resources.clear();
    this.subscriptions.clear();
    this.removeAllListeners();
  }
}

/**
 * Example usage demonstration
 */
export async function demonstrateResources(): Promise<void> {
  console.log('📦 Resource Examples Demonstration\n');

  const resourceManager = new ResourceManager();

  try {
    // List all resources
    const resources = resourceManager.getResources();
    console.log(`Available Resources: ${resources.length}`);
    resources.forEach(resource => {
      console.log(`  - ${resource.name} (${resource.uri})`);
    });
    console.log();

    // Subscribe to system monitor
    const systemMonitorUri = 'system-monitor://metrics';
    resourceManager.subscribe(systemMonitorUri, 'demo-client');

    // Get resource content
    const content = await resourceManager.getResourceContent(systemMonitorUri);
    const data = JSON.parse(content.contents[0].text!);
    console.log(`System Metrics Sample:`);
    console.log(`  CPU Usage: ${data.cpu.usage.toFixed(1)}%`);
    console.log(`  Memory Usage: ${(data.memory.used / (1024 * 1024 * 1024)).toFixed(1)}GB`);
    console.log(`  Uptime: ${data.uptime.toFixed(0)} seconds\n`);

    // Demonstrate subscription updates
    console.log('Listening for resource updates...');
    let updateCount = 0;
    
    resourceManager.on('resourceUpdate', (update) => {
      updateCount++;
      console.log(`Update #${updateCount} for ${update.uri}`);
      
      if (updateCount >= 3) {
        console.log('Received 3 updates, stopping demonstration.\n');
        
        // Show subscription stats
        const stats = resourceManager.getSubscriptionStats();
        console.log('Subscription Statistics:');
        console.log(`  Total Resources: ${stats.totalResources}`);
        console.log(`  Active Subscriptions: ${stats.totalSubscriptions}`);
        stats.resourceStats.forEach(stat => {
          if (stat.subscribers > 0) {
            console.log(`    ${stat.uri}: ${stat.subscribers} subscribers`);
          }
        });
        
        // Clean up
        resourceManager.destroy();
      }
    });

    // Let updates run for a few seconds
    await new Promise(resolve => setTimeout(resolve, 8000));

  } catch (error) {
    console.error('❌ Demonstration failed:', error);
    resourceManager.destroy();
  }
}

// Global resource manager instance
export const resourceManager = new ResourceManager();

// Run demonstration if this file is executed directly
if (import.meta.url === new URL(import.meta.resolve('./example.ts')).href) {
  demonstrateResources().catch(console.error);
}