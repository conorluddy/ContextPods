/**
 * Context-Pods Core MCP Server
 * 
 * This server manages other MCP servers in the Context-Pods toolkit.
 * It provides tools for creating, managing, and distributing MCP servers.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from '@context-pods/core';
import { CONFIG } from './config/index.js';
import {
  CreateMCPTool,
  WrapScriptTool,
  ListMCPsTool,
  ValidateMCPTool,
} from './tools/index.js';
import { getRegistryOperations } from './registry/index.js';

/**
 * Initialize tool instances
 */
const createMCPTool = new CreateMCPTool();
const wrapScriptTool = new WrapScriptTool();
const listMCPsTool = new ListMCPsTool();
const validateMCPTool = new ValidateMCPTool();

/**
 * Create MCP server instance
 */
const server = new Server(
  {
    name: CONFIG.server.name,
    version: CONFIG.server.version,
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, () => {
  return {
    tools: [
      {
        name: 'create-mcp',
        description: 'Generate new MCP server from template with intelligent template selection',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the MCP server to create (alphanumeric, hyphens, underscores)',
              pattern: '^[a-zA-Z][a-zA-Z0-9_-]*$',
            },
            template: {
              type: 'string',
              description: 'Specific template to use (optional - will auto-select if not provided)',
            },
            outputPath: {
              type: 'string',
              description: 'Output directory for the generated MCP server (optional)',
            },
            description: {
              type: 'string',
              description: 'Description of the MCP server (optional)',
            },
            language: {
              type: 'string',
              description: 'Preferred language (typescript, javascript, python, rust, shell)',
              enum: ['typescript', 'javascript', 'python', 'rust', 'shell'],
            },
            variables: {
              type: 'object',
              description: 'Template variables for customization (optional)',
              additionalProperties: true,
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'wrap-script',
        description: 'Convert existing script to MCP server with automatic language detection',
        inputSchema: {
          type: 'object',
          properties: {
            scriptPath: {
              type: 'string',
              description: 'Path to the script file to wrap',
            },
            name: {
              type: 'string',
              description: 'Name for the generated MCP server',
              pattern: '^[a-zA-Z][a-zA-Z0-9_-]*$',
            },
            template: {
              type: 'string',
              description: 'Specific template to use (optional - will auto-detect if not provided)',
            },
            outputPath: {
              type: 'string',
              description: 'Output directory for the generated server (optional)',
            },
            description: {
              type: 'string',
              description: 'Description of the wrapped server (optional)',
            },
            variables: {
              type: 'object',
              description: 'Additional template variables (optional)',
              additionalProperties: true,
            },
          },
          required: ['scriptPath', 'name'],
        },
      },
      {
        name: 'list-mcps',
        description: 'Show all managed MCP servers with filtering and formatting options',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Legacy filter parameter (use specific filters instead)',
            },
            status: {
              type: 'string',
              description: 'Filter by server status',
              enum: ['created', 'building', 'ready', 'error', 'archived'],
            },
            template: {
              type: 'string',
              description: 'Filter by template name',
            },
            language: {
              type: 'string',
              description: 'Filter by programming language',
            },
            search: {
              type: 'string',
              description: 'Search in server names and descriptions',
            },
            format: {
              type: 'string',
              description: 'Output format',
              enum: ['table', 'json', 'summary'],
              default: 'table',
            },
          },
        },
      },
      {
        name: 'validate-mcp',
        description: 'Validate MCP server against official schema and best practices',
        inputSchema: {
          type: 'object',
          properties: {
            mcpPath: {
              type: 'string',
              description: 'Path to the MCP server directory to validate',
            },
            checkRegistry: {
              type: 'boolean',
              description: 'Check registry status (default: true)',
              default: true,
            },
            checkSchema: {
              type: 'boolean',
              description: 'Check MCP protocol compliance (default: true)',
              default: true,
            },
            checkBuild: {
              type: 'boolean',
              description: 'Validate build process (default: false)',
              default: false,
            },
          },
          required: ['mcpPath'],
        },
      },
    ],
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'create-mcp':
        return await createMCPTool.safeExecute(args);

      case 'wrap-script':
        return await wrapScriptTool.safeExecute(args);

      case 'list-mcps':
        return await listMCPsTool.safeExecute(args);

      case 'validate-mcp':
        return await validateMCPTool.safeExecute(args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    logger.error(`Tool execution error: ${name}`, error);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Internal error executing ${name}: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
});

/**
 * List available resources
 */
server.setRequestHandler(ListResourcesRequestSchema, () => {
  return {
    resources: [
      {
        uri: 'context-pods://mcps/',
        name: 'Managed MCP Servers',
        description: 'List of all managed MCP servers with metadata',
        mimeType: 'application/json',
      },
      {
        uri: 'context-pods://templates/',
        name: 'Available Templates',
        description: 'List of available MCP server templates',
        mimeType: 'application/json',
      },
      {
        uri: 'context-pods://status',
        name: 'System Status',
        description: 'Context-Pods system status and configuration',
        mimeType: 'application/json',
      },
      {
        uri: 'context-pods://statistics',
        name: 'Server Statistics',
        description: 'Statistics about managed MCP servers',
        mimeType: 'application/json',
      },
    ],
  };
});

