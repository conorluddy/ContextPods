import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP server that reads and formats system datetime
 */
const server = new Server(
  {
    name: 'system-datetime-reader',
    version: '0.1.0',
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
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get-current-datetime',
        description: 'Get the current system date and time in various formats',
        inputSchema: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              description: 'Output format: iso, unix, locale, or custom format string',
              enum: ['iso', 'unix', 'locale', 'custom'],
            },
            customFormat: {
              type: 'string',
              description: 'Custom format string (only used when format is "custom")',
            },
            timezone: {
              type: 'string',
              description: 'Timezone (e.g., "America/New_York", "UTC", "Europe/London")',
            },
          },
          required: ['format'],
        },
      },
      {
        name: 'get-timezone-info',
        description: 'Get information about the system timezone',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'get-current-datetime') {
    const { format, customFormat, timezone } = request.params.arguments as {
      format: 'iso' | 'unix' | 'locale' | 'custom';
      customFormat?: string;
      timezone?: string;
    };

    const now = new Date();
    let result: string;

    switch (format) {
      case 'iso':
        result = now.toISOString();
        break;
      case 'unix':
        result = Math.floor(now.getTime() / 1000).toString();
        break;
      case 'locale':
        result = timezone 
          ? now.toLocaleString('en-US', { timeZone: timezone })
          : now.toLocaleString();
        break;
      case 'custom':
        if (!customFormat) {
          throw new Error('customFormat is required when format is "custom"');
        }
        // Basic custom format implementation
        result = customFormat
          .replace('YYYY', now.getFullYear().toString())
          .replace('MM', (now.getMonth() + 1).toString().padStart(2, '0'))
          .replace('DD', now.getDate().toString().padStart(2, '0'))
          .replace('HH', now.getHours().toString().padStart(2, '0'))
          .replace('mm', now.getMinutes().toString().padStart(2, '0'))
          .replace('ss', now.getSeconds().toString().padStart(2, '0'));
        break;
      default:
        throw new Error(`Unknown format: ${format}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  if (request.params.name === 'get-timezone-info') {
    const offset = new Date().getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offset) / 60);
    const offsetMinutes = Math.abs(offset) % 60;
    const offsetSign = offset <= 0 ? '+' : '-';
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            timezoneOffset: offset,
            offsetString: `UTC${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`,
            systemTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }, null, 2),
        },
      ],
    };
  }
  
  throw new Error(`Unknown tool: ${request.params.name}`);
});

/**
 * List available resources
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'datetime://current',
        name: 'Current DateTime',
        description: 'The current system date and time',
        mimeType: 'application/json',
      },
      {
        uri: 'datetime://formats',
        name: 'Available Formats',
        description: 'List of available datetime formats',
        mimeType: 'application/json',
      },
    ],
  };
});

/**
 * Read resource content
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri === 'datetime://current') {
    const now = new Date();
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            iso: now.toISOString(),
            unix: Math.floor(now.getTime() / 1000),
            locale: now.toLocaleString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            components: {
              year: now.getFullYear(),
              month: now.getMonth() + 1,
              day: now.getDate(),
              hours: now.getHours(),
              minutes: now.getMinutes(),
              seconds: now.getSeconds(),
              milliseconds: now.getMilliseconds(),
            },
          }, null, 2),
        },
      ],
    };
  }

  if (request.params.uri === 'datetime://formats') {
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            formats: [
              {
                name: 'iso',
                description: 'ISO 8601 format (e.g., 2024-01-30T12:34:56.789Z)',
                example: new Date().toISOString(),
              },
              {
                name: 'unix',
                description: 'Unix timestamp in seconds',
                example: Math.floor(Date.now() / 1000),
              },
              {
                name: 'locale',
                description: 'Localized datetime string',
                example: new Date().toLocaleString(),
              },
              {
                name: 'custom',
                description: 'Custom format using pattern (YYYY, MM, DD, HH, mm, ss)',
                example: 'YYYY-MM-DD HH:mm:ss',
              },
            ],
          }, null, 2),
        },
      ],
    };
  }
  
  throw new Error(`Unknown resource: ${request.params.uri}`);
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('system-datetime-reader MCP server started');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});