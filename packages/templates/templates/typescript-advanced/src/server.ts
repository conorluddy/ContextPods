/**
 * MCP Server implementation for {{serverName}}
 * 
 * This file provides the main server configuration and initialization for the
 * {{serverName}} MCP server. It combines all advanced features including tools,
 * resources, prompts, sampling, roots, and completion capabilities.
 * 
 * @fileoverview Main server configuration and initialization
 * @version 1.0.0
 * @author MCP Template System
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools/index.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';
import { progressTracker } from './notifications/progress.js';
import { registerSampling } from './sampling/index.js';
import { registerRoots } from './roots/index.js';
import { registerCompletion } from './completion/index.js';

/**
 * Creates and configures the MCP server with all available capabilities.
 * 
 * This function initializes a complete MCP server instance with:
 * - Tool registration and execution capabilities
 * - Resource management with subscription support
 * - Prompt templates for LLM interactions
 * - Sampling/LLM integration capabilities
 * - Root listing for secure file system access
 * - Completion providers for auto-complete functionality
 * - Progress tracking for long-running operations
 * 
 * The server is configured with comprehensive capabilities to provide
 * a full-featured MCP implementation that can be used with any MCP-compatible
 * client application.
 * 
 * @returns {Promise<Server>} A fully configured and connected MCP server instance
 * @throws {Error} If server initialization or transport connection fails
 * 
 * @example
 * ```typescript
 * import { createServer } from './server.js';
 * 
 * async function main() {
 *   try {
 *     const server = await createServer();
 *     console.log('MCP server started successfully');
 *   } catch (error) {
 *     console.error('Failed to start server:', error);
 *   }
 * }
 * ```
 */
export async function createServer(): Promise<Server> {
  // Create server instance with metadata and capabilities
  const server = new Server(
    {
      // Server metadata
      name: '{{serverName}}',
      version: '0.1.0',
    },
    {
      // MCP capabilities configuration
      capabilities: {
        /**
         * Tools capability - Allows server to expose executable tools
         * that clients can call with arguments
         */
        tools: {},
        
        /**
         * Resources capability - Enables resource exposure with real-time
         * subscription support for dynamic content
         */
        resources: {
          subscribe: true,      // Enable resource subscriptions
          listChanged: true,    // Notify when resource list changes
        },
        
        /**
         * Prompts capability - Provides reusable prompt templates
         * with dynamic argument support
         */
        prompts: {
          listChanged: true,    // Notify when prompt list changes
        },
        
        /**
         * Sampling capability - Enables LLM integration for AI-powered
         * features and content generation
         */
        sampling: {},
        
        /**
         * Roots capability - Provides secure file system navigation
         * with sandboxed access patterns
         */
        roots: {
          listChanged: true,    // Notify when root list changes
        },
        
        /**
         * Completion capability - Offers auto-complete functionality
         * for various programming languages and contexts
         */
        completion: {
          argumentHints: true,  // Provide argument completion hints
        },
      },
    },
  );

  // Initialize all feature modules
  // Order matters for some dependencies (e.g., progress tracker before others)

  /**
   * Register core tools for basic functionality
   * Includes data processing, file operations, and utility tools
   */
  await registerTools(server);

  /**
   * Register resources with subscription management
   * Enables real-time data streams and dynamic content
   */
  await registerResources(server);

  /**
   * Register prompt templates for common use cases
   * Provides pre-configured prompts for various scenarios
   */
  await registerPrompts(server);

  // Register advanced MCP features

  /**
   * Register sampling/LLM integration capabilities
   * Enables AI-powered content analysis and generation
   */
  await registerSampling(server);

  /**
   * Register root listing for secure file system access
   * Provides sandboxed navigation of directory structures
   */
  await registerRoots(server);

  /**
   * Register completion providers for auto-complete functionality
   * Supports multiple languages and intelligent suggestions
   */
  await registerCompletion(server);

  /**
   * Initialize progress tracking system
   * Enables real-time progress updates for long-running operations
   */
  progressTracker.initialize(server);

  /**
   * Connect to stdio transport for MCP client communication
   * This establishes the communication channel between server and client
   */
  const transport = new StdioServerTransport();
  await server.connect(transport);

  return server;
}