/**
 * Read resource content
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    switch (uri) {
      case 'context-pods://mcps/':
        return await handleMCPsResource();

      case 'context-pods://templates/':
        return await handleTemplatesResource();

      case 'context-pods://status':
        return await handleStatusResource();

      case 'context-pods://statistics':
        return await handleStatisticsResource();

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  } catch (error) {
    logger.error(`Resource error: ${uri}`, error);
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            error: `Failed to load resource: ${error instanceof Error ? error.message : String(error)}`,
          }, null, 2),
        },
      ],
    };
  }
});

/**
 * Handle MCPs resource
 */
async function handleMCPsResource(): Promise<object> {
  const registry = await getRegistryOperations();
  const servers = await registry.listServers();

  return {
    contents: [
      {
        uri: 'context-pods://mcps/',
        mimeType: 'application/json',
        text: JSON.stringify({
          servers: servers.map(server => ({
            id: server.id,
            name: server.name,
            status: server.status,
            template: server.template,
            path: server.path,
            language: server.metadata.language,
            description: server.metadata.description,
            tags: server.metadata.tags,
            turboOptimized: server.metadata.turboOptimized,
            buildCommand: server.metadata.buildCommand,
            devCommand: server.metadata.devCommand,
            lastBuildStatus: server.metadata.lastBuildStatus,
            lastBuildTime: server.metadata.lastBuildTime,
            createdAt: server.createdAt,
            updatedAt: server.updatedAt,
          })),
          count: servers.length,
          lastUpdated: Date.now(),
        }, null, 2),
      },
    ],
  };
}

/**
 * Handle templates resource
 */
async function handleTemplatesResource(): Promise<object> {
  const { TemplateSelector } = await import('@context-pods/core');
  const selector = new TemplateSelector(CONFIG.templatesPath);
  const templates = await selector.getAvailableTemplates();

  return {
    contents: [
      {
        uri: 'context-pods://templates/',
        mimeType: 'application/json',
        text: JSON.stringify({
          templates: templates.map(t => ({
            name: t.template.name,
            language: t.template.language,
            description: t.template.description,
            tags: t.template.tags,
            optimization: t.template.optimization,
            variables: Object.keys(t.template.variables || {}),
            path: t.templatePath,
          })),
          count: templates.length,
          templatesPath: CONFIG.templatesPath,
          lastUpdated: Date.now(),
        }, null, 2),
      },
    ],
  };
}

/**
 * Handle status resource
 */
async function handleStatusResource(): Promise<object> {
  const registry = await getRegistryOperations();
  const stats = await registry.getStatistics();

  return {
    contents: [
      {
        uri: 'context-pods://status',
        mimeType: 'application/json',
        text: JSON.stringify({
          version: CONFIG.server.version,
          name: CONFIG.server.name,
          status: 'ready',
          configuration: {
            templatesPath: CONFIG.templatesPath,
            registryPath: CONFIG.registryPath,
            outputMode: CONFIG.outputMode,
            generatedPackagesPath: CONFIG.generatedPackagesPath,
          },
          capabilities: {
            turboRepo: true,
            templateSelection: true,
            languageDetection: true,
            scriptWrapping: true,
            serverValidation: true,
          },
          supportedLanguages: ['typescript', 'javascript', 'python', 'rust', 'shell'],
          serverCounts: stats.byStatus,
          uptime: process.uptime(),
          lastUpdated: Date.now(),
        }, null, 2),
      },
    ],
  };
}

/**
 * Handle statistics resource
 */
async function handleStatisticsResource(): Promise<object> {
  const registry = await getRegistryOperations();
  const stats = await registry.getStatistics();

  return {
    contents: [
      {
        uri: 'context-pods://statistics',
        mimeType: 'application/json',
        text: JSON.stringify({
          ...stats,
          lastUpdated: Date.now(),
        }, null, 2),
      },
    ],
  };
}

/**
 * Start the server
 */
async function main(): Promise<void> {
  try {
    // Initialize registry
    logger.info('Initializing Context-Pods registry...');
    await getRegistryOperations();

    // Start server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    logger.info('Context-Pods MCP server started successfully', {
      version: CONFIG.server.version,
      templatesPath: CONFIG.templatesPath,
      registryPath: CONFIG.registryPath,
      outputMode: CONFIG.outputMode,
    });

  } catch (error) {
    logger.error('Failed to start Context-Pods server:', error);
    process.exit(1);
  }
}

/**
 * Handle graceful shutdown
 */
process.on('SIGINT', () => {
  logger.info('Shutting down Context-Pods server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down Context-Pods server...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  logger.error('Server startup error:', error);
  process.exit(1);
});