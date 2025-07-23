#!/usr/bin/env node

/**
 * {{serverDescription}}
 *
 * Advanced TypeScript MCP server with Context-Pods utilities
 */

import { createServer } from './server.js';
import { logger } from '@context-pods/core';

/**
 * Main entry point for the {{serverName}} MCP server
 */
async function main(): Promise<void> {
  try {
    logger.info('Starting {{serverName}} MCP server...');

    await createServer();

    // Server is now running and connected to stdio
    logger.info('{{serverName}} MCP server started successfully');

    // Keep the process alive
    process.stdin.resume();
  } catch (error) {
    logger.error('Failed to start {{serverName}} MCP server:', error);
    process.exit(1);
  }
}
/**
 * Handle process signals gracefully
 */
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});
